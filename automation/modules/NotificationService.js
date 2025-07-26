const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
const { Client, GatewayIntentBits } = require('discord.js');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');

class NotificationService {
  constructor(logger) {
    this.logger = logger;
    this.isInitialized = false;
    this.channels = new Map();
    this.notificationHistory = [];
    this.rateLimits = {
      email: { limit: 10, window: 60 * 1000, count: 0, resetTime: Date.now() },
      slack: { limit: 20, window: 60 * 1000, count: 0, resetTime: Date.now() },
      discord: { limit: 20, window: 60 * 1000, count: 0, resetTime: Date.now() },
      telegram: { limit: 30, window: 60 * 1000, count: 0, resetTime: Date.now() }
    };
  }

  async initialize() {
    try {
      // Configure notification channels
      await this.configureChannels();
      
      // Load notification history
      await this.loadNotificationHistory();
      
      this.isInitialized = true;
      this.logger.info('NotificationService module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize NotificationService module:', error);
      throw error;
    }
  }

  async configureChannels() {
    // Configure Email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.channels.set('email', {
        type: 'email',
        transporter: nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        }),
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.NOTIFICATION_EMAIL?.split(',') || []
      });
      this.logger.info('Email notifications configured');
    }

    // Configure Slack
    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL) {
      this.channels.set('slack', {
        type: 'slack',
        client: new WebClient(process.env.SLACK_BOT_TOKEN),
        channel: process.env.SLACK_CHANNEL
      });
      this.logger.info('Slack notifications configured');
    }

    // Configure Discord
    if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID) {
      this.channels.set('discord', {
        type: 'discord',
        client: new Client({
          intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
        }),
        channelId: process.env.DISCORD_CHANNEL_ID
      });
      
      // Login to Discord
      await this.channels.get('discord').client.login(process.env.DISCORD_BOT_TOKEN);
      this.logger.info('Discord notifications configured');
    }

    // Configure Telegram
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      this.channels.set('telegram', {
        type: 'telegram',
        bot: new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }),
        chatId: process.env.TELEGRAM_CHAT_ID
      });
      this.logger.info('Telegram notifications configured');
    }
  }

  async sendNotification(options) {
    if (!this.isInitialized) {
      throw new Error('NotificationService module not initialized');
    }

    const {
      type = 'info',
      title,
      message,
      channels = ['email'],
      priority = 'normal',
      data = {},
      template = 'default'
    } = options;

    const notification = {
      id: this.generateNotificationId(),
      type,
      title,
      message,
      channels,
      priority,
      data,
      template,
      timestamp: new Date(),
      status: 'pending'
    };

    try {
      this.logger.info(`Sending notification: ${notification.id} - ${title}`);

      // Check rate limits
      await this.checkRateLimits(channels);

      // Send to each channel
      const results = await Promise.allSettled(
        channels.map(channel => this.sendToChannel(channel, notification))
      );

      // Update notification status
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      notification.status = failed === 0 ? 'sent' : failed === channels.length ? 'failed' : 'partial';
      notification.results = results.map((result, index) => ({
        channel: channels[index],
        status: result.status,
        error: result.status === 'rejected' ? result.reason.message : null
      }));

      // Store notification
      await this.storeNotification(notification);

      this.logger.info(`Notification ${notification.id} sent to ${successful}/${channels.length} channels`);
      return notification;

    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      await this.storeNotification(notification);
      
      this.logger.error(`Failed to send notification ${notification.id}:`, error);
      throw error;
    }
  }

  async sendAlert(options) {
    // Enhanced alert method with automatic channel selection based on severity
    const { severity = 'medium', ...alertOptions } = options;
    
    let channels = ['email'];
    
    // Add additional channels based on severity
    if (severity === 'high' || severity === 'critical') {
      if (this.channels.has('slack')) channels.push('slack');
      if (this.channels.has('telegram')) channels.push('telegram');
      if (this.channels.has('discord')) channels.push('discord');
    }

    return this.sendNotification({
      ...alertOptions,
      channels,
      priority: severity === 'critical' ? 'high' : severity === 'high' ? 'normal' : 'low',
      template: 'alert'
    });
  }

  async sendToChannel(channelName, notification) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not configured`);
    }

    // Check rate limit for this channel
    await this.checkRateLimit(channelName);

    switch (channel.type) {
      case 'email':
        return this.sendEmail(channel, notification);
      case 'slack':
        return this.sendSlackMessage(channel, notification);
      case 'discord':
        return this.sendDiscordMessage(channel, notification);
      case 'telegram':
        return this.sendTelegramMessage(channel, notification);
      default:
        throw new Error(`Unknown channel type: ${channel.type}`);
    }
  }

  async sendEmail(channel, notification) {
    const { transporter, from, to } = channel;
    
    const emailContent = this.formatEmailContent(notification);
    
    const mailOptions = {
      from,
      to,
      subject: `[Codedx] ${notification.title}`,
      html: emailContent.html,
      text: emailContent.text,
      priority: notification.priority === 'high' ? 'high' : 'normal'
    };

    const result = await transporter.sendMail(mailOptions);
    this.logger.info(`Email sent: ${result.messageId}`);
    return result;
  }

  async sendSlackMessage(channel, notification) {
    const { client, channel: slackChannel } = channel;
    
    const slackContent = this.formatSlackContent(notification);
    
    const result = await client.chat.postMessage({
      channel: slackChannel,
      ...slackContent
    });

    this.logger.info(`Slack message sent: ${result.ts}`);
    return result;
  }

  async sendDiscordMessage(channel, notification) {
    const { client, channelId } = channel;
    
    const discordContent = this.formatDiscordContent(notification);
    
    const discordChannel = await client.channels.fetch(channelId);
    const result = await discordChannel.send(discordContent);

    this.logger.info(`Discord message sent: ${result.id}`);
    return result;
  }

  async sendTelegramMessage(channel, notification) {
    const { bot, chatId } = channel;
    
    const telegramContent = this.formatTelegramContent(notification);
    
    const result = await bot.sendMessage(chatId, telegramContent, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    this.logger.info(`Telegram message sent: ${result.message_id}`);
    return result;
  }

  formatEmailContent(notification) {
    const color = this.getNotificationColor(notification.type);
    const priority = notification.priority.toUpperCase();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: ${color}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
          .priority { display: inline-block; background: ${color}; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; }
          .timestamp { color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 Codedx Platform</h1>
          <span class="priority">${priority}</span>
        </div>
        <div class="content">
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          ${notification.data.details ? `<p><strong>Details:</strong> ${notification.data.details}</p>` : ''}
          <p class="timestamp">Sent at: ${moment(notification.timestamp).format('YYYY-MM-DD HH:mm:ss UTC')}</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from the Codedx Platform.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Codedx Platform Notification
${'='.repeat(30)}

Priority: ${priority}
Title: ${notification.title}
Message: ${notification.message}
${notification.data.details ? `Details: ${notification.data.details}` : ''}
Timestamp: ${moment(notification.timestamp).format('YYYY-MM-DD HH:mm:ss UTC')}

This is an automated notification from the Codedx Platform.
    `;

    return { html, text };
  }

  formatSlackContent(notification) {
    const color = this.getNotificationColor(notification.type);
    const emoji = this.getNotificationEmoji(notification.type);
    
    return {
      text: `${emoji} *${notification.title}*`,
      attachments: [{
        color,
        text: notification.message,
        fields: [
          {
            title: 'Priority',
            value: notification.priority.toUpperCase(),
            short: true
          },
          {
            title: 'Type',
            value: notification.type.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: moment(notification.timestamp).format('YYYY-MM-DD HH:mm:ss UTC'),
            short: true
          }
        ],
        footer: 'Codedx Platform Automation',
        ts: Math.floor(notification.timestamp.getTime() / 1000)
      }]
    };
  }

  formatDiscordContent(notification) {
    const color = this.getNotificationColor(notification.type);
    const emoji = this.getNotificationEmoji(notification.type);
    
    return {
      embeds: [{
        title: `${emoji} ${notification.title}`,
        description: notification.message,
        color: parseInt(color.replace('#', ''), 16),
        fields: [
          {
            name: 'Priority',
            value: notification.priority.toUpperCase(),
            inline: true
          },
          {
            name: 'Type',
            value: notification.type.toUpperCase(),
            inline: true
          },
          {
            name: 'Timestamp',
            value: moment(notification.timestamp).format('YYYY-MM-DD HH:mm:ss UTC'),
            inline: true
          }
        ],
        footer: {
          text: 'Codedx Platform Automation'
        },
        timestamp: notification.timestamp.toISOString()
      }]
    };
  }

  formatTelegramContent(notification) {
    const emoji = this.getNotificationEmoji(notification.type);
    
    return `
<b>${emoji} ${notification.title}</b>

${notification.message}

<b>Priority:</b> ${notification.priority.toUpperCase()}
<b>Type:</b> ${notification.type.toUpperCase()}
<b>Time:</b> ${moment(notification.timestamp).format('YYYY-MM-DD HH:mm:ss UTC')}

<i>Codedx Platform Automation</i>
    `.trim();
  }

  getNotificationColor(type) {
    const colors = {
      info: '#3498db',
      success: '#27ae60',
      warning: '#f39c12',
      error: '#e74c3c',
      critical: '#c0392b'
    };
    return colors[type] || colors.info;
  }

  getNotificationEmoji(type) {
    const emojis = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return emojis[type] || emojis.info;
  }

  async checkRateLimits(channels) {
    for (const channel of channels) {
      await this.checkRateLimit(channel);
    }
  }

  async checkRateLimit(channel) {
    const limit = this.rateLimits[channel];
    if (!limit) return;

    const now = Date.now();
    
    // Reset counter if window has passed
    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + limit.window;
    }

    // Check if limit exceeded
    if (limit.count >= limit.limit) {
      const waitTime = limit.resetTime - now;
      throw new Error(`Rate limit exceeded for ${channel}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    limit.count++;
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async storeNotification(notification) {
    // Keep only last 1000 notifications in memory
    this.notificationHistory.push(notification);
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory.shift();
    }

    // Save to file for persistence
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      const notificationsDir = path.join(__dirname, '../notifications');
      await fs.ensureDir(notificationsDir);
      
      const filename = `notification-${moment().format('YYYY-MM-DD')}.json`;
      const filePath = path.join(notificationsDir, filename);
      
      let notifications = [];
      if (await fs.pathExists(filePath)) {
        notifications = await fs.readJson(filePath);
      }
      
      notifications.push(notification);
      await fs.writeJson(filePath, notifications, { spaces: 2 });
    } catch (error) {
      this.logger.warn('Failed to save notification:', error.message);
    }
  }

  async loadNotificationHistory() {
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      const notificationsDir = path.join(__dirname, '../notifications');
      if (await fs.pathExists(notificationsDir)) {
        const files = await fs.readdir(notificationsDir);
        const notificationFiles = files.filter(f => f.startsWith('notification-') && f.endsWith('.json'));
        
        for (const file of notificationFiles.slice(-5)) { // Load last 5 days
          const notifications = await fs.readJson(path.join(notificationsDir, file));
          this.notificationHistory.push(...notifications);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load notification history:', error.message);
    }
  }

  async getNotificationStats(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const recentNotifications = this.notificationHistory.filter(notification => 
      new Date(notification.timestamp) > cutoff
    );

    const stats = {
      total: recentNotifications.length,
      byType: {},
      byStatus: {},
      byChannel: {},
      byPriority: {}
    };

    recentNotifications.forEach(notification => {
      // Count by type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      
      // Count by status
      stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;
      
      // Count by priority
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      
      // Count by channel
      notification.channels.forEach(channel => {
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
      });
    });

    return stats;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      configuredChannels: Array.from(this.channels.keys()),
      totalNotifications: this.notificationHistory.length,
      rateLimits: Object.fromEntries(
        Object.entries(this.rateLimits).map(([channel, limit]) => [
          channel,
          {
            limit: limit.limit,
            used: limit.count,
            remaining: Math.max(0, limit.limit - limit.count),
            resetTime: limit.resetTime
          }
        ])
      )
    };
  }

  async shutdown() {
    this.logger.info('NotificationService module shutting down');
    
    // Close Discord client if connected
    const discordChannel = this.channels.get('discord');
    if (discordChannel && discordChannel.client) {
      discordChannel.client.destroy();
    }
  }
}

module.exports = NotificationService;