// ===================================
// OAuth Backend API Example
// Node.js/Express implementation
// ===================================

/**
 * This is an example backend implementation for handling OAuth login.
 * You'll need to integrate this with your actual backend server.
 * 
 * Required packages:
 * npm install express jsonwebtoken axios dotenv
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// ===================================
// Environment Variables (add to .env)
// ===================================
// JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
// GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
// GOOGLE_CLIENT_SECRET=your-google-client-secret
// MICROSOFT_CLIENT_ID=your-microsoft-client-id
// MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

// ===================================
// Verify Google Access Token
// ===================================
async function verifyGoogleToken(accessToken) {
    try {
        const response = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );
        return response.data;
    } catch (error) {
        throw new Error('Invalid Google token');
    }
}

// ===================================
// Verify Microsoft Access Token
// ===================================
async function verifyMicrosoftToken(accessToken) {
    try {
        const response = await axios.get(
            'https://graph.microsoft.com/v1.0/me',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );
        return response.data;
    } catch (error) {
        throw new Error('Invalid Microsoft token');
    }
}

// ===================================
// OAuth Login Endpoint
// ===================================
router.post('/api/auth/oauth-login', async (req, res) => {
    try {
        const { provider, userInfo, accessToken, refreshToken } = req.body;

        // Validate input
        if (!provider || !userInfo || !accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Verify the access token with the OAuth provider
        let verifiedUserInfo;
        try {
            if (provider === 'google') {
                verifiedUserInfo = await verifyGoogleToken(accessToken);
            } else if (provider === 'microsoft') {
                verifiedUserInfo = await verifyMicrosoftToken(accessToken);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid provider'
                });
            }
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token verification failed'
            });
        }

        // Ensure the email matches
        const verifiedEmail = verifiedUserInfo.email ||
            verifiedUserInfo.mail ||
            verifiedUserInfo.userPrincipalName;

        if (verifiedEmail !== userInfo.email) {
            return res.status(401).json({
                success: false,
                message: 'Email mismatch'
            });
        }

        // TODO: Replace with your actual database logic
        // Example using MongoDB/Mongoose:
        /*
        const User = require('./models/User');
        
        let user = await User.findOne({ email: verifiedEmail });
        
        if (!user) {
            // Create new user
            user = await User.create({
                email: verifiedEmail,
                name: userInfo.name,
                authProvider: provider,
                providerId: userInfo.id,
                profilePicture: userInfo.picture,
                createdAt: new Date()
            });
        } else {
            // Update existing user
            user.lastLogin = new Date();
            if (refreshToken) {
                user.refreshToken = refreshToken; // Store encrypted in production
            }
            await user.save();
        }
        */

        // For demo purposes, create a mock user object
        const user = {
            id: userInfo.id,
            email: verifiedEmail,
            name: userInfo.name,
            provider: provider
        };

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                provider: provider
            },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            {
                expiresIn: '7d' // Token expires in 7 days
            }
        );

        // Send response
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                provider: provider
            }
        });

    } catch (error) {
        console.error('OAuth login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===================================
// Token Refresh Endpoint
// ===================================
router.post('/api/auth/refresh-token', async (req, res) => {
    try {
        const { provider, refreshToken } = req.body;

        if (!provider || !refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        let newAccessToken;

        if (provider === 'google') {
            // Refresh Google token
            const response = await axios.post(
                'https://oauth2.googleapis.com/token',
                {
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                }
            );
            newAccessToken = response.data.access_token;

        } else if (provider === 'microsoft') {
            // Refresh Microsoft token
            const response = await axios.post(
                'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                new URLSearchParams({
                    client_id: process.env.MICROSOFT_CLIENT_ID,
                    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                    scope: 'openid email profile User.Read'
                })
            );
            newAccessToken = response.data.access_token;
        }

        res.json({
            success: true,
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token'
        });
    }
});

// ===================================
// Verify JWT Middleware
// ===================================
function verifyJWT(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key-change-in-production'
        );
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
}

// ===================================
// Protected Route Example
// ===================================
router.get('/api/user/profile', verifyJWT, async (req, res) => {
    try {
        // TODO: Fetch user from database using req.user.userId
        // const user = await User.findById(req.user.userId);

        res.json({
            success: true,
            user: {
                id: req.user.userId,
                email: req.user.email,
                provider: req.user.provider
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile'
        });
    }
});

// ===================================
// Logout Endpoint
// ===================================
router.post('/api/auth/logout', verifyJWT, async (req, res) => {
    try {
        // TODO: Invalidate refresh token in database
        // await User.updateOne(
        //     { _id: req.user.userId },
        //     { $unset: { refreshToken: 1 } }
        // );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

module.exports = router;

// ===================================
// Usage in your main server file:
// ===================================
/*
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'https://mindwave2.onrender.com'],
    credentials: true
}));
app.use(express.json());

// Routes
app.use(authRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
*/
