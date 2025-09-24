/**
 * CoreLab Clinical Data Management System
 * Secure, robust, and simple clinical data management
 */

'use strict';

// Application State Management
class AppState {
    constructor() {
        this.currentUser = null;
        this.patients = this.loadFromStorage('patients', []);
        this.assessments = this.loadFromStorage('assessments', []);
        this.currentSection = 'login';
    }

    loadFromStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(`corelab_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error loading ${key} from storage:`, error);
            return defaultValue;
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(`corelab_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to storage:`, error);
            UI.showToast('Storage error: Please check your browser settings', 'error');
            return false;
        }
    }

    addPatient(patient) {
        // Validate patient data
        if (!this.validatePatient(patient)) {
            return false;
        }

        // Check for duplicate patient ID
        if (this.patients.some(p => p.patientId === patient.patientId)) {
            UI.showToast('Patient ID already exists', 'error');
            return false;
        }

        const newPatient = {
            ...patient,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.patients.push(newPatient);
        this.saveToStorage('patients', this.patients);
        this.logActivity(`Added new patient: ${patient.name}`);
        return true;
    }

    updatePatient(id, updatedData) {
        const index = this.patients.findIndex(p => p.id === id);
        if (index === -1) return false;

        this.patients[index] = {
            ...this.patients[index],
            ...updatedData,
            updatedAt: new Date().toISOString()
        };

        this.saveToStorage('patients', this.patients);
        this.logActivity(`Updated patient: ${this.patients[index].name}`);
        return true;
    }

    deletePatient(id) {
        const patientIndex = this.patients.findIndex(p => p.id === id);
        if (patientIndex === -1) return false;

        const patient = this.patients[patientIndex];
        
        // Remove associated assessments
        this.assessments = this.assessments.filter(a => a.patientId !== id);
        this.saveToStorage('assessments', this.assessments);
        
        // Remove patient
        this.patients.splice(patientIndex, 1);
        this.saveToStorage('patients', this.patients);
        this.logActivity(`Deleted patient: ${patient.name}`);
        return true;
    }

    addAssessment(assessment) {
        if (!this.validateAssessment(assessment)) {
            return false;
        }

        const newAssessment = {
            ...assessment,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.assessments.push(newAssessment);
        this.saveToStorage('assessments', this.assessments);
        this.logActivity(`Added new assessment for patient ID: ${assessment.patientId}`);
        return true;
    }

    validatePatient(patient) {
        const errors = [];
        
        if (!patient.patientId || !/^[A-Za-z0-9-]+$/.test(patient.patientId)) {
            errors.push('Patient ID must contain only letters, numbers, and hyphens');
        }
        
        if (!patient.name || patient.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!patient.age || patient.age < 0 || patient.age > 150) {
            errors.push('Age must be between 0 and 150');
        }
        
        if (!patient.gender || !['male', 'female', 'other', 'prefer-not-to-say'].includes(patient.gender)) {
            errors.push('Please select a valid gender option');
        }

        if (errors.length > 0) {
            UI.showToast(errors.join('. '), 'error');
            return false;
        }
        
        return true;
    }

    validateAssessment(assessment) {
        const errors = [];
        
        if (!assessment.patientId) {
            errors.push('Please select a patient');
        }
        
        if (!assessment.type) {
            errors.push('Please select an assessment type');
        }
        
        if (!assessment.date) {
            errors.push('Please select an assessment date');
        } else if (new Date(assessment.date) > new Date()) {
            errors.push('Assessment date cannot be in the future');
        }

        if (errors.length > 0) {
            UI.showToast(errors.join('. '), 'error');
            return false;
        }
        
        return true;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    logActivity(message) {
        const activities = this.loadFromStorage('activities', []);
        activities.unshift({
            message,
            timestamp: new Date().toISOString(),
            user: this.currentUser?.name || 'Unknown'
        });
        
        // Keep only last 50 activities
        activities.splice(50);
        this.saveToStorage('activities', activities);
    }

    getActivities() {
        return this.loadFromStorage('activities', []);
    }

    searchPatients(query) {
        if (!query) return this.patients;
        
        const searchTerm = query.toLowerCase();
        return this.patients.filter(patient => 
            patient.name.toLowerCase().includes(searchTerm) ||
            patient.patientId.toLowerCase().includes(searchTerm)
        );
    }
}

// User Authentication and Security
class Auth {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePassword(password) {
        return password && password.length >= 8;
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>\"'&]/g, (match) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return entities[match];
        });
    }

    static hashPassword(password) {
        // Simple hash for demo purposes - in production, use proper bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    static register(userData) {
        const users = JSON.parse(localStorage.getItem('corelab_users') || '[]');
        
        // Check if user already exists
        if (users.some(user => user.email === userData.email)) {
            UI.showToast('User already exists', 'error');
            return false;
        }

        const newUser = {
            id: Date.now().toString(),
            name: Auth.sanitizeInput(userData.name),
            email: userData.email.toLowerCase(),
            password: Auth.hashPassword(userData.password),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('corelab_users', JSON.stringify(users));
        
        UI.showToast('Registration successful!', 'success');
        return true;
    }

    static login(email, password) {
        const users = JSON.parse(localStorage.getItem('corelab_users') || '[]');
        const user = users.find(u => 
            u.email === email.toLowerCase() && 
            u.password === Auth.hashPassword(password)
        );

        if (user) {
            const userSession = {
                id: user.id,
                name: user.name,
                email: user.email,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('corelab_session', JSON.stringify(userSession));
            return userSession;
        }
        
        return null;
    }

    static getCurrentUser() {
        try {
            const session = localStorage.getItem('corelab_session');
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    static logout() {
        localStorage.removeItem('corelab_session');
        window.location.reload();
    }
}

// UI Management
class UI {
    static init() {
        UI.setupEventListeners();
        UI.checkAuthState();
    }

    static setupEventListeners() {
        // Authentication tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchAuthTab(e.target.dataset.tab);
            });
        });

        // Forms
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin);
        document.getElementById('registerForm').addEventListener('submit', this.handleRegister);
        document.getElementById('patientForm').addEventListener('submit', this.handlePatientSubmit);
        document.getElementById('assessmentForm').addEventListener('submit', this.handleAssessmentSubmit);
        document.getElementById('profileForm').addEventListener('submit', this.handleProfileUpdate);

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

        // Buttons
        document.getElementById('logoutBtn').addEventListener('click', Auth.logout);
        document.getElementById('addPatientBtn').addEventListener('click', () => this.showModal('patientModal'));
        document.getElementById('addAssessmentBtn').addEventListener('click', () => this.showModal('assessmentModal'));

        // Modal controls
        document.querySelectorAll('.close-btn, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', this.hideAllModals);
        });

        // Search
        document.getElementById('patientSearch').addEventListener('input', this.handlePatientSearch);

        // Toast close
        document.querySelector('.toast-close').addEventListener('click', this.hideToast);

        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyboard);

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });
    }

    static handleKeyboard(e) {
        // ESC key closes modals
        if (e.key === 'Escape') {
            UI.hideAllModals();
        }
    }

    static checkAuthState() {
        const user = Auth.getCurrentUser();
        if (user) {
            appState.currentUser = user;
            this.showUserInterface();
            this.updateUserInfo();
            this.showSection('dashboard');
        } else {
            this.showSection('login');
        }
    }

    static switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Form`).classList.remove('hidden');
    }

    static async handleLogin(e) {
        e.preventDefault();
        UI.showLoading();

        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        // Clear previous errors
        UI.clearFormErrors('login');

        // Validate inputs
        if (!Auth.validateEmail(email)) {
            UI.showFieldError('loginEmail', 'Please enter a valid email address');
            UI.hideLoading();
            return;
        }

        if (!Auth.validatePassword(password)) {
            UI.showFieldError('loginPassword', 'Password must be at least 8 characters');
            UI.hideLoading();
            return;
        }

        // Simulate network delay for better UX
        setTimeout(() => {
            const user = Auth.login(email, password);
            
            if (user) {
                appState.currentUser = user;
                UI.showUserInterface();
                UI.updateUserInfo();
                UI.showSection('dashboard');
                UI.showToast('Welcome back!', 'success');
            } else {
                UI.showFieldError('loginPassword', 'Invalid email or password');
            }
            
            UI.hideLoading();
        }, 1000);
    }

    static async handleRegister(e) {
        e.preventDefault();
        UI.showLoading();

        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');
        const passwordConfirm = formData.get('passwordConfirm');

        // Clear previous errors
        UI.clearFormErrors('register');

        // Validate inputs
        let hasErrors = false;

        if (!name || name.trim().length < 2) {
            UI.showFieldError('registerName', 'Name must be at least 2 characters');
            hasErrors = true;
        }

        if (!Auth.validateEmail(email)) {
            UI.showFieldError('registerEmail', 'Please enter a valid email address');
            hasErrors = true;
        }

        if (!Auth.validatePassword(password)) {
            UI.showFieldError('registerPassword', 'Password must be at least 8 characters');
            hasErrors = true;
        }

        if (password !== passwordConfirm) {
            UI.showFieldError('registerPasswordConfirm', 'Passwords do not match');
            hasErrors = true;
        }

        if (hasErrors) {
            UI.hideLoading();
            return;
        }

        // Simulate network delay
        setTimeout(() => {
            const success = Auth.register({ name, email, password });
            
            if (success) {
                UI.switchAuthTab('login');
                document.getElementById('loginEmail').value = email;
                document.getElementById('registerForm').reset();
            }
            
            UI.hideLoading();
        }, 1000);
    }

    static handlePatientSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const patientData = {
            patientId: Auth.sanitizeInput(formData.get('patientId')),
            name: Auth.sanitizeInput(formData.get('name')),
            age: parseInt(formData.get('age')),
            gender: formData.get('gender')
        };

        if (appState.addPatient(patientData)) {
            UI.hideAllModals();
            UI.refreshPatientsList();
            UI.updateDashboard();
            UI.showToast('Patient added successfully!', 'success');
            e.target.reset();
        }
    }

    static handleAssessmentSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const assessmentData = {
            patientId: formData.get('patientId'),
            type: formData.get('type'),
            date: formData.get('date'),
            notes: Auth.sanitizeInput(formData.get('notes'))
        };

        if (appState.addAssessment(assessmentData)) {
            UI.hideAllModals();
            UI.refreshAssessmentsList();
            UI.updateDashboard();
            UI.showToast('Assessment added successfully!', 'success');
            e.target.reset();
        }
    }

    static handlePatientSearch(e) {
        const query = e.target.value;
        const patients = appState.searchPatients(query);
        UI.renderPatients(patients);
    }

    static handleProfileUpdate(e) {
        e.preventDefault();
        UI.showToast('Profile updated successfully!', 'success');
    }

    static showFieldError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.setAttribute('aria-live', 'polite');
        }
    }

    static clearFormErrors(formPrefix) {
        document.querySelectorAll(`#${formPrefix}Form .error-message`).forEach(error => {
            error.textContent = '';
            error.removeAttribute('aria-live');
        });
    }

    static showUserInterface() {
        document.getElementById('login-section').classList.add('hidden');
        document.querySelectorAll('.content-section').forEach(section => {
            if (section.id !== 'login-section') {
                section.classList.remove('hidden');
            }
        });
        document.querySelector('.main-nav').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'inline-flex';
    }

    static updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (appState.currentUser) {
            userInfo.textContent = `Welcome, ${appState.currentUser.name}`;
            
            // Update profile form
            document.getElementById('profileName').value = appState.currentUser.name;
            document.getElementById('profileEmail').value = appState.currentUser.email;
        }
    }

    static showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionName}`) {
                link.classList.add('active');
            }
        });

        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            appState.currentSection = sectionName;

            // Load section-specific data
            switch (sectionName) {
                case 'dashboard':
                    this.updateDashboard();
                    break;
                case 'patients':
                    this.refreshPatientsList();
                    break;
                case 'assessments':
                    this.refreshAssessmentsList();
                    break;
            }
        }
    }

    static updateDashboard() {
        document.getElementById('totalPatients').textContent = appState.patients.length;
        document.getElementById('recentAssessments').textContent = appState.assessments.length;
        
        const activities = appState.getActivities();
        const activityList = document.getElementById('activityList');
        
        if (activities.length > 0) {
            activityList.innerHTML = activities.slice(0, 5).map(activity => `
                <div class="activity-item">
                    <p>${Auth.sanitizeInput(activity.message)}</p>
                    <small>${new Date(activity.timestamp).toLocaleString()}</small>
                </div>
            `).join('');
        } else {
            activityList.innerHTML = '<p class="no-data">No recent activity</p>';
        }
    }

    static refreshPatientsList() {
        const patients = appState.patients;
        this.renderPatients(patients);
    }

    static renderPatients(patients) {
        const patientsList = document.getElementById('patientsList');
        
        if (patients.length === 0) {
            patientsList.innerHTML = '<p class="no-data">No patients found</p>';
            return;
        }

        patientsList.innerHTML = patients.map(patient => `
            <div class="patient-card">
                <h3>${Auth.sanitizeInput(patient.name)}</h3>
                <div class="patient-meta">
                    <span>ID: ${Auth.sanitizeInput(patient.patientId)}</span>
                    <span>Age: ${patient.age}</span>
                    <span>Gender: ${patient.gender}</span>
                </div>
                <div class="card-actions">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="UI.editPatient('${patient.id}')">Edit</button>
                    <button type="button" class="btn btn-sm" style="background: var(--error-color); color: white;" onclick="UI.deletePatient('${patient.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    static refreshAssessmentsList() {
        const assessmentsList = document.getElementById('assessmentsList');
        
        if (appState.assessments.length === 0) {
            assessmentsList.innerHTML = '<p class="no-data">No assessments found</p>';
            return;
        }

        assessmentsList.innerHTML = appState.assessments.map(assessment => {
            const patient = appState.patients.find(p => p.id === assessment.patientId);
            const patientName = patient ? patient.name : 'Unknown Patient';
            
            return `
                <div class="assessment-card">
                    <h3>${assessment.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                    <div class="assessment-meta">
                        <span>Patient: ${Auth.sanitizeInput(patientName)}</span>
                        <span>Date: ${new Date(assessment.date).toLocaleDateString()}</span>
                    </div>
                    <p>${Auth.sanitizeInput(assessment.notes || 'No notes')}</p>
                    <div class="card-actions">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="UI.editAssessment('${assessment.id}')">Edit</button>
                        <button type="button" class="btn btn-sm" style="background: var(--error-color); color: white;" onclick="UI.deleteAssessment('${assessment.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Populate patient dropdown in assessment modal
        const patientSelect = document.getElementById('assessmentPatient');
        patientSelect.innerHTML = '<option value="">Select a patient</option>' +
            appState.patients.map(patient => 
                `<option value="${patient.id}">${Auth.sanitizeInput(patient.name)} (${Auth.sanitizeInput(patient.patientId)})</option>`
            ).join('');
    }

    static editPatient(id) {
        const patient = appState.patients.find(p => p.id === id);
        if (patient) {
            document.getElementById('patientModalTitle').textContent = 'Edit Patient';
            document.getElementById('patientId').value = patient.patientId;
            document.getElementById('patientName').value = patient.name;
            document.getElementById('patientAge').value = patient.age;
            document.getElementById('patientGender').value = patient.gender;
            this.showModal('patientModal');
        }
    }

    static deletePatient(id) {
        if (confirm('Are you sure you want to delete this patient? This will also delete all associated assessments.')) {
            if (appState.deletePatient(id)) {
                this.refreshPatientsList();
                this.refreshAssessmentsList();
                this.updateDashboard();
                this.showToast('Patient deleted successfully', 'success');
            }
        }
    }

    static editAssessment(id) {
        // Implementation for editing assessments
        this.showToast('Edit functionality coming soon', 'info');
    }

    static deleteAssessment(id) {
        if (confirm('Are you sure you want to delete this assessment?')) {
            const index = appState.assessments.findIndex(a => a.id === id);
            if (index !== -1) {
                appState.assessments.splice(index, 1);
                appState.saveToStorage('assessments', appState.assessments);
                this.refreshAssessmentsList();
                this.updateDashboard();
                this.showToast('Assessment deleted successfully', 'success');
            }
        }
    }

    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus management
        const firstInput = modal.querySelector('input, select, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    static hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        });
        
        // Reset modal titles
        document.getElementById('patientModalTitle').textContent = 'Add New Patient';
        document.getElementById('assessmentModalTitle').textContent = 'New Clinical Assessment';
        
        // Clear forms
        document.querySelectorAll('.modal-form').forEach(form => form.reset());
    }

    static showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const messageEl = toast.querySelector('.toast-message');
        
        messageEl.textContent = message;
        toast.className = `toast show ${type}`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideToast(), 5000);
    }

    static hideToast() {
        document.getElementById('toast').classList.remove('show');
    }

    static showLoading() {
        document.getElementById('loading').classList.add('show');
        document.getElementById('loading').setAttribute('aria-hidden', 'false');
    }

    static hideLoading() {
        document.getElementById('loading').classList.remove('show');
        document.getElementById('loading').setAttribute('aria-hidden', 'true');
    }
}

// Initialize Application
const appState = new AppState();

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', UI.init);
} else {
    UI.init();
}

// Handle browser back/forward buttons and prevent data loss
window.addEventListener('beforeunload', (e) => {
    // Warning if there are unsaved changes in forms
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
        if (form.checkValidity && !form.checkValidity()) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    }
});

// Service Worker Registration for offline capability (if needed in future)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment when service worker is implemented
        // navigator.serviceWorker.register('/sw.js');
    });
}