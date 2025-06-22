const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email address'
        }
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId && !this.githubId;
        }
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    avatar: {
        type: String,
        default: ''
    },
    googleId: {
        type: String,
        sparse: true
    },
    githubId: {
        type: String,
        sparse: true
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'github'],
        default: 'local'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    // Progress Tracking Fields
    progress: {
        // Overall user statistics
        totalXP: {
            type: Number,
            default: 0
        },
        level: {
            type: Number,
            default: 1
        },
        streak: {
            type: Number,
            default: 0
        },
        lastActivityDate: {
            type: Date,
            default: Date.now
        },
        
        // Course-specific progress
        courses: {
            python: {
                isStarted: {
                    type: Boolean,
                    default: false
                },
                isCompleted: {
                    type: Boolean,
                    default: false
                },
                currentChapter: {
                    type: Number,
                    default: 1
                },
                currentLesson: {
                    type: Number,
                    default: 1
                },
                completedLessons: [{
                    chapter: Number,
                    lesson: Number,
                    completedAt: {
                        type: Date,
                        default: Date.now
                    },
                    xpEarned: {
                        type: Number,
                        default: 10
                    }
                }],
                totalLessonsCompleted: {
                    type: Number,
                    default: 0
                },
                courseXP: {
                    type: Number,
                    default: 0
                },
                timeSpent: {
                    type: Number,
                    default: 0 // in minutes
                },
                startedAt: Date,
                completedAt: Date
            }
        },
        
        // Achievements
        achievements: [{
            id: String,
            name: String,
            description: String,
            icon: String,
            unlockedAt: {
                type: Date,
                default: Date.now
            },
            xpReward: {
                type: Number,
                default: 0
            }
        }],
        
        // Learning preferences
        preferences: {
            dailyGoal: {
                type: Number,
                default: 30 // minutes per day
            },
            reminderTime: String,
            difficulty: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced'],
                default: 'beginner'
            }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

// Ensure email uniqueness across all providers
userSchema.index({ email: 1 }, { unique: true, background: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Progress tracking methods
userSchema.methods.completeLesson = async function(chapter, lesson) {
    // Initialize progress if not exists
    if (!this.progress) {
        this.progress = {
            totalXP: 0,
            level: 1,
            streak: 0,
            lastActivityDate: new Date(),
            courses: { python: { completedLessons: [] } },
            achievements: [],
            preferences: {}
        };
    }
    
    if (!this.progress.courses) {
        this.progress.courses = { python: { completedLessons: [] } };
    }
    
    if (!this.progress.courses.python) {
        this.progress.courses.python = { completedLessons: [] };
    }

    const pythonProgress = this.progress.courses.python;
    
    // Check if lesson already completed
    const alreadyCompleted = pythonProgress.completedLessons.some(
        l => l.chapter === chapter && l.lesson === lesson
    );
    
    if (!alreadyCompleted) {
        // Add completed lesson
        const xpEarned = 10 + (chapter * 2); // More XP for advanced chapters
        pythonProgress.completedLessons.push({
            chapter,
            lesson,
            completedAt: new Date(),
            xpEarned
        });
        
        // Update progress stats
        pythonProgress.totalLessonsCompleted = (pythonProgress.totalLessonsCompleted || 0) + 1;
        pythonProgress.courseXP = (pythonProgress.courseXP || 0) + xpEarned;
        this.progress.totalXP += xpEarned;
        
        // Update current position
        pythonProgress.currentChapter = chapter;
        pythonProgress.currentLesson = lesson + 1;
        
        // Mark as started
        pythonProgress.isStarted = true;
        if (!pythonProgress.startedAt) {
            pythonProgress.startedAt = new Date();
        }
        
        // Update activity
        this.progress.lastActivityDate = new Date();
        
        // Calculate level (every 100 XP = 1 level)
        this.progress.level = Math.floor(this.progress.totalXP / 100) + 1;
        
        // Check for achievements
        await this.checkAchievements();
    }
    
    return this.save();
};

userSchema.methods.checkAchievements = async function() {
    const achievements = [
        {
            id: 'first_lesson',
            name: 'First Steps',
            description: 'Complete your first lesson',
            icon: '🎯',
            condition: () => this.progress.courses.python.totalLessonsCompleted >= 1,
            xpReward: 25
        },
        {
            id: 'chapter_1_complete',
            name: 'Hello World Master',
            description: 'Complete Chapter 1',
            icon: '🌟',
            condition: () => this.progress.courses.python.completedLessons.filter(l => l.chapter === 1).length >= 5,
            xpReward: 50
        },
        {
            id: 'streak_7',
            name: 'Week Warrior',
            description: 'Maintain a 7-day learning streak',
            icon: '🔥',
            condition: () => this.progress.streak >= 7,
            xpReward: 100
        },
        {
            id: 'level_5',
            name: 'Rising Coder',
            description: 'Reach Level 5',
            icon: '⭐',
            condition: () => this.progress.level >= 5,
            xpReward: 150
        }
    ];
    
    for (const achievement of achievements) {
        const hasAchievement = this.progress.achievements.some(a => a.id === achievement.id);
        if (!hasAchievement && achievement.condition()) {
            this.progress.achievements.push({
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                unlockedAt: new Date(),
                xpReward: achievement.xpReward
            });
            this.progress.totalXP += achievement.xpReward;
        }
    }
};

userSchema.methods.getProgressStats = function() {
    if (!this.progress || !this.progress.courses || !this.progress.courses.python) {
        return {
            totalXP: 0,
            level: 1,
            completedLessons: 0,
            totalLessons: 51, // Total lessons across all chapters
            progressPercentage: 0,
            currentChapter: 1,
            currentLesson: 1,
            achievements: [],
            isStarted: false
        };
    }
    
    const pythonProgress = this.progress.courses.python;
    const totalLessons = 51; // 5+6+5+6+4+7+6+5+6+1 = 51 total lessons
    const completedCount = pythonProgress.totalLessonsCompleted || 0;
    
    return {
        totalXP: this.progress.totalXP || 0,
        level: this.progress.level || 1,
        completedLessons: completedCount,
        totalLessons,
        progressPercentage: Math.round((completedCount / totalLessons) * 100),
        currentChapter: pythonProgress.currentChapter || 1,
        currentLesson: pythonProgress.currentLesson || 1,
        achievements: this.progress.achievements || [],
        isStarted: pythonProgress.isStarted || false,
        courseXP: pythonProgress.courseXP || 0,
        streak: this.progress.streak || 0
    };
};

// Static method to find or create user for OAuth
userSchema.statics.findOrCreate = async function(profile, provider) {
    // First check by provider ID
    let user = await this.findOne({ [`${provider}Id`]: profile.id });
    
    if (user) {
        // Update user info if found by provider ID
        user.lastLogin = new Date();
        if (profile.avatar && !user.avatar) {
            user.avatar = profile.avatar;
        }
        await user.save();
        return user;
    }
    
    // Then check by email
    user = await this.findOne({ email: profile.email.toLowerCase() });
    
    if (user) {
        // If email exists but no provider ID, link the accounts
        if (!user[`${provider}Id`]) {
            user[`${provider}Id`] = profile.id;
            user.lastLogin = new Date();
            if (profile.avatar && !user.avatar) {
                user.avatar = profile.avatar;
            }
            await user.save();
            return user;
        }
    }

    // Create new user only if email doesn't exist
    try {
        user = new this({
            email: profile.email.toLowerCase(),
            name: profile.name,
            avatar: profile.avatar || '',
            [`${provider}Id`]: profile.id,
            provider: provider,
            isVerified: true // OAuth users are considered verified
        });

        await user.save();
        return user;
    } catch (error) {
        // If email already exists (duplicate key error), find and link
        if (error.code === 11000) {
            user = await this.findOne({ email: profile.email.toLowerCase() });
            if (user && !user[`${provider}Id`]) {
                user[`${provider}Id`] = profile.id;
                user.lastLogin = new Date();
                await user.save();
                return user;
            }
        }
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema); 