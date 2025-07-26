#!/usr/bin/env node

const cron = require('node-cron');
const winston = require('winston');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const commander = require('commander');

// Import automation modules
const DatabaseBackup = require('./modules/DatabaseBackup');
const HealthMonitor = require('./modules/HealthMonitor');
const NotificationService = require('./modules/NotificationService');
const DeploymentAutomation = require('./modules/DeploymentAutomation');
const ContentAutomation = require('./modules/ContentAutomation');
const UserEngagement = require('./modules/UserEngagement');
const CleanupService = require('./modules/CleanupService');
const ReportGenerator = require('./modules/ReportGenerator');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'codedx-automation' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class AutomationSystem {
  constructor() {
    this.modules = {
      databaseBackup: new DatabaseBackup(logger),
      healthMonitor: new HealthMonitor(logger),
      notificationService: new NotificationService(logger),
      deploymentAutomation: new DeploymentAutomation(logger),
      contentAutomation: new ContentAutomation(logger),
      userEngagement: new UserEngagement(logger),
      cleanupService: new CleanupService(logger),
      reportGenerator: new ReportGenerator(logger)
    };
    
    this.isRunning = false;
    this.scheduledTasks = new Map();
  }

  async initialize() {
    const spinner = ora('Initializing Codedx Automation System...').start();
    
    try {
      // Initialize all modules
      for (const [name, module] of Object.entries(this.modules)) {
        await module.initialize();
        logger.info(`Module ${name} initialized successfully`);
      }
      
      spinner.succeed('Automation System initialized successfully!');
      logger.info('Codedx Automation System started');
      
    } catch (error) {
      spinner.fail('Failed to initialize automation system');
      logger.error('Initialization error:', error);
      throw error;
    }
  }

  async startScheduledTasks() {
    logger.info('Starting scheduled tasks...');
    
    // Database backup every 6 hours
    this.scheduleTask('database-backup', '0 */6 * * *', async () => {
      await this.modules.databaseBackup.performBackup();
    });

    // Health monitoring every 5 minutes
    this.scheduleTask('health-monitor', '*/5 * * * *', async () => {
      await this.modules.healthMonitor.checkHealth();
    });

    // User engagement notifications daily at 9 AM
    this.scheduleTask('user-engagement', '0 9 * * *', async () => {
      await this.modules.userEngagement.sendDailyNotifications();
    });

    // Cleanup old logs and temp files weekly
    this.scheduleTask('cleanup', '0 2 * * 0', async () => {
      await this.modules.cleanupService.performCleanup();
    });

    // Generate weekly reports on Sundays at 3 AM
    this.scheduleTask('weekly-reports', '0 3 * * 0', async () => {
      await this.modules.reportGenerator.generateWeeklyReport();
    });

    // Content updates check daily at 6 AM
    this.scheduleTask('content-updates', '0 6 * * *', async () => {
      await this.modules.contentAutomation.checkForUpdates();
    });

    this.isRunning = true;
    logger.info('All scheduled tasks started');
  }

  scheduleTask(name, cronExpression, task) {
    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info(`Starting scheduled task: ${name}`);
        await task();
        logger.info(`Completed scheduled task: ${name}`);
      } catch (error) {
        logger.error(`Error in scheduled task ${name}:`, error);
        await this.modules.notificationService.sendAlert({
          type: 'error',
          title: `Automation Task Failed: ${name}`,
          message: error.message,
          severity: 'high'
        });
      }
    });

    this.scheduledTasks.set(name, job);
    logger.info(`Scheduled task ${name} with cron: ${cronExpression}`);
  }

  async stopScheduledTasks() {
    logger.info('Stopping scheduled tasks...');
    
    for (const [name, job] of this.scheduledTasks) {
      job.stop();
      logger.info(`Stopped task: ${name}`);
    }
    
    this.scheduledTasks.clear();
    this.isRunning = false;
  }

  async runManualTask(taskName, options = {}) {
    const spinner = ora(`Running manual task: ${taskName}`).start();
    
    try {
      switch (taskName) {
        case 'backup':
          await this.modules.databaseBackup.performBackup(options);
          break;
        case 'health-check':
          await this.modules.healthMonitor.checkHealth();
          break;
        case 'deploy':
          await this.modules.deploymentAutomation.deploy(options);
          break;
        case 'notify':
          await this.modules.notificationService.sendNotification(options);
          break;
        case 'cleanup':
          await this.modules.cleanupService.performCleanup();
          break;
        case 'report':
          await this.modules.reportGenerator.generateReport(options);
          break;
        case 'content-update':
          await this.modules.contentAutomation.updateContent(options);
          break;
        case 'user-engagement':
          await this.modules.userEngagement.sendNotifications(options);
          break;
        default:
          throw new Error(`Unknown task: ${taskName}`);
      }
      
      spinner.succeed(`Task ${taskName} completed successfully`);
      
    } catch (error) {
      spinner.fail(`Task ${taskName} failed`);
      logger.error(`Manual task error (${taskName}):`, error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.scheduledTasks.keys()),
      modules: Object.keys(this.modules).map(name => ({
        name,
        status: this.modules[name].getStatus()
      }))
    };
  }

  async shutdown() {
    logger.info('Shutting down automation system...');
    await this.stopScheduledTasks();
    
    // Cleanup modules
    for (const [name, module] of Object.entries(this.modules)) {
      if (module.shutdown) {
        await module.shutdown();
      }
    }
    
    logger.info('Automation system shutdown complete');
  }
}

// CLI Interface
async function main() {
  const program = new commander.Command();
  const automation = new AutomationSystem();

  program
    .name('codedx-automation')
    .description('Codedx Platform Automation System')
    .version('1.0.0');

  program
    .command('start')
    .description('Start the automation system')
    .action(async () => {
      try {
        await automation.initialize();
        await automation.startScheduledTasks();
        
        console.log(chalk.green('🚀 Automation system is now running!'));
        console.log(chalk.blue('Press Ctrl+C to stop'));
        
        // Keep the process running
        process.on('SIGINT', async () => {
          console.log('\n' + chalk.yellow('Shutting down...'));
          await automation.shutdown();
          process.exit(0);
        });
        
      } catch (error) {
        console.error(chalk.red('Failed to start automation system:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('task <taskName>')
    .description('Run a manual task')
    .option('-o, --options <options>', 'Task options (JSON string)')
    .action(async (taskName, options) => {
      try {
        await automation.initialize();
        const taskOptions = options.options ? JSON.parse(options.options) : {};
        await automation.runManualTask(taskName, taskOptions);
      } catch (error) {
        console.error(chalk.red(`Task ${taskName} failed:`), error.message);
        process.exit(1);
      }
    });

  program
    .command('status')
    .description('Show automation system status')
    .action(async () => {
      try {
        await automation.initialize();
        const status = automation.getStatus();
        console.log(chalk.blue('📊 Automation System Status:'));
        console.log(JSON.stringify(status, null, 2));
      } catch (error) {
        console.error(chalk.red('Failed to get status:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('interactive')
    .description('Start interactive mode')
    .action(async () => {
      try {
        await automation.initialize();
        
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Start Automation System', value: 'start' },
              { name: 'Run Manual Task', value: 'task' },
              { name: 'Show Status', value: 'status' },
              { name: 'Exit', value: 'exit' }
            ]
          }
        ]);

        switch (action) {
          case 'start':
            await automation.startScheduledTasks();
            console.log(chalk.green('Automation system started!'));
            break;
          case 'task':
            const { taskName } = await inquirer.prompt([
              {
                type: 'list',
                name: 'taskName',
                message: 'Select a task to run:',
                choices: [
                  'backup',
                  'health-check',
                  'deploy',
                  'notify',
                  'cleanup',
                  'report',
                  'content-update',
                  'user-engagement'
                ]
              }
            ]);
            await automation.runManualTask(taskName);
            break;
          case 'status':
            const status = automation.getStatus();
            console.log(chalk.blue('System Status:'));
            console.log(JSON.stringify(status, null, 2));
            break;
          case 'exit':
            await automation.shutdown();
            process.exit(0);
        }
        
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the CLI if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = AutomationSystem;