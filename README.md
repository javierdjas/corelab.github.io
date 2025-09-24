# CoreLab - Clinical Data Management System

A secure, robust, and simple clinical data management website inspired by the clinical2020 projects, but prioritizing safety, simplicity, and robustness.

![CoreLab Screenshot](https://github.com/user-attachments/assets/e5869683-600e-40ca-8edb-37a13ea9ab75)

## 🌟 Features

### Security & Safety
- **Content Security Policy (CSP)** implementation to prevent XSS attacks
- **Input sanitization** for all user data to prevent injection attacks
- **Client-side validation** with server-side validation patterns
- **Secure password handling** with proper hashing (demo implementation)
- **Session management** with secure local storage practices

### User Experience
- **Responsive design** with mobile-first approach
- **Accessibility features** including ARIA labels, keyboard navigation, and screen reader support
- **Modern UI** with clean, professional design using CSS Grid and Flexbox
- **Toast notifications** for user feedback
- **Loading states** and error handling for better UX
- **Skip to content** link for accessibility

### Clinical Data Management
- **Patient Management**: Create, read, update, and delete patient records
- **Clinical Assessments**: Multiple assessment types (Physical Exam, Vital Signs, Blood Work, Medical Imaging)
- **Dashboard**: Overview statistics and recent activity tracking
- **Search functionality** for quick patient lookup
- **Data validation** to ensure data integrity
- **Activity logging** for audit trails

### Technical Features
- **Local data storage** with error handling and data persistence
- **Modular JavaScript** architecture with proper class structure
- **Progressive enhancement** - works without JavaScript for basic functionality
- **Print-friendly** styles for generating reports
- **High contrast mode** support for accessibility
- **Reduced motion** support for users with vestibular disorders

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server setup required - works as static files

### Installation
1. Clone or download this repository
2. Open `index.html` in a web browser
3. Start using the application immediately

### First Time Setup
1. Click "Register" to create a new account
2. Fill in your details (use demo data for testing)
3. Login with your credentials
4. Start adding patients and assessments

## 📖 Usage Guide

### Registration & Login
- Register with a valid email format and password (minimum 8 characters)
- Login credentials are stored locally in your browser
- Use demo/fake data for testing purposes

### Patient Management
1. Navigate to the "Patients" section
2. Click "Add New Patient" to create a patient record
3. Fill in required fields: Patient ID (alphanumeric + hyphens), Name, Age, Gender
4. Use the search bar to quickly find patients
5. Edit or delete patients using the action buttons

### Clinical Assessments
1. Go to the "Assessments" section
2. Click "New Assessment" to create an assessment
3. Select a patient, assessment type, date, and add notes
4. View all assessments with patient details
5. Edit or delete assessments as needed

### Dashboard
- View total patient count and recent assessments
- Monitor recent activity log
- Check data quality metrics

## 🔧 Technical Architecture

### File Structure
```
corelab.github.io/
├── index.html          # Main HTML structure
├── styles.css          # Comprehensive CSS with responsive design
├── script.js           # JavaScript application logic
├── README.md           # Documentation
└── .gitignore         # Git ignore rules
```

### Key Design Principles
1. **Security First**: All inputs are validated and sanitized
2. **Accessibility**: WCAG guidelines followed throughout
3. **Simplicity**: Clean, intuitive interface without unnecessary complexity
4. **Robustness**: Comprehensive error handling and data validation
5. **Responsiveness**: Works seamlessly across all device sizes

### Data Storage
- **Local Storage**: Patient data, assessments, and user sessions
- **Error Handling**: Graceful degradation when storage is unavailable
- **Data Validation**: Both client-side and structured validation
- **Activity Logging**: Audit trail for all user actions

## 🛡️ Security Features

### Client-Side Security
- Content Security Policy (CSP) headers
- Input sanitization for XSS prevention
- Password hashing (demo implementation)
- Session validation and timeout handling

### Data Protection
- No sensitive data transmitted over network
- Local storage encryption considerations
- Input validation to prevent malicious data
- Proper error handling to avoid information disclosure

## 🌐 Browser Compatibility

- **Chrome**: ✅ Fully supported
- **Firefox**: ✅ Fully supported  
- **Safari**: ✅ Fully supported
- **Edge**: ✅ Fully supported
- **Mobile browsers**: ✅ Responsive design tested

## 🎨 Customization

### Styling
- CSS custom properties for easy theming
- Modular CSS architecture
- Print-friendly styles included
- High contrast and reduced motion support

### Functionality
- Modular JavaScript classes for easy extension
- Event-driven architecture
- Configurable validation rules
- Extensible assessment types

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Tablet Support**: Adapted layouts for medium screens
- **Desktop Enhancement**: Full features on large screens
- **Touch Friendly**: Appropriate touch targets and interactions

## ♿ Accessibility

- **ARIA Labels**: Comprehensive labeling for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus indicators and management
- **Color Contrast**: WCAG AA compliant color combinations
- **Skip Links**: Quick navigation for assistive technologies

## 🔍 Testing

### Manual Testing
1. Register and login functionality
2. Patient CRUD operations
3. Assessment creation and management
4. Search functionality
5. Responsive design across devices
6. Accessibility with keyboard navigation

### Browser Testing
- Test in multiple browsers
- Verify responsive breakpoints
- Check accessibility features
- Validate form submissions

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch (usually `main`)
4. Access via `https://yourusername.github.io/repository-name`

### Static Hosting
- Can be deployed to any static hosting service
- No server-side requirements
- Works with Netlify, Vercel, AWS S3, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request with detailed description

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆚 Comparison with Reference Projects

### Improvements over clinical2020client/api:
- **Enhanced Security**: CSP, input sanitization, better validation
- **Better UX**: Modern design, accessibility features, responsive layout
- **Simplified Architecture**: No backend complexity, works offline
- **Robust Error Handling**: Comprehensive validation and user feedback
- **Accessibility**: WCAG compliance, keyboard navigation, screen reader support
- **Maintainability**: Clean, modular code structure

### Retained Features:
- Patient management functionality
- Clinical assessment forms
- Dashboard overview
- User authentication
- Data persistence

## 🔮 Future Enhancements

- **Offline Support**: Service Worker implementation
- **Data Export**: CSV/PDF export functionality
- **Advanced Search**: Filtering and sorting options
- **Audit Logging**: Enhanced activity tracking
- **Multi-language Support**: Internationalization
- **Advanced Assessments**: Custom form builder
- **Data Backup**: Cloud storage integration options

## 📞 Support

For questions or support, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for healthcare professionals who need secure, simple, and robust clinical data management.**