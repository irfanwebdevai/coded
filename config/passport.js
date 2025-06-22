const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const userProfile = {
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos[0].value
        };

        const user = await User.findOrCreate(userProfile, 'google');
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'your-github-client-id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret',
    callbackURL: '/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const userProfile = {
            id: profile.id,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.local`,
            name: profile.displayName || profile.username,
            avatar: profile.photos[0].value
        };

        const user = await User.findOrCreate(userProfile, 'github');
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

module.exports = passport; 