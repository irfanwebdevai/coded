const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
};

// Middleware to redirect if already authenticated
const redirectIfAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    next();
};

// GET - Sign up page
router.get('/signup', redirectIfAuthenticated, (req, res) => {
    res.render('auth/signup', { 
        title: 'Sign Up - Codedx',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// POST - Sign up
router.post('/signup', redirectIfAuthenticated, async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            req.flash('error', 'All fields are required');
            return res.redirect('/auth/signup');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/auth/signup');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long');
            return res.redirect('/auth/signup');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            req.flash('error', 'An account with this email already exists. Please use a different email or login instead.');
            return res.redirect('/auth/signup');
        }

        // Create new user
        console.log('Creating new user with data:', { name, email: email.toLowerCase(), provider: 'local' });
        
        const newUser = new User({
            name,
            email: email.toLowerCase(),
            password,
            provider: 'local'
        });

        console.log('About to save user to database...');
        const savedUser = await newUser.save();
        console.log('User saved successfully:', savedUser._id);

        req.flash('success', 'Account created successfully! Please log in.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Signup error:', error);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/auth/signup');
    }
});

// GET - Login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('auth/login', { 
        title: 'Login - Codedx',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// POST - Login
router.post('/login', redirectIfAuthenticated, passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true
}));

// GET - Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// GET - Google OAuth callback
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// GET - GitHub OAuth
router.get('/github', passport.authenticate('github', {
    scope: ['user:email']
}));

// GET - GitHub OAuth callback
router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/auth/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// GET - Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        req.flash('success', 'You have been logged out successfully');
        res.redirect('/');
    });
});

// GET - Dashboard (protected route)
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const progressStats = req.user.getProgressStats();
        res.render('auth/dashboard', {
            title: 'Dashboard - Codedx',
            user: req.user,
            isAuthenticated: true,
            progress: progressStats,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        req.flash('error', 'Error loading dashboard data');
        res.redirect('/');
    }
});

// Test route to check database connection and users
router.get('/test-db', async (req, res) => {
    try {
        console.log('Testing database connection...');
        
        // Count users
        const userCount = await User.countDocuments();
        console.log('Total users in database:', userCount);
        
        // Get all users (for debugging)
        const users = await User.find().limit(10);
        console.log('Users found:', users);
        
        res.json({
            success: true,
            userCount,
            users: users.map(u => ({ id: u._id, name: u.name, email: u.email, provider: u.provider, createdAt: u.createdAt }))
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Admin route to view all users in browser
router.get('/admin', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const users = await User.find().sort({ createdAt: -1 }).limit(50);
        
        res.render('admin', {
            title: 'Admin - Database Users',
            userCount,
            users
        });
    } catch (error) {
        console.error('Admin route error:', error);
        res.render('admin', {
            title: 'Admin - Database Error',
            userCount: 0,
            users: [],
            error: error.message
        });
    }
});

module.exports = router; 