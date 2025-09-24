const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '../database/angio-lab.db');
        this.db = null;
    }

    async initialize() {
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            await fs.mkdir(dbDir, { recursive: true });

            // Connect to database
            this.db = new sqlite3.Database(this.dbPath);

            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');

            // Create tables
            await this.createTables();
            await this.createDefaultUsers();

            console.log('Database initialized successfully');
        } catch (error) {
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    async createTables() {
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin', 'technician', 'physician')) NOT NULL,
                active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                last_login TEXT
            )`,

            // Patients table
            `CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                date_of_birth TEXT NOT NULL,
                gender TEXT CHECK(gender IN ('M', 'F', 'Other')) NOT NULL,
                created_by INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )`,

            // Studies table
            `CREATE TABLE IF NOT EXISTS studies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )`,

            // Procedures table
            `CREATE TABLE IF NOT EXISTS procedures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                study_id INTEGER,
                study_name TEXT NOT NULL,
                procedure_date TEXT NOT NULL,
                performed_by INTEGER NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients (id),
                FOREIGN KEY (study_id) REFERENCES studies (id),
                FOREIGN KEY (performed_by) REFERENCES users (id)
            )`,

            // Vessel measurements table
            `CREATE TABLE IF NOT EXISTS vessel_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                procedure_id INTEGER NOT NULL,
                vessel_name TEXT NOT NULL,
                stenosis_percentage REAL NOT NULL CHECK(stenosis_percentage >= 0 AND stenosis_percentage <= 100),
                measurement_method TEXT,
                notes TEXT,
                FOREIGN KEY (procedure_id) REFERENCES procedures (id) ON DELETE CASCADE
            )`,

            // Audit log table
            `CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                table_name TEXT NOT NULL,
                record_id INTEGER,
                old_values TEXT,
                new_values TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id)',
            'CREATE INDEX IF NOT EXISTS idx_procedures_patient_id ON procedures(patient_id)',
            'CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures(procedure_date)',
            'CREATE INDEX IF NOT EXISTS idx_vessel_measurements_procedure ON vessel_measurements(procedure_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)'
        ];

        for (const index of indexes) {
            await this.run(index);
        }
    }

    async createDefaultUsers() {
        const bcrypt = require('bcryptjs');
        const defaultUsers = [
            {
                email: 'admin@lab.com',
                password: await bcrypt.hash('admin123', 12),
                name: 'System Administrator',
                role: 'admin'
            },
            {
                email: 'tech@lab.com',
                password: await bcrypt.hash('tech123', 12),
                name: 'Lab Technician',
                role: 'technician'
            }
        ];

        for (const user of defaultUsers) {
            try {
                await this.createUser(user);
            } catch (error) {
                // User already exists, skip
                if (!error.message.includes('UNIQUE')) {
                    throw error;
                }
            }
        }

        // Create default study
        try {
            await this.run(
                'INSERT OR IGNORE INTO studies (name, description, created_at) VALUES (?, ?, ?)',
                ['VIKING', 'Default angiography study', new Date().toISOString()]
            );
        } catch (error) {
            // Study already exists, skip
        }
    }

    // User methods
    async createUser(userData) {
        const { email, password, name, role } = userData;
        const createdAt = new Date().toISOString();

        const result = await this.run(
            'INSERT INTO users (email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?)',
            [email, password, name, role, createdAt]
        );

        return this.getUserById(result.lastID);
    }

    async getUserByEmail(email) {
        return this.get('SELECT * FROM users WHERE email = ? AND active = 1', [email]);
    }

    async getUserById(id) {
        return this.get('SELECT id, email, name, role, created_at, last_login FROM users WHERE id = ? AND active = 1', [id]);
    }

    async updateLastLogin(userId) {
        await this.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), userId]);
    }

    // Patient methods
    async getPatients(limit = 100, offset = 0) {
        return this.all(`
            SELECT p.*, u.name as created_by_name,
                   COUNT(pr.id) as procedure_count
            FROM patients p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN procedures pr ON p.id = pr.patient_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    }

    async getPatientById(id) {
        return this.get('SELECT * FROM patients WHERE id = ?', [id]);
    }

    async getPatientByPatientId(patientId) {
        return this.get('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    }

    async createPatient(patientData) {
        const { patientId, name, dateOfBirth, gender, createdBy, createdAt } = patientData;
        const updatedAt = createdAt;

        const result = await this.run(
            'INSERT INTO patients (patient_id, name, date_of_birth, gender, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [patientId, name, dateOfBirth, gender, createdBy, createdAt, updatedAt]
        );

        return this.getPatientById(result.lastID);
    }

    // Procedure methods
    async getProcedures(patientId) {
        const patient = await this.getPatientByPatientId(patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        return this.all(`
            SELECT pr.*, u.name as performed_by_name,
                   json_group_array(
                       json_object(
                           'id', vm.id,
                           'vessel_name', vm.vessel_name,
                           'stenosis_percentage', vm.stenosis_percentage,
                           'measurement_method', vm.measurement_method,
                           'notes', vm.notes
                       )
                   ) as vessel_data
            FROM procedures pr
            LEFT JOIN users u ON pr.performed_by = u.id
            LEFT JOIN vessel_measurements vm ON pr.id = vm.procedure_id
            WHERE pr.patient_id = ?
            GROUP BY pr.id
            ORDER BY pr.procedure_date DESC
        `, [patient.id]);
    }

    async createProcedure(procedureData) {
        const { patientId, studyName, procedureDate, vesselData, performedBy, createdAt, notes } = procedureData;

        const patient = await this.getPatientByPatientId(patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        // Get or create study
        let study = await this.get('SELECT * FROM studies WHERE name = ?', [studyName]);
        if (!study) {
            const studyResult = await this.run(
                'INSERT INTO studies (name, created_at) VALUES (?, ?)',
                [studyName, createdAt]
            );
            study = await this.get('SELECT * FROM studies WHERE id = ?', [studyResult.lastID]);
        }

        // Create procedure
        const procedureResult = await this.run(
            'INSERT INTO procedures (patient_id, study_id, study_name, procedure_date, performed_by, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [patient.id, study.id, studyName, procedureDate, performedBy, notes, createdAt]
        );

        const procedureId = procedureResult.lastID;

        // Add vessel measurements
        for (const vessel of vesselData) {
            await this.run(
                'INSERT INTO vessel_measurements (procedure_id, vessel_name, stenosis_percentage, measurement_method, notes) VALUES (?, ?, ?, ?, ?)',
                [procedureId, vessel.vessel, vessel.stenosisPercentage, vessel.measurementMethod || null, vessel.notes || null]
            );
        }

        // Return the complete procedure with vessel data
        return this.get(`
            SELECT pr.*, u.name as performed_by_name,
                   json_group_array(
                       json_object(
                           'id', vm.id,
                           'vessel_name', vm.vessel_name,
                           'stenosis_percentage', vm.stenosis_percentage,
                           'measurement_method', vm.measurement_method,
                           'notes', vm.notes
                       )
                   ) as vessel_data
            FROM procedures pr
            LEFT JOIN users u ON pr.performed_by = u.id
            LEFT JOIN vessel_measurements vm ON pr.id = vm.procedure_id
            WHERE pr.id = ?
            GROUP BY pr.id
        `, [procedureId]);
    }

    // Export methods
    async getFullExport() {
        const patients = await this.all(`
            SELECT p.*, u.name as created_by_name
            FROM patients p
            LEFT JOIN users u ON p.created_by = u.id
            ORDER BY p.patient_id
        `);

        for (const patient of patients) {
            patient.procedures = await this.all(`
                SELECT pr.*, u.name as performed_by_name,
                       json_group_array(
                           json_object(
                               'vessel_name', vm.vessel_name,
                               'stenosis_percentage', vm.stenosis_percentage,
                               'measurement_method', vm.measurement_method,
                               'notes', vm.notes
                           )
                       ) as vessel_data
                FROM procedures pr
                LEFT JOIN users u ON pr.performed_by = u.id
                LEFT JOIN vessel_measurements vm ON pr.id = vm.procedure_id
                WHERE pr.patient_id = ?
                GROUP BY pr.id
                ORDER BY pr.procedure_date DESC
            `, [patient.id]);
        }

        return patients;
    }

    // Database utility methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
    }

    // Backup method
    async getDatabaseData() {
        const tables = ['users', 'patients', 'studies', 'procedures', 'vessel_measurements', 'audit_log'];
        const backup = {};

        for (const table of tables) {
            backup[table] = await this.all(`SELECT * FROM ${table}`);
        }

        return backup;
    }
}

module.exports = DatabaseManager;