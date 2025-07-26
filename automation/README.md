# 🚀 Codedx Automation System

A comprehensive automation system designed specifically for the Codedx Platform. This system provides automated database backups, health monitoring, notifications, deployments, content management, user engagement, cleanup services, and report generation.

## ✨ Features

### 🔄 **Database Backup Automation**
- **Automated Backups**: Scheduled database backups every 6 hours
- **Cloud Storage**: Upload to AWS S3 and Google Drive
- **Compression**: Automatic compression to save storage space
- **Restoration**: Easy backup restoration capabilities
- **Statistics**: Track backup success rates and storage usage

### 🏥 **Health Monitoring**
- **System Health**: Monitor CPU, memory, disk usage
- **Database Health**: Check connection status and performance
- **Application Health**: Monitor response times and availability
- **Network Health**: Test external service connectivity
- **Alerting**: Automatic alerts for health issues

### 📧 **Multi-Channel Notifications**
- **Email**: SMTP-based email notifications
- **Slack**: Direct integration with Slack channels
- **Discord**: Bot-based Discord notifications
- **Telegram**: Telegram bot notifications
- **Rate Limiting**: Built-in rate limiting to prevent spam
- **Templates**: Rich HTML and text templates

### 🚀 **Deployment Automation**
- **Multi-Platform**: Support for Vercel, AWS, Netlify
- **Environment Management**: Development, staging, production
- **Pre-deployment Checks**: Validation and testing
- **Post-deployment Verification**: Health checks after deployment
- **Rollback Support**: Easy rollback to previous versions

### 📚 **Content Management**
- **GitHub Integration**: Automatic content updates from repositories
- **External Sources**: Fetch content from external websites
- **Local Processing**: Process and validate local content
- **Database Sync**: Update lesson content in database
- **Backup & Restore**: Content backup and restoration

### 👥 **User Engagement**
- **Welcome Emails**: Automated welcome sequences
- **Progress Tracking**: Monitor user learning progress
- **Streak Reminders**: Encourage daily learning habits
- **Achievement Notifications**: Celebrate user milestones
- **Weekly Reports**: Personalized weekly progress reports

### 🧹 **Automated Cleanup**
- **Log Rotation**: Automatic log file cleanup
- **Temp Files**: Remove temporary files
- **Old Backups**: Clean up old backup files
- **Database Cleanup**: Remove old sessions and notifications
- **Configurable Retention**: Customizable retention periods

### 📊 **Report Generation**
- **Weekly Reports**: System health and performance reports
- **Monthly Analytics**: User growth and engagement analytics
- **Daily Health**: Daily system health summaries
- **Multiple Formats**: JSON, HTML, and PDF output
- **Charts & Visualizations**: Built-in chart generation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Automation System                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Database  │ │   Health    │ │Notification │           │
│  │   Backup    │ │  Monitor    │ │  Service    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Deployment  │ │   Content   │ │   User      │           │
│  │Automation   │ │Automation   │ │Engagement   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐                           │
│  │  Cleanup    │ │   Report    │                           │
│  │  Service    │ │ Generator   │                           │
│  └─────────────┘ └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- MongoDB connection
- SMTP server (for email notifications)
- Optional: AWS S3, Google Drive, Slack, Discord, Telegram credentials

### Installation

1. **Navigate to the automation directory**:
   ```bash
   cd automation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file with your configuration:
   ```bash
   # Database
   MONGODB_URI=your-mongodb-connection-string
   
   # Email (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@codedx.com
   NOTIFICATION_EMAIL=admin@codedx.com
   
   # AWS S3 (optional)
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BACKUP_BUCKET=your-backup-bucket
   
   # Google Drive (optional)
   GOOGLE_DRIVE_CREDENTIALS={"type":"service_account",...}
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id
   
   # Slack (optional)
   SLACK_BOT_TOKEN=xoxb-your-slack-token
   SLACK_CHANNEL=#alerts
   
   # Discord (optional)
   DISCORD_BOT_TOKEN=your-discord-bot-token
   DISCORD_CHANNEL_ID=your-channel-id
   
   # Telegram (optional)
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   TELEGRAM_CHAT_ID=your-chat-id
   
   # GitHub (optional)
   GITHUB_TOKEN=your-github-token
   
   # Application
   APP_URL=https://codedx.vercel.app
   NODE_ENV=production
   ```

4. **Start the automation system**:
   ```bash
   npm start
   ```

## 📖 Usage

### Command Line Interface

The automation system provides a comprehensive CLI for managing all automation tasks:

```bash
# Start the automation system
npm start

# Run a specific task
npm run task backup
npm run task health-check
npm run task deploy
npm run task notify
npm run task cleanup
npm run task report

# Check system status
npm run status

# Interactive mode
npm run interactive
```

### Programmatic Usage

```javascript
const AutomationSystem = require('./index');

const automation = new AutomationSystem();

// Initialize the system
await automation.initialize();

// Start scheduled tasks
await automation.startScheduledTasks();

// Run manual tasks
await automation.runManualTask('backup', { force: true });
await automation.runManualTask('health-check');
await automation.runManualTask('deploy', { environment: 'production' });

// Get system status
const status = automation.getStatus();
console.log(status);
```

### Scheduled Tasks

The automation system runs the following scheduled tasks:

| Task | Schedule | Description |
|------|----------|-------------|
| Database Backup | Every 6 hours | Automated database backups |
| Health Monitoring | Every 5 minutes | System health checks |
| User Engagement | Daily at 9 AM | Send daily notifications |
| Cleanup | Weekly on Sunday | Clean up old files and logs |
| Weekly Reports | Weekly on Sunday | Generate weekly reports |
| Content Updates | Daily at 6 AM | Check for content updates |

## 🔧 Configuration

### Database Backup Configuration

```javascript
// Configure backup retention and cloud storage
const backupConfig = {
  retention: 30, // days
  compression: true,
  cloudStorage: {
    s3: {
      bucket: 'your-backup-bucket',
      region: 'us-east-1'
    },
    googleDrive: {
      folderId: 'your-folder-id'
    }
  }
};
```

### Health Monitoring Configuration

```javascript
// Configure alert thresholds
const healthConfig = {
  thresholds: {
    cpu: 80, // CPU usage percentage
    memory: 85, // Memory usage percentage
    disk: 90, // Disk usage percentage
    responseTime: 2000, // Response time in ms
    errorRate: 5 // Error rate percentage
  }
};
```

### Notification Configuration

```javascript
// Configure notification channels
const notificationConfig = {
  channels: {
    email: {
      enabled: true,
      rateLimit: { limit: 10, window: 60000 }
    },
    slack: {
      enabled: true,
      rateLimit: { limit: 20, window: 60000 }
    },
    discord: {
      enabled: true,
      rateLimit: { limit: 20, window: 60000 }
    },
    telegram: {
      enabled: true,
      rateLimit: { limit: 30, window: 60000 }
    }
  }
};
```

## 📊 Monitoring & Analytics

### Health Dashboard

Monitor system health in real-time:

```bash
# Get current health status
npm run health-check

# Get detailed health report
curl http://localhost:3000/api/health/detailed
```

### Performance Metrics

Track system performance:

- **Response Times**: Average, P95, P99 response times
- **Error Rates**: Error frequency and types
- **Resource Usage**: CPU, memory, disk utilization
- **User Engagement**: Active users, lesson completions
- **System Uptime**: Availability and downtime tracking

### Reports

Generate comprehensive reports:

```bash
# Generate weekly report
npm run report weekly

# Generate monthly report
npm run report monthly

# Generate custom report
npm run report custom --sections=users,performance --format=html
```

## 🔒 Security

### Environment Variables
- All sensitive data is stored in environment variables
- No hardcoded credentials in the codebase
- Support for different environments (dev, staging, prod)

### Rate Limiting
- Built-in rate limiting for all notification channels
- Prevents spam and abuse
- Configurable limits per channel

### Access Control
- Database connection with proper authentication
- Secure file operations with proper permissions
- Logging of all automation activities

## 🛠️ Development

### Adding New Modules

1. Create a new module file in `modules/`:
   ```javascript
   class NewModule {
     constructor(logger) {
       this.logger = logger;
       this.isInitialized = false;
     }

     async initialize() {
       // Initialize module
       this.isInitialized = true;
     }

     async performTask(options = {}) {
       // Implement task logic
     }

     getStatus() {
       return {
         isInitialized: this.isInitialized
       };
     }
   }

   module.exports = NewModule;
   ```

2. Register the module in `index.js`:
   ```javascript
   const NewModule = require('./modules/NewModule');
   
   this.modules.newModule = new NewModule(logger);
   ```

### Testing

```bash
# Run tests
npm test

# Run specific test
npm test -- --grep "backup"

# Run with coverage
npm run test:coverage
```

### Logging

The automation system uses Winston for logging:

```javascript
// Log levels: error, warn, info, debug
logger.error('Critical error occurred');
logger.warn('Warning message');
logger.info('Information message');
logger.debug('Debug information');
```

## 📈 Performance

### Optimization Tips

1. **Database Connections**: Use connection pooling
2. **File Operations**: Use streaming for large files
3. **Memory Management**: Clean up large objects
4. **Async Operations**: Use Promise.all for parallel tasks
5. **Caching**: Cache frequently accessed data

### Monitoring

Monitor automation system performance:

```bash
# Check system resources
npm run monitor resources

# Check automation performance
npm run monitor performance

# Check automation logs
npm run monitor logs
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MongoDB URI
   - Verify network connectivity
   - Check authentication credentials

2. **Email Notifications Not Working**
   - Verify SMTP settings
   - Check email credentials
   - Test SMTP connection

3. **Backup Upload Failed**
   - Check cloud storage credentials
   - Verify bucket/folder permissions
   - Check network connectivity

4. **Health Checks Failing**
   - Check application URL
   - Verify database connection
   - Check system resources

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=automation:* npm start
```

### Log Files

Check log files for detailed error information:

```bash
# View error logs
tail -f logs/error.log

# View combined logs
tail -f logs/combined.log
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style

- Use ES6+ features
- Follow ESLint configuration
- Add JSDoc comments for functions
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join our GitHub Discussions
- **Email**: support@codedx.com

## 🗺️ Roadmap

### Version 2.0
- [ ] Machine learning for predictive analytics
- [ ] Advanced alerting with AI-powered anomaly detection
- [ ] Integration with more cloud providers
- [ ] Mobile app for monitoring

### Version 3.0
- [ ] Self-healing capabilities
- [ ] Advanced reporting with custom dashboards
- [ ] Multi-tenant support
- [ ] API for external integrations

---

**Built with ❤️ by the Codedx Team**

*Automating the future of education* 🚀