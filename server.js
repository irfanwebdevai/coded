const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const flash = require('connect-flash');
const connectDB = require('./config/database');
const User = require('./models/User');

const app = express();
const port = process.env.PORT || 3000;

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// Body parsing middleware with size limits
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Static files with caching
app.use(express.static('public', {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// Enhanced session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://irfan:504200@cluster0.zu2ptmv.mongodb.net/codedx?retryWrites=true&w=majority&appName=Cluster0',
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict'
    },
    name: 'codedx.sid' // Change default session name
}));

// Flash messages
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`[${timestamp}] ${method} ${url} - ${ip}`);
    next();
});

// Global variables for templates with performance optimization
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.currentYear = new Date().getFullYear();
    res.locals.appName = 'Codedx';
    next();
});

// Authentication middleware with better error handling
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    
    // Store the original URL for redirect after login
    req.session.returnTo = req.originalUrl;
    
    req.flash('error', 'You must be logged in to access this page. Please sign up or log in to continue your coding journey!');
    
    // Return JSON for API requests
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({ 
            error: 'Authentication required',
            redirect: '/auth/login'
        });
    }
    
    res.redirect('/auth/login');
};

// Rate limiting for API endpoints
const rateLimit = (windowMs, max) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!requests.has(key)) {
            requests.set(key, []);
        }
        
        const userRequests = requests.get(key);
        const validRequests = userRequests.filter(time => time > windowStart);
        
        if (validRequests.length >= max) {
            return res.status(429).json({ 
                error: 'Too many requests',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        validRequests.push(now);
        requests.set(key, validRequests);
        
        // Clean up old entries periodically
        if (Math.random() < 0.01) {
            for (const [ip, times] of requests.entries()) {
                const validTimes = times.filter(time => time > windowStart);
                if (validTimes.length === 0) {
                    requests.delete(ip);
                } else {
                    requests.set(ip, validTimes);
                }
            }
        }
        
        next();
    };
};

// Apply rate limiting to API routes
app.use('/api/', rateLimit(60000, 100)); // 100 requests per minute
app.use('/api/progress/', rateLimit(60000, 30)); // 30 requests per minute for progress

// Routes with enhanced error handling
app.get('/', (req, res) => {
    try {
        res.render('index', { 
            title: 'Codedx - Master the Art of Code',
            error: req.flash('error'),
            success: req.flash('success'),
            user: req.user || null,
            isAuthenticated: req.isAuthenticated()
        });
    } catch (error) {
        console.error('Error rendering home page:', error);
        res.status(500).render('error', {
            title: 'Server Error - Codedx',
            message: 'Unable to load the home page. Please try again.'
        });
    }
});

// Courses Overview Route
app.get('/courses', (req, res) => {
    res.redirect('/courses/python');
});

// Python Course Route - Require authentication
app.get('/courses/python', requireAuth, async (req, res) => {
    try {
        const progressStats = req.user.getProgressStats();
        res.render('python-course', {
            title: 'Python Course - Codedx',
            user: req.user,
            isAuthenticated: true,
            error: req.flash('error'),
            success: req.flash('success'),
            progress: progressStats
        });
    } catch (error) {
        console.error('Error loading Python course:', error);
        req.flash('error', 'Error loading course data');
        res.redirect('/dashboard');
    }
});

// Python Lesson Route - Enhanced with authentication and progress tracking
app.get('/courses/python/lesson/:chapterNum/:lessonNum', requireAuth, async (req, res) => {
    const { chapterNum, lessonNum } = req.params;
    const chapter = parseInt(chapterNum);
    const lesson = parseInt(lessonNum);
    
    // Validate input parameters
    if (isNaN(chapter) || isNaN(lesson) || chapter < 1 || lesson < 1) {
        return res.status(400).render('error', { 
            title: 'Invalid Lesson - Codedx',
            message: 'Invalid lesson parameters provided.' 
        });
    }
    
    // Define chapter structure
    const chapterData = {
        1: { title: "Hello World & Setup", lessons: 5 },
        2: { title: "Variables & Data Types", lessons: 6 },
        3: { title: "Numbers & Math Operations", lessons: 5 },
        4: { title: "Strings & Text", lessons: 6 },
        5: { title: "Input & Output", lessons: 4 },
        6: { title: "Conditions & If Statements", lessons: 7 },
        7: { title: "Loops & Repetition", lessons: 6 },
        8: { title: "Lists & Collections", lessons: 5 },
        9: { title: "Functions & Code Reuse", lessons: 6 },
        10: { title: "Final Project & Certificate", lessons: 1 }
    };
    
    // Validate chapter and lesson numbers
    if (!chapterData[chapter] || lesson > chapterData[chapter].lessons) {
        return res.status(404).render('error', { 
            title: 'Lesson Not Found - Codedx',
            message: 'The requested lesson does not exist.' 
        });
    }
    
    try {
        const progressStats = req.user.getProgressStats();
        
        // Check if lesson is completed
        const isCompleted = req.user.progress && 
                           req.user.progress.courses && 
                           req.user.progress.courses.python && 
                           req.user.progress.courses.python.completedLessons &&
                           req.user.progress.courses.python.completedLessons.some(
                               l => l.chapter === chapter && l.lesson === lesson
                           );
        
        res.render('python-lesson', {
            title: `Python Chapter ${chapter}.${lesson} - Codedx`,
            user: req.user,
            isAuthenticated: true,
            chapterNum: chapter,
            lessonNum: lesson,
            chapterTitle: chapterData[chapter].title,
            totalLessons: chapterData[chapter].lessons,
            progress: progressStats,
            isLessonCompleted: isCompleted,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Error loading lesson:', error);
        req.flash('error', 'Error loading lesson data');
        res.redirect('/courses/python');
    }
});

// Enhanced progress tracking routes with validation
app.post('/api/progress/complete-lesson', requireAuth, async (req, res) => {
    try {
        const { chapter, lesson } = req.body;
        const chapterNum = parseInt(chapter);
        const lessonNum = parseInt(lesson);
        
        // Comprehensive validation
        if (!chapterNum || !lessonNum || isNaN(chapterNum) || isNaN(lessonNum)) {
            return res.status(400).json({ 
                error: 'Invalid chapter or lesson number',
                details: 'Chapter and lesson must be valid numbers'
            });
        }
        
        if (chapterNum < 1 || chapterNum > 10 || lessonNum < 1) {
            return res.status(400).json({ 
                error: 'Chapter or lesson out of range',
                details: 'Chapter must be 1-10, lesson must be positive'
            });
        }
        
        // Validate lesson exists
        const chapterLessons = {
            1: 5, 2: 6, 3: 5, 4: 6, 5: 4,
            6: 7, 7: 6, 8: 5, 9: 6, 10: 1
        };
        
        if (lessonNum > chapterLessons[chapterNum]) {
            return res.status(400).json({ 
                error: 'Lesson does not exist',
                details: `Chapter ${chapterNum} only has ${chapterLessons[chapterNum]} lessons`
            });
        }
        
        await req.user.completeLesson(chapterNum, lessonNum);
        const progressStats = req.user.getProgressStats();
        
        res.json({ 
            success: true, 
            message: 'Lesson completed! 🎉',
            progress: progressStats,
            xpEarned: 10 + (chapterNum * 2),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error completing lesson:', error);
        res.status(500).json({ 
            error: 'Failed to update progress',
            details: 'Internal server error'
        });
    }
});

app.get('/api/progress/stats', requireAuth, async (req, res) => {
    try {
        const progressStats = req.user.getProgressStats();
        res.json({
            ...progressStats,
            timestamp: new Date().toISOString(),
            userId: req.user._id
        });
    } catch (error) {
        console.error('Error getting progress stats:', error);
        res.status(500).json({ 
            error: 'Failed to get progress stats',
            details: 'Internal server error'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
    });
});

// Auth routes
app.use('/auth', require('./routes/auth'));

// Protected dashboard redirect with return URL handling
app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/auth/dashboard');
    } else {
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/login');
    }
});

// Enhanced route handlers with error handling
const createRouteHandler = (templateName, pageTitle) => {
    return (req, res) => {
        try {
            res.render(templateName, { 
                title: `${pageTitle} - Codedx`,
                error: req.flash('error'),
                success: req.flash('success'),
                user: req.user || null,
                isAuthenticated: req.isAuthenticated()
            });
        } catch (error) {
            console.error(`Error rendering ${pageTitle}:`, error);
            res.status(500).render('error', {
                title: 'Server Error - Codedx',
                message: `Unable to load ${pageTitle}. Please try again.`
            });
        }
    };
};

app.get('/learn', createRouteHandler('index', 'Learn'));
app.get('/practice', createRouteHandler('index', 'Practice'));
app.get('/build', createRouteHandler('index', 'Build'));
app.get('/community', createRouteHandler('index', 'Community'));
app.get('/pricing', createRouteHandler('index', 'Pricing'));

// 404 Handler with better UX
app.use((req, res, next) => {
    console.log(`404 - Page not found: ${req.method} ${req.url} - IP: ${req.ip}`);
    res.status(404).render('error', { 
        title: 'Page Not Found - Codedx',
        message: `The page "${req.url}" you are looking for does not exist. It might have been moved, deleted, or you entered the wrong URL.`
    });
});

// Enhanced error handler with detailed logging
app.use((err, req, res, next) => {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    console.error(`[ERROR ${errorId}] ${err.stack}`);
    console.error(`[ERROR ${errorId}] Request: ${req.method} ${req.url}`);
    console.error(`[ERROR ${errorId}] User: ${req.user ? req.user.email : 'Anonymous'}`);
    console.error(`[ERROR ${errorId}] IP: ${req.ip}`);
    console.error(`[ERROR ${errorId}] User-Agent: ${req.get('User-Agent')}`);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        res.status(500).json({
            error: 'Internal server error',
            errorId: errorId,
            ...(isDevelopment && { details: err.message, stack: err.stack })
        });
    } else {
        res.status(500).render('error', { 
            title: 'Server Error - Codedx',
            message: isDevelopment 
                ? `Server error (ID: ${errorId}): ${err.message}`
                : 'Something went wrong on our end. Please try again later.'
        });
    }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// For Vercel deployment, export the app instead of listening
if (process.env.NODE_ENV !== 'production') {
    const server = app.listen(port, () => {
        console.log(`🚀 Codedx Server running at http://localhost:${port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔐 Authentication system ready!`);
        console.log(`📝 Sign up: http://localhost:${port}/auth/signup`);
        console.log(`🔑 Login: http://localhost:${port}/auth/login`);
        console.log(`💾 Database: Connected to MongoDB`);
        console.log(`⚡ Server PID: ${process.pid}`);
    });
} else {
    console.log('🚀 Codedx Platform ready for Vercel deployment');
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`💾 Database: MongoDB connection configured`);
}

// Export for Vercel
module.exports = app; 