const fs = require('fs').promises;
const path = require('path');

class BackupManager {
    constructor(db) {
        this.db = db;
        this.backupDir = path.join(__dirname, '../backups');
        this.maxBackups = 50; // Keep last 50 backups
    }

    async ensureBackupDir() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create backup directory: ${error.message}`);
        }
    }

    async createBackup() {
        try {
            await this.ensureBackupDir();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `angio-lab-backup-${timestamp}.json`;
            const backupPath = path.join(this.backupDir, backupFileName);

            // Get all data from database
            const data = await this.db.getDatabaseData();

            // Add metadata
            const backup = {
                metadata: {
                    version: '1.0.0',
                    created_at: new Date().toISOString(),
                    database_version: 'SQLite',
                    total_patients: data.patients ? data.patients.length : 0,
                    total_procedures: data.procedures ? data.procedures.length : 0
                },
                data
            };

            // Write backup file
            await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

            // Clean up old backups
            await this.cleanupOldBackups();

            return backupPath;

        } catch (error) {
            throw new Error(`Backup creation failed: ${error.message}`);
        }
    }

    async createAutoBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `auto-backup-${timestamp}.json`;
        const backupPath = path.join(this.backupDir, backupFileName);

        try {
            await this.ensureBackupDir();

            const data = await this.db.getDatabaseData();
            const backup = {
                metadata: {
                    type: 'auto',
                    created_at: new Date().toISOString(),
                    total_patients: data.patients ? data.patients.length : 0
                },
                data
            };

            await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

            // Keep only last 10 auto-backups
            await this.cleanupAutoBackups();

        } catch (error) {
            // Don't throw for auto-backups, just log
            console.error(`Auto-backup failed: ${error.message}`);
        }
    }

    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(file => file.startsWith('angio-lab-backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.stat(path.join(this.backupDir, file)).then(stats => stats.mtime)
                }));

            if (backupFiles.length > this.maxBackups) {
                // Get file stats
                const filesWithStats = await Promise.all(
                    backupFiles.map(async file => ({
                        ...file,
                        time: await file.time
                    }))
                );

                // Sort by modification time (oldest first)
                filesWithStats.sort((a, b) => a.time - b.time);

                // Delete oldest files
                const filesToDelete = filesWithStats.slice(0, filesWithStats.length - this.maxBackups);
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                }
            }
        } catch (error) {
            console.error(`Cleanup failed: ${error.message}`);
        }
    }

    async cleanupAutoBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const autoBackupFiles = files
                .filter(file => file.startsWith('auto-backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.stat(path.join(this.backupDir, file)).then(stats => stats.mtime)
                }));

            if (autoBackupFiles.length > 10) {
                const filesWithStats = await Promise.all(
                    autoBackupFiles.map(async file => ({
                        ...file,
                        time: await file.time
                    }))
                );

                filesWithStats.sort((a, b) => a.time - b.time);
                const filesToDelete = filesWithStats.slice(0, filesWithStats.length - 10);

                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                }
            }
        } catch (error) {
            console.error(`Auto-backup cleanup failed: ${error.message}`);
        }
    }

    async getBackupList() {
        try {
            await this.ensureBackupDir();
            const files = await fs.readdir(this.backupDir);

            const backupFiles = await Promise.all(
                files
                    .filter(file => file.endsWith('.json'))
                    .map(async file => {
                        const filePath = path.join(this.backupDir, file);
                        const stats = await fs.stat(filePath);
                        return {
                            name: file,
                            size: stats.size,
                            created: stats.mtime.toISOString(),
                            type: file.startsWith('auto-') ? 'auto' : 'manual'
                        };
                    })
            );

            return backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

        } catch (error) {
            throw new Error(`Failed to get backup list: ${error.message}`);
        }
    }

    async restoreBackup(backupFileName) {
        try {
            const backupPath = path.join(this.backupDir, backupFileName);

            // Read backup file
            const backupContent = await fs.readFile(backupPath, 'utf8');
            const backup = JSON.parse(backupContent);

            // Validate backup structure
            if (!backup.data || !backup.metadata) {
                throw new Error('Invalid backup file format');
            }

            // This would need to be implemented based on your restore requirements
            // For now, we'll just return the backup data for manual processing
            return backup;

        } catch (error) {
            throw new Error(`Backup restore failed: ${error.message}`);
        }
    }
}

module.exports = BackupManager;