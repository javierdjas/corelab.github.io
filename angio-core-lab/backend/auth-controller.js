const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
    constructor(db) {
        this.db = db;
        this.jwtSecret = process.env.JWT_SECRET || 'angio-lab-secret-key-2024';
        this.jwtExpiry = '24h';
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await this.db.getUserByEmail(email);
            if (!user) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            // Update last login
            await this.db.updateLastLogin(user.id);

            // Generate token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                this.jwtSecret,
                { expiresIn: this.jwtExpiry }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });

        } catch (error) {
            res.status(500).json({
                error: 'Login failed',
                message: error.message
            });
        }
    }

    async register(req, res) {
        try {
            const { email, password, name, role } = req.body;

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const user = await this.db.createUser({
                email,
                password: hashedPassword,
                name,
                role
            });

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });

        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                return res.status(409).json({
                    error: 'Email already exists'
                });
            }

            res.status(500).json({
                error: 'Registration failed',
                message: error.message
            });
        }
    }

    async requireAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    error: 'Access token required'
                });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, this.jwtSecret);

            // Verify user still exists and is active
            const user = await this.db.getUserById(decoded.id);
            if (!user) {
                return res.status(401).json({
                    error: 'User not found or inactive'
                });
            }

            req.user = user;
            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Invalid token'
                });
            }

            res.status(500).json({
                error: 'Authentication failed',
                message: error.message
            });
        }
    }

    requireRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    error: 'Insufficient permissions'
                });
            }

            next();
        };
    }
}

module.exports = AuthController;