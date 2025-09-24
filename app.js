class AngioLabApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.demoMode = true; // GitHub Pages demo mode

        // Demo data for GitHub Pages
        this.demoData = {
            patients: [
                { id: 'P001', name: 'John Doe', dob: '1965-05-15', gender: 'M', procedures: 2 },
                { id: 'P002', name: 'Jane Smith', dob: '1972-08-22', gender: 'F', procedures: 1 },
                { id: 'P003', name: 'Robert Johnson', dob: '1958-12-03', gender: 'M', procedures: 3 },
                { id: 'P004', name: 'Michael Brown', dob: '1955-03-10', gender: 'M', procedures: 1 },
                { id: 'P005', name: 'Emily Davis', dob: '1980-11-28', gender: 'F', procedures: 2 }
            ],
            procedures: [
                { id: 1, patientId: 'P001', date: '2024-09-20', type: 'Coronary Angiography', stenosis: 75, vessel: 'LAD' },
                { id: 2, patientId: 'P001', date: '2024-09-15', type: 'PCI', stenosis: 45, vessel: 'RCA' },
                { id: 3, patientId: 'P002', date: '2024-09-18', type: 'Diagnostic Catheterization', stenosis: 30, vessel: 'LCX' },
                { id: 4, patientId: 'P003', date: '2024-09-22', type: 'Coronary Angiography', stenosis: 85, vessel: 'LAD' },
                { id: 5, patientId: 'P003', date: '2024-09-10', type: 'CABG', stenosis: 90, vessel: 'Multi-vessel' },
                { id: 6, patientId: 'P004', date: '2024-09-21', type: 'Stress Test', stenosis: 40, vessel: 'RCA' },
                { id: 7, patientId: 'P005', date: '2024-09-19', type: 'Angioplasty', stenosis: 65, vessel: 'LAD' }
            ],
            users: {
                'admin@lab.com': { name: 'Dr. Admin', role: 'Administrator', password: 'admin123' },
                'tech@lab.com': { name: 'Tech User', role: 'Technician', password: 'tech123' }
            }
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        this.hideLoadingScreen();
    }

    // Authentication Methods (Demo Mode)
    async checkAuthStatus() {
        const userData = localStorage.getItem('angio_demo_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.showMainScreen();
            this.updateUserInterface();
            await this.loadDashboardData();
        } else {
            this.showLoginScreen();
        }
    }

    async login(email, password) {
        // Demo authentication
        const user = this.demoData.users[email];
        if (user && user.password === password) {
            this.currentUser = { email, name: user.name, role: user.role };
            localStorage.setItem('angio_demo_user', JSON.stringify(this.currentUser));

            this.showMainScreen();
            this.updateUserInterface();
            await this.loadDashboardData();
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('angio_demo_user');
        this.showLoginScreen();
    }

    // UI Methods
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 1000);
    }

    showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }

    showMainScreen() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
    }

    updateUserInterface() {
        if (this.currentUser) {
            document.getElementById('user-name').textContent = this.currentUser.name;
            document.getElementById('user-role').textContent = this.currentUser.role;

            // Show/hide admin elements
            const adminElements = document.querySelectorAll('.admin-only');
            const isAdmin = this.currentUser.role === 'Administrator';
            adminElements.forEach(el => {
                el.style.display = isAdmin ? 'block' : 'none';
            });
        }
    }

    async loadDashboardData() {
        // Calculate statistics from demo data
        const totalPatients = this.demoData.patients.length;
        const totalProcedures = this.demoData.procedures.length;
        const avgStenosis = Math.round(
            this.demoData.procedures.reduce((sum, p) => sum + p.stenosis, 0) /
            this.demoData.procedures.length
        );

        // Recent procedures (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentProcedures = this.demoData.procedures.filter(p =>
            new Date(p.date) >= weekAgo
        ).length;

        // Update dashboard stats
        document.getElementById('total-patients').textContent = totalPatients;
        document.getElementById('total-procedures').textContent = totalProcedures;
        document.getElementById('avg-stenosis').textContent = avgStenosis + '%';
        document.getElementById('recent-procedures').textContent = recentProcedures;

        // Load recent activity
        this.loadRecentActivity();
    }

    loadRecentActivity() {
        const activityList = document.getElementById('recent-activity-list');
        const recentProcedures = this.demoData.procedures
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        activityList.innerHTML = recentProcedures.map(procedure => {
            const patient = this.demoData.patients.find(p => p.id === procedure.patientId);
            return `
                <div class="activity-item">
                    <div class="activity-type">📋 ${procedure.type}</div>
                    <div class="activity-details">
                        Patient: ${patient.name} | ${procedure.vessel} | Stenosis: ${procedure.stenosis}%
                    </div>
                    <div class="activity-date">${new Date(procedure.date).toLocaleDateString()}</div>
                </div>
            `;
        }).join('');
    }

    loadPatientsPage() {
        const patientsList = document.getElementById('patients-list');
        patientsList.innerHTML = this.demoData.patients.map(patient => `
            <div class="table-row">
                <div class="table-cell">${patient.id}</div>
                <div class="table-cell">${patient.name}</div>
                <div class="table-cell">${new Date(patient.dob).toLocaleDateString()}</div>
                <div class="table-cell">${patient.gender}</div>
                <div class="table-cell">${patient.procedures}</div>
                <div class="table-cell">
                    <button class="btn btn-sm btn-outline" onclick="app.viewPatient('${patient.id}')">View</button>
                </div>
            </div>
        `).join('');
    }

    loadProceduresPage() {
        const proceduresList = document.getElementById('procedures-list');
        proceduresList.innerHTML = this.demoData.procedures.map(procedure => {
            const patient = this.demoData.patients.find(p => p.id === procedure.patientId);
            return `
                <div class="procedure-card">
                    <div class="procedure-header">
                        <h4>${procedure.type}</h4>
                        <span class="procedure-date">${new Date(procedure.date).toLocaleDateString()}</span>
                    </div>
                    <div class="procedure-details">
                        <p><strong>Patient:</strong> ${patient.name} (${procedure.patientId})</p>
                        <p><strong>Vessel:</strong> ${procedure.vessel}</p>
                        <p><strong>Stenosis:</strong> ${procedure.stenosis}%</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Event Listeners
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');

            const success = await this.login(email, password);
            if (!success) {
                errorDiv.textContent = 'Invalid credentials. Try: admin@lab.com/admin123 or tech@lab.com/tech123';
                errorDiv.classList.remove('hidden');
            } else {
                errorDiv.classList.add('hidden');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Demo credential buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.demo-user')) {
                const demoUser = e.target.closest('.demo-user');
                const text = demoUser.textContent;
                if (text.includes('admin@lab.com')) {
                    document.getElementById('email').value = 'admin@lab.com';
                    document.getElementById('password').value = 'admin123';
                } else if (text.includes('tech@lab.com')) {
                    document.getElementById('email').value = 'tech@lab.com';
                    document.getElementById('password').value = 'tech123';
                }
            }
        });

        // Export buttons (demo functionality)
        document.addEventListener('DOMContentLoaded', () => {
            const exportPatientsBtn = document.getElementById('export-patients-btn');
            const exportProceduresBtn = document.getElementById('export-procedures-btn');

            if (exportPatientsBtn) {
                exportPatientsBtn.addEventListener('click', () => {
                    this.exportData('patients', this.demoData.patients);
                });
            }

            if (exportProceduresBtn) {
                exportProceduresBtn.addEventListener('click', () => {
                    this.exportData('procedures', this.demoData.procedures);
                });
            }
        });

        // Backup button
        const backupBtn = document.getElementById('backup-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.createBackup();
            });
        }
    }

    navigateToPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Show/hide pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        document.getElementById(`${page}-page`).classList.add('active');

        // Load page data
        switch(page) {
            case 'patients':
                this.loadPatientsPage();
                break;
            case 'procedures':
                this.loadProceduresPage();
                break;
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'reports':
                // Reports page is already static
                break;
        }

        this.currentPage = page;
    }

    // Demo functions
    viewPatient(patientId) {
        const patient = this.demoData.patients.find(p => p.id === patientId);
        const patientProcedures = this.demoData.procedures.filter(p => p.patientId === patientId);

        const proceduresList = patientProcedures.map(proc =>
            `• ${proc.type} (${new Date(proc.date).toLocaleDateString()}) - ${proc.vessel}: ${proc.stenosis}%`
        ).join('\n');

        alert(`Patient Details:\nID: ${patient.id}\nName: ${patient.name}\nDOB: ${patient.dob}\nGender: ${patient.gender}\n\nProcedures:\n${proceduresList}\n\n[This is a demo - full functionality available in the complete system]`);
    }

    exportData(type, data) {
        const csvContent = this.convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`);
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');
        return csv;
    }

    createBackup() {
        const backupData = {
            timestamp: new Date().toISOString(),
            patients: this.demoData.patients,
            procedures: this.demoData.procedures,
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `angio_lab_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Backup created successfully!');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to container
        const container = document.getElementById('notifications');
        container.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AngioLabApp();
});