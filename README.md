# CoreLab Authentication System

A role-based authentication web application with different access levels for administrators and analysts.

## Features

### Authentication System
- **Role-based access control** with two user levels:
  - **Admin**: Full system access with administrative privileges
  - **Analyst**: Limited access focused on data analysis and reporting
- **Session persistence** using localStorage
- **Secure login** with input validation and error handling
- **Automatic logout** functionality

### User Roles & Permissions

#### Admin Dashboard
Administrators have access to:
- **User Management**: Manage system users and their permissions
- **System Settings**: Configure system-wide settings and preferences  
- **Analytics Reports**: View comprehensive system analytics and reports
- **Data Management**: Manage and oversee all data operations

#### Analyst Dashboard
Analysts have access to:
- **Data Analysis**: Perform data analysis and create insights
- **Generate Reports**: Create and export analytical reports
- **View Dashboards**: Access pre-built analytical dashboards
- **Data Visualization**: Create charts and visualizations

## Demo Credentials

For testing purposes, use these credentials:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Analyst | `analyst` | `analyst123` |

## Technical Implementation

### Frontend
- **HTML5** with semantic structure
- **CSS3** with responsive design and modern styling
- **Vanilla JavaScript** for authentication logic and UI interactions

### Security Features
- Client-side input validation
- Role-based access control (RBAC)
- Session management with localStorage
- Secure logout functionality
- Error handling for invalid credentials

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile and desktop
- Progressive enhancement approach

## File Structure

```
/
├── index.html          # Main application structure
├── styles.css          # Application styling
├── auth.js            # Authentication logic and role management
└── README.md          # This documentation
```

## Getting Started

1. Clone the repository
2. Open `index.html` in a web browser or serve via HTTP server
3. Use the demo credentials above to test different user roles
4. Explore the role-specific dashboards and features

## Development

To run locally with a development server:

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have http-server installed)
http-server
```

Then visit `http://localhost:8000` in your browser.

## Future Enhancements

- Backend integration for real authentication
- Database connectivity for user management
- Enhanced security with JWT tokens
- Additional user roles and permissions
- Password reset functionality
- User profile management