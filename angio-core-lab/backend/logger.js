const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.logFile = path.join(this.logDir, 'angio-lab.log');
        this.errorLogFile = path.join(this.logDir, 'error.log');
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5;

        this.ensureLogDir();
    }

    async ensureLogDir() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error.message);
        }
    }

    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] ${message}\n`;
    }

    async writeToFile(filename, message) {
        try {
            await this.checkLogRotation(filename);
            await fs.appendFile(filename, message);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async checkLogRotation(filename) {
        try {
            const stats = await fs.stat(filename);
            if (stats.size > this.maxLogSize) {
                await this.rotateLog(filename);
            }
        } catch (error) {
            // File doesn't exist yet, which is fine
            if (error.code !== 'ENOENT') {
                console.error('Log rotation check failed:', error.message);
            }
        }
    }

    async rotateLog(filename) {
        try {
            const baseFileName = filename.replace('.log', '');

            // Move existing rotated logs
            for (let i = this.maxLogFiles - 1; i >= 1; i--) {
                const oldFile = `${baseFileName}.${i}.log`;
                const newFile = `${baseFileName}.${i + 1}.log`;

                try {
                    await fs.access(oldFile);
                    if (i === this.maxLogFiles - 1) {
                        await fs.unlink(oldFile); // Delete oldest
                    } else {
                        await fs.rename(oldFile, newFile);
                    }
                } catch (error) {
                    // File doesn't exist, continue
                }
            }

            // Move current log to .1
            await fs.rename(filename, `${baseFileName}.1.log`);
        } catch (error) {
            console.error('Log rotation failed:', error.message);
        }
    }

    log(message) {
        const formattedMessage = this.formatMessage('INFO', message);
        console.log(formattedMessage.trim());
        this.writeToFile(this.logFile, formattedMessage);
    }

    error(message) {
        const formattedMessage = this.formatMessage('ERROR', message);
        console.error(formattedMessage.trim());
        this.writeToFile(this.errorLogFile, formattedMessage);
        this.writeToFile(this.logFile, formattedMessage);
    }

    warn(message) {
        const formattedMessage = this.formatMessage('WARN', message);
        console.warn(formattedMessage.trim());
        this.writeToFile(this.logFile, formattedMessage);
    }

    debug(message) {
        if (process.env.NODE_ENV === 'development') {
            const formattedMessage = this.formatMessage('DEBUG', message);
            console.log(formattedMessage.trim());
            this.writeToFile(this.logFile, formattedMessage);
        }
    }

    async getLogs(lines = 100) {
        try {
            const content = await fs.readFile(this.logFile, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            return logLines.slice(-lines);
        } catch (error) {
            return [`Error reading log file: ${error.message}`];
        }
    }

    async getErrorLogs(lines = 100) {
        try {
            const content = await fs.readFile(this.errorLogFile, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            return logLines.slice(-lines);
        } catch (error) {
            return [`Error reading error log file: ${error.message}`];
        }
    }
}

module.exports = Logger;