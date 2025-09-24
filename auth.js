// Authentication system for CoreLab
class AuthSystem {
    constructor() {
        this.users = {
            'admin': {
                password: 'admin123',
                role: 'admin',
                fullName: 'Administrator'
            },
            'analyst': {
                password: 'analyst123',
                role: 'analyst',
                fullName: 'Data Analyst'
            }
        };
        
        this.currentUser = null;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkExistingSession();
    }
    
    bindEvents() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Logout buttons
        const adminLogout = document.getElementById('admin-logout');
        const analystLogout = document.getElementById('analyst-logout');
        
        adminLogout.addEventListener('click', () => this.logout());
        analystLogout.addEventListener('click', () => this.logout());
        
        // Feature buttons (demo functionality)
        this.bindFeatureButtons();
    }
    
    bindFeatureButtons() {
        const featureButtons = document.querySelectorAll('.feature-btn');
        featureButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const featureName = e.target.closest('.feature-card').querySelector('h3').textContent;
                this.showFeatureMessage(featureName);
            });
        });
    }
    
    showFeatureMessage(featureName) {
        alert(`${featureName} feature would be implemented here.\n\nThis is a demo of the ${this.currentUser.role} interface.`);
    }
    
    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (this.authenticate(username, password)) {
            this.showDashboard();
        } else {
            this.showError('Invalid username or password');
        }
    }
    
    authenticate(username, password) {
        const user = this.users[username];
        
        if (user && user.password === password) {
            this.currentUser = {
                username: username,
                role: user.role,
                fullName: user.fullName
            };
            
            // Save session
            localStorage.setItem('corelab_session', JSON.stringify(this.currentUser));
            return true;
        }
        
        return false;
    }
    
    showDashboard() {
        this.hideError();
        
        // Hide login section
        document.getElementById('login-section').classList.remove('active');
        
        // Show appropriate dashboard based on role
        if (this.currentUser.role === 'admin') {
            document.getElementById('admin-section').classList.add('active');
            document.getElementById('admin-username').textContent = this.currentUser.fullName;
        } else if (this.currentUser.role === 'analyst') {
            document.getElementById('analyst-section').classList.add('active');
            document.getElementById('analyst-username').textContent = this.currentUser.fullName;
        }
        
        // Clear login form
        document.getElementById('login-form').reset();
    }
    
    logout() {
        // Clear session
        localStorage.removeItem('corelab_session');
        this.currentUser = null;
        
        // Hide all dashboards
        document.getElementById('admin-section').classList.remove('active');
        document.getElementById('analyst-section').classList.remove('active');
        
        // Show login section
        document.getElementById('login-section').classList.add('active');
        
        this.hideError();
    }
    
    checkExistingSession() {
        const session = localStorage.getItem('corelab_session');
        
        if (session) {
            try {
                this.currentUser = JSON.parse(session);
                
                // Verify the session is still valid
                const user = this.users[this.currentUser.username];
                if (user && user.role === this.currentUser.role) {
                    this.showDashboard();
                } else {
                    // Invalid session, clear it
                    this.logout();
                }
            } catch (error) {
                // Invalid session data, clear it
                this.logout();
            }
        }
    }
    
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.className = 'error-message';
    }
    
    hideError() {
        const errorDiv = document.getElementById('error-message');
        errorDiv.className = 'error-hidden';
    }
    
    // Role-based access control
    hasPermission(requiredRole) {
        if (!this.currentUser) return false;
        
        const roleLevels = {
            'analyst': 1,
            'admin': 2
        };
        
        const userLevel = roleLevels[this.currentUser.role] || 0;
        const requiredLevel = roleLevels[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }
    
    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// Initialize the authentication system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});

// Utility functions for role-based features
function requireAuth(callback, requiredRole = null) {
    if (!window.authSystem.isLoggedIn()) {
        alert('Please log in to access this feature.');
        return;
    }
    
    if (requiredRole && !window.authSystem.hasPermission(requiredRole)) {
        alert('You do not have permission to access this feature.');
        return;
    }
    
    callback();
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}