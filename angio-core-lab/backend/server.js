const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const DatabaseManager = require('./database-manager');
const AuthController = require('./auth-controller');
const BackupManager = require('./backup-manager');
const Logger = require('./logger');

class AngioServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.db = new DatabaseManager();
        this.auth = new AuthController(this.db);
        this.backup = new BackupManager(this.db);
        this.logger = new Logger();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.startBackupSchedule();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:"],
                }
            }
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: { error: 'Too many requests, please try again later' }
        });
        this.app.use(limiter);

        // CORS and body parsing
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Static files
        this.app.use(express.static(path.join(__dirname, '../frontend')));

        // Request logging
        this.app.use((req, res, next) => {
            this.logger.log(`${req.method} ${req.path} - ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Authentication routes
        this.app.post('/api/auth/login',
            [
                body('email').isEmail().normalizeEmail(),
                body('password').isLength({ min: 6 })
            ],
            this.handleValidation,
            this.auth.login.bind(this.auth)
        );

        this.app.post('/api/auth/register',
            [
                body('email').isEmail().normalizeEmail(),
                body('password').isLength({ min: 6 }),
                body('name').trim().isLength({ min: 2 }),
                body('role').isIn(['admin', 'technician', 'physician'])
            ],
            this.handleValidation,
            this.auth.requireAuth.bind(this.auth),
            this.auth.requireRole(['admin']),
            this.auth.register.bind(this.auth)
        );

        // Patient routes
        this.app.get('/api/patients',
            this.auth.requireAuth.bind(this.auth),
            this.getPatients.bind(this)
        );

        this.app.post('/api/patients',
            [
                body('patientId').trim().isLength({ min: 1 }),
                body('name').trim().isLength({ min: 2 }),
                body('dateOfBirth').isISO8601(),
                body('gender').isIn(['M', 'F', 'Other'])
            ],
            this.handleValidation,
            this.auth.requireAuth.bind(this.auth),
            this.createPatient.bind(this)
        );

        // Procedure routes
        this.app.get('/api/patients/:patientId/procedures',
            this.auth.requireAuth.bind(this.auth),
            this.getProcedures.bind(this)
        );

        this.app.post('/api/patients/:patientId/procedures',
            [
                body('studyName').trim().isLength({ min: 1 }),
                body('procedureDate').isISO8601(),
                body('vesselData').isArray(),
                body('vesselData.*.vessel').trim().isLength({ min: 1 }),
                body('vesselData.*.stenosisPercentage').isFloat({ min: 0, max: 100 })
            ],
            this.handleValidation,
            this.auth.requireAuth.bind(this.auth),
            this.createProcedure.bind(this)
        );

        // Data export routes
        this.app.get('/api/export/patients',
            this.auth.requireAuth.bind(this.auth),
            this.auth.requireRole(['admin', 'physician']),
            this.exportPatients.bind(this)
        );

        // Backup routes
        this.app.post('/api/backup',
            this.auth.requireAuth.bind(this.auth),
            this.auth.requireRole(['admin']),
            this.createBackup.bind(this)
        );

        // Serve frontend for all other routes
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/index.html'));
        });
    }

    handleValidation(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }
        next();
    }

    async getPatients(req, res) {
        try {
            const patients = await this.db.getPatients();
            res.json({ success: true, data: patients });
        } catch (error) {
            this.handleError(error, res, 'Failed to retrieve patients');
        }
    }

    async createPatient(req, res) {
        try {
            const patient = await this.db.createPatient({
                ...req.body,
                createdBy: req.user.id,
                createdAt: new Date().toISOString()
            });
            res.status(201).json({ success: true, data: patient });
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                return res.status(409).json({
                    error: 'Patient ID already exists'
                });
            }
            this.handleError(error, res, 'Failed to create patient');
        }
    }

    async getProcedures(req, res) {
        try {
            const procedures = await this.db.getProcedures(req.params.patientId);
            res.json({ success: true, data: procedures });
        } catch (error) {
            this.handleError(error, res, 'Failed to retrieve procedures');
        }
    }

    async createProcedure(req, res) {
        try {
            const procedure = await this.db.createProcedure({
                ...req.body,
                patientId: req.params.patientId,
                performedBy: req.user.id,
                createdAt: new Date().toISOString()
            });
            res.status(201).json({ success: true, data: procedure });
        } catch (error) {
            this.handleError(error, res, 'Failed to create procedure');
        }
    }

    async exportPatients(req, res) {
        try {
            const data = await this.db.getFullExport();
            res.json({ success: true, data, exportDate: new Date().toISOString() });
        } catch (error) {
            this.handleError(error, res, 'Failed to export data');
        }
    }

    async createBackup(req, res) {
        try {
            const backupPath = await this.backup.createBackup();
            res.json({
                success: true,
                message: 'Backup created successfully',
                path: backupPath
            });
        } catch (error) {
            this.handleError(error, res, 'Failed to create backup');
        }
    }

    handleError(error, res, message) {
        this.logger.error(`${message}: ${error.message}`);
        res.status(500).json({
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            this.logger.error(`Unhandled error: ${error.message}`);
            res.status(500).json({
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        });

        // Graceful shutdown
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }

    startBackupSchedule() {
        // Auto-backup every 5 minutes
        setInterval(async () => {
            try {
                await this.backup.createAutoBackup();
                this.logger.log('Auto-backup completed');
            } catch (error) {
                this.logger.error(`Auto-backup failed: ${error.message}`);
            }
        }, 5 * 60 * 1000);
    }

    async start() {
        try {
            await this.db.initialize();
            this.logger.log('Database initialized successfully');

            this.app.listen(this.port, () => {
                this.logger.log(`Angio Core Lab server running on port ${this.port}`);
                console.log(`🏥 Angio Core Lab System Ready!`);
                console.log(`📊 Dashboard: http://localhost:${this.port}`);
                console.log(`🔐 Default Admin: admin@lab.com / admin123`);
            });
        } catch (error) {
            this.logger.error(`Failed to start server: ${error.message}`);
            process.exit(1);
        }
    }

    async shutdown() {
        this.logger.log('Shutting down gracefully...');
        try {
            await this.backup.createBackup();
            await this.db.close();
            process.exit(0);
        } catch (error) {
            this.logger.error(`Shutdown error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new AngioServer();
    server.start();
}

module.exports = AngioServer;