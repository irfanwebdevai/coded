const mongoose = require('mongoose');
const moment = require('moment');
const nodemailer = require('nodemailer');

class UserEngagement {
  constructor(logger) {
    this.logger = logger;
    this.isInitialized = false;
    this.engagementHistory = [];
    this.engagementRules = {
      welcome: {
        trigger: 'registration',
        delay: 0, // Immediate
        template: 'welcome',
        channels: ['email']
      },
      firstLesson: {
        trigger: 'lesson_completed',
        conditions: { lessonNumber: 1 },
        delay: 0,
        template: 'first_lesson',
        channels: ['email', 'in_app']
      },
      streakReminder: {
        trigger: 'daily_check',
        conditions: { daysInactive: 3 },
        delay: 0,
        template: 'streak_reminder',
        channels: ['email', 'push']
      },
      achievement: {
        trigger: 'achievement_unlocked',
        delay: 0,
        template: 'achievement',
        channels: ['email', 'in_app', 'push']
      },
      weeklyProgress: {
        trigger: 'weekly_summary',
        delay: 0,
        template: 'weekly_progress',
        channels: ['email']
      },
      courseCompletion: {
        trigger: 'course_completed',
        delay: 0,
        template: 'course_completion',
        channels: ['email', 'in_app']
      }
    };
  }

  async initialize() {
    try {
      // Load engagement history
      await this.loadEngagementHistory();
      
      // Initialize notification templates
      await this.initializeTemplates();
      
      this.isInitialized = true;
      this.logger.info('UserEngagement module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize UserEngagement module:', error);
      throw error;
    }
  }

  async initializeTemplates() {
    this.templates = {
      welcome: {
        subject: 'Welcome to Codedx - Start Your Coding Journey!',
        html: `
          <h1>Welcome to Codedx! 🚀</h1>
          <p>Hi {{user.name}},</p>
          <p>Welcome to your coding adventure! You're about to embark on an exciting journey to master the art of code.</p>
          <p>Here's what you can do to get started:</p>
          <ul>
            <li>Complete your first lesson</li>
            <li>Earn XP and level up</li>
            <li>Unlock achievements</li>
            <li>Join the community</li>
          </ul>
          <p>Ready to start? <a href="{{appUrl}}/courses/python">Begin your first lesson</a></p>
          <p>Happy coding!</p>
          <p>The Codedx Team</p>
        `,
        text: `
Welcome to Codedx!

Hi {{user.name}},

Welcome to your coding adventure! You're about to embark on an exciting journey to master the art of code.

Here's what you can do to get started:
- Complete your first lesson
- Earn XP and level up
- Unlock achievements
- Join the community

Ready to start? Visit: {{appUrl}}/courses/python

Happy coding!
The Codedx Team
        `
      },
      first_lesson: {
        subject: '🎉 Congratulations! You Completed Your First Lesson',
        html: `
          <h1>🎉 Congratulations!</h1>
          <p>Hi {{user.name}},</p>
          <p>Amazing! You've completed your first lesson and earned {{xp}} XP!</p>
          <p>You're now on your way to becoming a coding master. Keep up the great work!</p>
          <p><strong>Your Progress:</strong></p>
          <ul>
            <li>Level: {{user.level}}</li>
            <li>Total XP: {{user.totalXp}}</li>
            <li>Lessons Completed: {{user.lessonsCompleted}}</li>
          </ul>
          <p>Ready for the next challenge? <a href="{{appUrl}}/courses/python/lesson/{{nextLesson}}">Continue learning</a></p>
          <p>Keep coding! 💻</p>
        `,
        text: `
🎉 Congratulations!

Hi {{user.name}},

Amazing! You've completed your first lesson and earned {{xp}} XP!

You're now on your way to becoming a coding master. Keep up the great work!

Your Progress:
- Level: {{user.level}}
- Total XP: {{user.totalXp}}
- Lessons Completed: {{user.lessonsCompleted}}

Ready for the next challenge? Continue learning: {{appUrl}}/courses/python/lesson/{{nextLesson}}

Keep coding! 💻
        `
      },
      streak_reminder: {
        subject: '🔥 Don\'t Break Your Learning Streak!',
        html: `
          <h1>🔥 Keep Your Streak Alive!</h1>
          <p>Hi {{user.name}},</p>
          <p>It's been {{daysInactive}} days since your last lesson. Don't let your learning streak break!</p>
          <p>Just 15 minutes today can keep you on track and help you maintain momentum.</p>
          <p><strong>Your Current Streak:</strong> {{user.currentStreak}} days</p>
          <p><strong>Best Streak:</strong> {{user.bestStreak}} days</p>
          <p>Ready to continue? <a href="{{appUrl}}/courses/python">Resume your learning</a></p>
          <p>You've got this! 💪</p>
        `,
        text: `
🔥 Keep Your Streak Alive!

Hi {{user.name}},

It's been {{daysInactive}} days since your last lesson. Don't let your learning streak break!

Just 15 minutes today can keep you on track and help you maintain momentum.

Your Current Streak: {{user.currentStreak}} days
Best Streak: {{user.bestStreak}} days

Ready to continue? Resume your learning: {{appUrl}}/courses/python

You've got this! 💪
        `
      },
      achievement: {
        subject: '🏆 Achievement Unlocked: {{achievement.name}}',
        html: `
          <h1>🏆 Achievement Unlocked!</h1>
          <p>Hi {{user.name}},</p>
          <p>Congratulations! You've unlocked the <strong>{{achievement.name}}</strong> achievement!</p>
          <p>{{achievement.description}}</p>
          <p><strong>Rewards:</strong></p>
          <ul>
            <li>XP Bonus: {{achievement.xpReward}}</li>
            <li>Badge: {{achievement.badge}}</li>
          </ul>
          <p>Keep up the amazing work and unlock more achievements!</p>
          <p><a href="{{appUrl}}/profile/achievements">View all your achievements</a></p>
        `,
        text: `
🏆 Achievement Unlocked!

Hi {{user.name}},

Congratulations! You've unlocked the {{achievement.name}} achievement!

{{achievement.description}}

Rewards:
- XP Bonus: {{achievement.xpReward}}
- Badge: {{achievement.badge}}

Keep up the amazing work and unlock more achievements!

View all your achievements: {{appUrl}}/profile/achievements
        `
      },
      weekly_progress: {
        subject: '📊 Your Weekly Learning Report',
        html: `
          <h1>📊 Your Weekly Learning Report</h1>
          <p>Hi {{user.name}},</p>
          <p>Here's your learning progress for this week:</p>
          <p><strong>This Week:</strong></p>
          <ul>
            <li>Lessons Completed: {{weeklyStats.lessonsCompleted}}</li>
            <li>XP Earned: {{weeklyStats.xpEarned}}</li>
            <li>Time Spent: {{weeklyStats.timeSpent}} minutes</li>
            <li>Streak: {{weeklyStats.streak}} days</li>
          </ul>
          <p><strong>Total Progress:</strong></p>
          <ul>
            <li>Level: {{user.level}}</li>
            <li>Total XP: {{user.totalXp}}</li>
            <li>Course Progress: {{user.courseProgress}}%</li>
          </ul>
          <p>Great job this week! Keep up the momentum!</p>
          <p><a href="{{appUrl}}/courses/python">Continue learning</a></p>
        `,
        text: `
📊 Your Weekly Learning Report

Hi {{user.name}},

Here's your learning progress for this week:

This Week:
- Lessons Completed: {{weeklyStats.lessonsCompleted}}
- XP Earned: {{weeklyStats.xpEarned}}
- Time Spent: {{weeklyStats.timeSpent}} minutes
- Streak: {{weeklyStats.streak}} days

Total Progress:
- Level: {{user.level}}
- Total XP: {{user.totalXp}}
- Course Progress: {{user.courseProgress}}%

Great job this week! Keep up the momentum!

Continue learning: {{appUrl}}/courses/python
        `
      },
      course_completion: {
        subject: '🎓 Congratulations! You\'ve Completed the Python Course!',
        html: `
          <h1>🎓 Course Completion!</h1>
          <p>Hi {{user.name}},</p>
          <p>Incredible achievement! You've successfully completed the Python Programming course!</p>
          <p>You've mastered:</p>
          <ul>
            <li>{{courseStats.chaptersCompleted}} chapters</li>
            <li>{{courseStats.lessonsCompleted}} lessons</li>
            <li>{{courseStats.exercisesCompleted}} exercises</li>
            <li>Total XP: {{courseStats.totalXp}}</li>
          </ul>
          <p><strong>Your Certificate:</strong></p>
          <p>Download your completion certificate: <a href="{{appUrl}}/certificate/{{certificateId}}">View Certificate</a></p>
          <p>What's next?</p>
          <ul>
            <li>Share your achievement on social media</li>
            <li>Start a new course (coming soon!)</li>
            <li>Join our community discussions</li>
          </ul>
          <p>Congratulations on this amazing milestone! 🎉</p>
        `,
        text: `
🎓 Course Completion!

Hi {{user.name}},

Incredible achievement! You've successfully completed the Python Programming course!

You've mastered:
- {{courseStats.chaptersCompleted}} chapters
- {{courseStats.lessonsCompleted}} lessons
- {{courseStats.exercisesCompleted}} exercises
- Total XP: {{courseStats.totalXp}}

Your Certificate:
Download your completion certificate: {{appUrl}}/certificate/{{certificateId}}

What's next?
- Share your achievement on social media
- Start a new course (coming soon!)
- Join our community discussions

Congratulations on this amazing milestone! 🎉
        `
      }
    };
  }

  async sendDailyNotifications() {
    if (!this.isInitialized) {
      throw new Error('UserEngagement module not initialized');
    }

    this.logger.info('Sending daily notifications...');
    const notifications = [];

    try {
      // Get users who haven't been active for 3+ days
      const inactiveUsers = await this.getInactiveUsers(3);
      
      for (const user of inactiveUsers) {
        const notification = await this.sendEngagementNotification('streakReminder', user, {
          daysInactive: 3
        });
        notifications.push(notification);
      }

      // Send weekly progress reports (on Sundays)
      if (moment().day() === 0) { // Sunday
        const activeUsers = await this.getActiveUsers();
        
        for (const user of activeUsers) {
          const weeklyStats = await this.getWeeklyStats(user._id);
          const notification = await this.sendEngagementNotification('weeklyProgress', user, {
            weeklyStats
          });
          notifications.push(notification);
        }
      }

      this.logger.info(`Sent ${notifications.length} daily notifications`);
      return notifications;

    } catch (error) {
      this.logger.error('Failed to send daily notifications:', error);
      throw error;
    }
  }

  async sendEngagementNotification(ruleName, user, data = {}) {
    const rule = this.engagementRules[ruleName];
    if (!rule) {
      throw new Error(`Unknown engagement rule: ${ruleName}`);
    }

    const template = this.templates[rule.template];
    if (!template) {
      throw new Error(`Unknown template: ${rule.template}`);
    }

    const notification = {
      id: this.generateNotificationId(),
      userId: user._id,
      rule: ruleName,
      template: rule.template,
      channels: rule.channels,
      data: { ...data, user },
      status: 'pending',
      timestamp: new Date()
    };

    try {
      // Send to each channel
      for (const channel of rule.channels) {
        await this.sendToChannel(channel, user, template, notification.data);
      }

      notification.status = 'sent';
      await this.storeEngagementNotification(notification);

      this.logger.info(`Sent ${ruleName} notification to user ${user._id}`);
      return notification;

    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      await this.storeEngagementNotification(notification);

      this.logger.error(`Failed to send ${ruleName} notification to user ${user._id}:`, error);
      throw error;
    }
  }

  async sendToChannel(channel, user, template, data) {
    switch (channel) {
      case 'email':
        return this.sendEmail(user, template, data);
      case 'in_app':
        return this.sendInAppNotification(user, template, data);
      case 'push':
        return this.sendPushNotification(user, template, data);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  async sendEmail(user, template, data) {
    // Configure email transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Replace template variables
    const subject = this.replaceTemplateVariables(template.subject, data);
    const html = this.replaceTemplateVariables(template.html, data);
    const text = this.replaceTemplateVariables(template.text, data);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject,
      html,
      text
    };

    const result = await transporter.sendMail(mailOptions);
    this.logger.info(`Email sent to ${user.email}: ${result.messageId}`);
    return result;
  }

  async sendInAppNotification(user, template, data) {
    // Store in-app notification in database
    const InAppNotification = mongoose.model('InAppNotification');
    
    const notification = new InAppNotification({
      userId: user._id,
      title: this.replaceTemplateVariables(template.subject, data),
      message: this.replaceTemplateVariables(template.text, data),
      type: 'engagement',
      read: false,
      createdAt: new Date()
    });

    await notification.save();
    this.logger.info(`In-app notification stored for user ${user._id}`);
    return notification;
  }

  async sendPushNotification(user, template, data) {
    // Implementation for push notifications
    // This would integrate with a service like Firebase Cloud Messaging
    this.logger.info(`Push notification would be sent to user ${user._id}`);
    return { status: 'not_implemented' };
  }

  replaceTemplateVariables(template, data) {
    let result = template;
    
    // Replace user variables
    if (data.user) {
      result = result.replace(/\{\{user\.(\w+)\}\}/g, (match, field) => {
        return data.user[field] || '';
      });
    }

    // Replace other variables
    Object.keys(data).forEach(key => {
      if (key !== 'user') {
        const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    });

    // Replace app URL
    result = result.replace(/\{\{appUrl\}\}/g, process.env.APP_URL || 'https://codedx.vercel.app');

    return result;
  }

  async getInactiveUsers(days) {
    const cutoff = moment().subtract(days, 'days').toDate();
    
    const User = mongoose.model('User');
    return await User.find({
      lastActive: { $lt: cutoff },
      email: { $exists: true, $ne: '' }
    }).limit(100); // Limit to avoid overwhelming
  }

  async getActiveUsers() {
    const User = mongoose.model('User');
    return await User.find({
      email: { $exists: true, $ne: '' },
      lastActive: { $exists: true }
    }).limit(1000);
  }

  async getWeeklyStats(userId) {
    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();

    // Get user's activity for the week
    const UserActivity = mongoose.model('UserActivity');
    const activities = await UserActivity.find({
      userId,
      timestamp: { $gte: startOfWeek, $lte: endOfWeek }
    });

    const stats = {
      lessonsCompleted: 0,
      xpEarned: 0,
      timeSpent: 0,
      streak: 0
    };

    activities.forEach(activity => {
      if (activity.type === 'lesson_completed') {
        stats.lessonsCompleted++;
        stats.xpEarned += activity.xpEarned || 0;
      }
      if (activity.timeSpent) {
        stats.timeSpent += activity.timeSpent;
      }
    });

    // Get current streak
    const user = await mongoose.model('User').findById(userId);
    stats.streak = user.currentStreak || 0;

    return stats;
  }

  async trackUserActivity(userId, activityType, data = {}) {
    const UserActivity = mongoose.model('UserActivity');
    
    const activity = new UserActivity({
      userId,
      type: activityType,
      data,
      timestamp: new Date()
    });

    await activity.save();

    // Check for engagement triggers
    await this.checkEngagementTriggers(userId, activityType, data);

    this.logger.info(`Tracked activity: ${activityType} for user ${userId}`);
    return activity;
  }

  async checkEngagementTriggers(userId, activityType, data) {
    const user = await mongoose.model('User').findById(userId);
    if (!user) return;

    // Check each engagement rule
    for (const [ruleName, rule] of Object.entries(this.engagementRules)) {
      if (rule.trigger === activityType) {
        // Check conditions
        if (this.checkRuleConditions(rule, data)) {
          // Send notification
          await this.sendEngagementNotification(ruleName, user, data);
        }
      }
    }
  }

  checkRuleConditions(rule, data) {
    if (!rule.conditions) return true;

    for (const [key, value] of Object.entries(rule.conditions)) {
      if (data[key] !== value) {
        return false;
      }
    }

    return true;
  }

  async updateUserProgress(userId, progressData) {
    const User = mongoose.model('User');
    
    const update = {
      lastActive: new Date(),
      ...progressData
    };

    // Update level if XP threshold reached
    if (progressData.xpEarned) {
      const user = await User.findById(userId);
      const newTotalXp = (user.totalXp || 0) + progressData.xpEarned;
      
      // Calculate new level based on XP
      const newLevel = this.calculateLevel(newTotalXp);
      if (newLevel > user.level) {
        update.level = newLevel;
        update.levelUpAt = new Date();
      }
      
      update.totalXp = newTotalXp;
    }

    await User.findByIdAndUpdate(userId, update);
    this.logger.info(`Updated progress for user ${userId}`);
  }

  calculateLevel(totalXp) {
    // Simple level calculation: every 100 XP = 1 level
    return Math.floor(totalXp / 100) + 1;
  }

  generateNotificationId() {
    return `engagement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async storeEngagementNotification(notification) {
    // Keep only last 1000 notifications in memory
    this.engagementHistory.push(notification);
    if (this.engagementHistory.length > 1000) {
      this.engagementHistory.shift();
    }

    // Save to database
    const EngagementNotification = mongoose.model('EngagementNotification');
    const dbNotification = new EngagementNotification(notification);
    await dbNotification.save();
  }

  async loadEngagementHistory() {
    try {
      const EngagementNotification = mongoose.model('EngagementNotification');
      const notifications = await EngagementNotification.find()
        .sort({ timestamp: -1 })
        .limit(100);
      
      this.engagementHistory = notifications;
    } catch (error) {
      this.logger.warn('Failed to load engagement history:', error.message);
    }
  }

  async getEngagementStats(days = 30) {
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const recentNotifications = this.engagementHistory.filter(notification => 
      new Date(notification.timestamp) > cutoff
    );

    const stats = {
      total: recentNotifications.length,
      byRule: {},
      byStatus: {},
      byChannel: {},
      successRate: 0
    };

    recentNotifications.forEach(notification => {
      // Count by rule
      stats.byRule[notification.rule] = (stats.byRule[notification.rule] || 0) + 1;
      
      // Count by status
      stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;
      
      // Count by channel
      notification.channels.forEach(channel => {
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
      });
    });

    // Calculate success rate
    const successful = stats.byStatus.sent || 0;
    stats.successRate = recentNotifications.length > 0 ? 
      (successful / recentNotifications.length) * 100 : 0;

    return stats;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalNotifications: this.engagementHistory.length,
      activeRules: Object.keys(this.engagementRules),
      templates: Object.keys(this.templates),
      recentNotifications: this.engagementHistory.slice(-10)
    };
  }

  async shutdown() {
    this.logger.info('UserEngagement module shutting down');
    // Cleanup any ongoing notifications
  }
}

module.exports = UserEngagement;