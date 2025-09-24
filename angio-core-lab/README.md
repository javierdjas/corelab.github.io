# Angio Core Lab Management System

A simple, robust, and fail-proof angiography core lab information management system.

## Features

- **Patient Management**: Track patient information and procedures
- **Stenosis Assessment**: Record vessel measurements and stenosis percentages
- **Study Management**: Organize data by clinical studies
- **User Authentication**: Role-based access (Admin/Technician/Physician)
- **Data Security**: Automatic backups and validation
- **Offline Support**: Works without internet connection

## Quick Start

1. Install dependencies: `npm install`
2. Initialize database: `npm run init-db`
3. Start server: `npm start`
4. Open browser to: `http://localhost:3000`

## Default Login

- **Admin**: admin@lab.com / admin123
- **Technician**: tech@lab.com / tech123

## Architecture

- **Frontend**: Vanilla HTML/CSS/JavaScript (reliability first)
- **Backend**: Node.js + Express
- **Database**: SQLite (file-based, no server required)
- **Security**: JWT authentication, input validation, rate limiting

## Backup & Recovery

- Automatic backups every 5 minutes
- Manual backup: `npm run backup`
- Backup location: `./backups/`