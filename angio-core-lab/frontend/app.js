class AngioLabApp {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.currentPage = 'dashboard';
        this.apiBase = '/api';

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        this.hideLoadingScreen();
    }

    // Authentication Methods
    async checkAuthStatus() {
        const token = localStorage.getItem('angio_token');
        if (token) {
            this.authToken = token;
            try {
                const user = await this.makeRequest('/api/health', 'GET', null, true);
                if (user) {
                    await this.loadUserData();
                    this.showMainScreen();
                } else {
                    this.showLoginScreen();
                }
            } catch (error) {
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }

    async loadUserData() {
        try {
            // Decode JWT to get user info (simple client-side decode - not for security)
            const tokenPayload = JSON.parse(atob(this.authToken.split('.')[1]));
            this.currentUser = tokenPayload;

            this.updateUserInterface();
            await this.loadDashboardData();
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.logout();
        }
    }

    async login(email, password) {
        try {
            const response = await this.makeRequest('/auth/login', 'POST', { email, password });

            this.authToken = response.token;
            this.currentUser = response.user;
            localStorage.setItem('angio_token', this.authToken);

            this.updateUserInterface();
            await this.loadDashboardData();
            this.showMainScreen();
            this.showNotification('Login successful', 'success');

            return true;
        } catch (error) {
            this.showNotification(error.message || 'Login failed', 'error');
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        this.authToken = null;
        localStorage.removeItem('angio_token');
        this.showLoginScreen();
        this.showNotification('Logged out successfully', 'success');
    }

    // API Methods
    async makeRequest(endpoint, method = 'GET', data = null, useAuth = true) {
        const url = `${this.apiBase}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (useAuth && this.authToken) {
            options.headers.Authorization = `Bearer ${this.authToken}`;
        }

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            if (error.message.includes('401')) {
                this.logout();
                throw new Error('Session expired. Please login again.');
            }
            throw error;
        }
    }

    // UI Management Methods
    hideLoadingScreen() {
        document.getElementById('loading-screen').classList.add('hidden');
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

            // Apply role-based styling
            document.body.className = `role-${this.currentUser.role}`;
        }
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        document.getElementById(`${pageId}-page`).classList.add('active');

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        this.currentPage = pageId;

        // Load page-specific data
        this.loadPageData(pageId);
    }

    async loadPageData(pageId) {
        switch (pageId) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'patients':
                await this.loadPatientsData();
                break;
            case 'procedures':
                await this.loadProceduresData();
                break;
            case 'reports':
                // Reports page doesn't need data loading
                break;
        }
    }

    // Dashboard Methods
    async loadDashboardData() {
        try {
            const patients = await this.makeRequest('/patients');
            const stats = this.calculateStats(patients.data);
            this.updateDashboardStats(stats);
            this.updateRecentActivity(patients.data);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    calculateStats(patients) {
        let totalProcedures = 0;
        let totalStenosis = 0;
        let measurementCount = 0;
        let recentProcedures = 0;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        patients.forEach(patient => {
            totalProcedures += patient.procedure_count || 0;
        });

        return {
            totalPatients: patients.length,
            totalProcedures,
            avgStenosis: measurementCount > 0 ? (totalStenosis / measurementCount).toFixed(1) : 0,
            recentProcedures
        };
    }

    updateDashboardStats(stats) {
        document.getElementById('total-patients').textContent = stats.totalPatients;
        document.getElementById('total-procedures').textContent = stats.totalProcedures;
        document.getElementById('avg-stenosis').textContent = `${stats.avgStenosis}%`;
        document.getElementById('recent-procedures').textContent = stats.recentProcedures;
    }

    updateRecentActivity(patients) {
        const activityList = document.getElementById('recent-activity-list');

        if (!patients.length) {
            activityList.innerHTML = '<div class="activity-item"><div class="activity-content">No recent activity</div></div>';
            return;
        }

        const recentPatients = patients.slice(0, 5);
        activityList.innerHTML = recentPatients.map(patient => `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">Patient Added: ${patient.name}</div>
                    <div class="activity-details">ID: ${patient.patient_id} • ${patient.procedure_count || 0} procedures</div>
                </div>
                <div class="activity-time">${this.formatDate(patient.created_at)}</div>
            </div>
        `).join('');
    }

    // Patient Management Methods
    async loadPatientsData() {
        try {
            const response = await this.makeRequest('/patients');
            this.renderPatientsTable(response.data);
        } catch (error) {
            console.error('Failed to load patients:', error);
            this.showNotification('Failed to load patients', 'error');
        }
    }

    renderPatientsTable(patients) {
        const patientsList = document.getElementById('patients-list');

        if (!patients.length) {
            patientsList.innerHTML = '<div class="table-row"><div class="table-cell" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No patients found</div></div>';
            return;
        }

        patientsList.innerHTML = patients.map(patient => `
            <div class="table-row">
                <div class="table-cell">${patient.patient_id}</div>
                <div class="table-cell">${patient.name}</div>
                <div class="table-cell">${this.formatDate(patient.date_of_birth)}</div>
                <div class="table-cell">${patient.gender}</div>
                <div class="table-cell">${patient.procedure_count || 0}</div>
                <div class="table-cell">
                    <button class="btn btn-outline" onclick="app.viewPatient('${patient.patient_id}')">View</button>
                </div>
            </div>
        `).join('');
    }

    // Procedure Methods
    async loadProceduresData() {
        try {
            const patients = await this.makeRequest('/patients');
            const allProcedures = [];

            for (const patient of patients.data) {
                if (patient.procedure_count > 0) {
                    const procedures = await this.makeRequest(`/patients/${patient.patient_id}/procedures`);
                    procedures.data.forEach(proc => {
                        proc.patient_name = patient.name;
                        proc.patient_id_display = patient.patient_id;
                        allProcedures.push(proc);
                    });
                }
            }

            this.renderProceduresGrid(allProcedures);
        } catch (error) {
            console.error('Failed to load procedures:', error);
            this.showNotification('Failed to load procedures', 'error');
        }
    }

    renderProceduresGrid(procedures) {
        const proceduresList = document.getElementById('procedures-list');

        if (!procedures.length) {
            proceduresList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">No procedures found</div>';
            return;
        }

        proceduresList.innerHTML = procedures.map(procedure => {
            const vesselData = typeof procedure.vessel_data === 'string'
                ? JSON.parse(procedure.vessel_data)
                : procedure.vessel_data || [];

            return `
                <div class="procedure-card">
                    <div class="procedure-header">
                        <div class="procedure-title">${procedure.study_name}</div>
                        <div class="procedure-date">${this.formatDate(procedure.procedure_date)}</div>
                    </div>
                    <div class="procedure-patient">
                        Patient: ${procedure.patient_name} (${procedure.patient_id_display})
                    </div>
                    <div class="vessel-measurements">
                        ${vesselData.map(vessel => `
                            <div class="vessel-item">
                                <span class="vessel-name">${vessel.vessel_name}</span>
                                <span class="stenosis-value">${vessel.stenosis_percentage}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Modal Methods
    showModal(title, content) {
        const modal = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="modal-close" onclick="app.hideModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        modal.classList.remove('hidden');
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    // Form Methods
    showAddPatientForm() {
        const formContent = `
            <form id="add-patient-form" class="form-container">
                <div class="input-group">
                    <label for="patient-id-input">Patient ID</label>
                    <input type="text" id="patient-id-input" required>
                </div>
                <div class="input-group">
                    <label for="patient-name-input">Full Name</label>
                    <input type="text" id="patient-name-input" required>
                </div>
                <div class="input-group">
                    <label for="patient-dob-input">Date of Birth</label>
                    <input type="date" id="patient-dob-input" required>
                </div>
                <div class="input-group">
                    <label for="patient-gender-input">Gender</label>
                    <select id="patient-gender-input" required>
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline" onclick="app.hideModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Patient</button>
                </div>
            </form>
        `;

        this.showModal('Add New Patient', formContent);

        document.getElementById('add-patient-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addPatient();
        });
    }

    async addPatient() {
        const patientData = {
            patientId: document.getElementById('patient-id-input').value,
            name: document.getElementById('patient-name-input').value,
            dateOfBirth: document.getElementById('patient-dob-input').value,
            gender: document.getElementById('patient-gender-input').value
        };

        try {
            await this.makeRequest('/patients', 'POST', patientData);
            this.hideModal();
            this.showNotification('Patient added successfully', 'success');
            await this.loadPatientsData();
        } catch (error) {
            this.showNotification(error.message || 'Failed to add patient', 'error');
        }
    }

    showAddProcedureForm() {
        const formContent = `
            <form id="add-procedure-form" class="form-container">
                <div class="input-group">
                    <label for="procedure-patient-id">Patient ID</label>
                    <input type="text" id="procedure-patient-id" required placeholder="Enter patient ID">
                </div>
                <div class="input-group">
                    <label for="procedure-study">Study Name</label>
                    <select id="procedure-study" required>
                        <option value="">Select Study</option>
                        <option value="VIKING">VIKING</option>
                        <option value="SYNTAX">SYNTAX</option>
                        <option value="FREEDOM">FREEDOM</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="procedure-date">Procedure Date</label>
                    <input type="date" id="procedure-date" required>
                </div>
                <div class="input-group">
                    <label>Vessel Measurements</label>
                    <div id="vessel-measurements">
                        <div class="vessel-measurement">
                            <input type="text" placeholder="Vessel name (e.g., LAD)" required>
                            <input type="number" placeholder="Stenosis %" min="0" max="100" step="0.1" required>
                            <button type="button" onclick="this.parentElement.remove()">Remove</button>
                        </div>
                    </div>
                    <button type="button" onclick="app.addVesselMeasurement()">Add Vessel</button>
                </div>
                <div class="input-group">
                    <label for="procedure-notes">Notes (Optional)</label>
                    <textarea id="procedure-notes" rows="3"></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline" onclick="app.hideModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Record Procedure</button>
                </div>
            </form>
        `;

        this.showModal('Record New Procedure', formContent);

        document.getElementById('add-procedure-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addProcedure();
        });
    }

    addVesselMeasurement() {
        const container = document.getElementById('vessel-measurements');
        const vesselDiv = document.createElement('div');
        vesselDiv.className = 'vessel-measurement';
        vesselDiv.innerHTML = `
            <input type="text" placeholder="Vessel name (e.g., LAD)" required>
            <input type="number" placeholder="Stenosis %" min="0" max="100" step="0.1" required>
            <button type="button" onclick="this.parentElement.remove()">Remove</button>
        `;
        container.appendChild(vesselDiv);
    }

    async addProcedure() {
        const patientId = document.getElementById('procedure-patient-id').value;
        const studyName = document.getElementById('procedure-study').value;
        const procedureDate = document.getElementById('procedure-date').value;
        const notes = document.getElementById('procedure-notes').value;

        const vesselMeasurements = Array.from(document.querySelectorAll('.vessel-measurement')).map(vessel => {
            const inputs = vessel.querySelectorAll('input');
            return {
                vessel: inputs[0].value,
                stenosisPercentage: parseFloat(inputs[1].value)
            };
        }).filter(vessel => vessel.vessel && !isNaN(vessel.stenosisPercentage));

        if (vesselMeasurements.length === 0) {
            this.showNotification('At least one vessel measurement is required', 'error');
            return;
        }

        const procedureData = {
            studyName,
            procedureDate,
            vesselData: vesselMeasurements,
            notes
        };

        try {
            await this.makeRequest(`/patients/${patientId}/procedures`, 'POST', procedureData);
            this.hideModal();
            this.showNotification('Procedure recorded successfully', 'success');
            await this.loadProceduresData();
        } catch (error) {
            this.showNotification(error.message || 'Failed to record procedure', 'error');
        }
    }

    // Export Methods
    async exportPatients() {
        try {
            const response = await this.makeRequest('/export/patients');
            this.downloadJSON(response.data, 'patients-export.json');
            this.showNotification('Patient data exported successfully', 'success');
        } catch (error) {
            this.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    async createBackup() {
        try {
            await this.makeRequest('/backup', 'POST');
            this.showNotification('Backup created successfully', 'success');
        } catch (error) {
            this.showNotification('Backup failed: ' + error.message, 'error');
        }
    }

    // Utility Methods
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="margin-left: auto; background: none; border: none; cursor: pointer;">&times;</button>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('login-btn');
            const spinner = loginBtn.querySelector('.btn-spinner');
            const errorDiv = document.getElementById('login-error');

            // Show loading state
            loginBtn.disabled = true;
            spinner.classList.remove('hidden');
            errorDiv.classList.add('hidden');

            const success = await this.login(email, password);

            // Reset loading state
            loginBtn.disabled = false;
            spinner.classList.add('hidden');

            if (!success) {
                errorDiv.textContent = 'Invalid email or password';
                errorDiv.classList.remove('hidden');
            }
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showPage(btn.dataset.page);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Action buttons
        document.getElementById('add-patient-btn').addEventListener('click', () => {
            this.showAddPatientForm();
        });

        document.getElementById('add-procedure-btn').addEventListener('click', () => {
            this.showAddProcedureForm();
        });

        document.getElementById('backup-btn').addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('export-patients-btn').addEventListener('click', () => {
            this.exportPatients();
        });

        // Modal overlay click to close
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });

        // Patient search
        document.getElementById('patient-search').addEventListener('input', (e) => {
            this.filterPatients(e.target.value);
        });
    }

    filterPatients(searchTerm) {
        const rows = document.querySelectorAll('#patients-list .table-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const cells = row.querySelectorAll('.table-cell');
            const patientId = cells[0]?.textContent.toLowerCase() || '';
            const patientName = cells[1]?.textContent.toLowerCase() || '';

            if (patientId.includes(term) || patientName.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    async viewPatient(patientId) {
        try {
            const procedures = await this.makeRequest(`/patients/${patientId}/procedures`);

            const content = `
                <div class="patient-details">
                    <h3>Patient: ${patientId}</h3>
                    <div class="procedures-list">
                        ${procedures.data.length ? procedures.data.map(proc => {
                            const vesselData = typeof proc.vessel_data === 'string'
                                ? JSON.parse(proc.vessel_data)
                                : proc.vessel_data || [];

                            return `
                                <div class="procedure-summary">
                                    <h4>${proc.study_name} - ${this.formatDate(proc.procedure_date)}</h4>
                                    <div class="vessels">
                                        ${vesselData.map(vessel => `
                                            <div>${vessel.vessel_name}: ${vessel.stenosis_percentage}%</div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('') : '<p>No procedures recorded for this patient.</p>'}
                    </div>
                </div>
            `;

            this.showModal(`Patient Details - ${patientId}`, content);
        } catch (error) {
            this.showNotification('Failed to load patient details', 'error');
        }
    }
}

// Initialize the application
const app = new AngioLabApp();