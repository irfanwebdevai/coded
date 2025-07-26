const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

class CleanupService {
  constructor(logger) {
    this.logger = logger;
    this.isInitialized = false;
    this.cleanupHistory = [];
    this.cleanupRules = {
      logs: {
        enabled: true,
        retention: 30, // days
        patterns: ['*.log', '*.log.*'],
        directories: ['logs', 'automation/logs']
      },
      temp: {
        enabled: true,
        retention: 7, // days
        patterns: ['*.tmp', '*.temp', 'temp_*'],
        directories: ['temp', 'tmp', 'automation/temp']
      },
      backups: {
        enabled: true,
        retention: 90, // days
        patterns: ['backup_*', '*.backup'],
        directories: ['backups', 'automation/backups']
      },
      reports: {
        enabled: true,
        retention: 180, // days
        patterns: ['report_*', 'health-*', 'deployment-*'],
        directories: ['reports', 'automation/reports']
      },
      notifications: {
        enabled: true,
        retention: 365, // days
        patterns: ['notification-*'],
        directories: ['notifications', 'automation/notifications']
      },
      deployments: {
        enabled: true,
        retention: 365, // days
        patterns: ['deployment-*'],
        directories: ['deployments', 'automation/deployments']
      }
    };
  }

  async initialize() {
    try {
      // Load cleanup history
      await this.loadCleanupHistory();
      
      // Ensure cleanup directories exist
      await this.ensureCleanupDirectories();
      
      this.isInitialized = true;
      this.logger.info('CleanupService module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize CleanupService module:', error);
      throw error;
    }
  }

  async ensureCleanupDirectories() {
    const directories = [
      'logs',
      'temp',
      'backups',
      'reports',
      'notifications',
      'deployments'
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(__dirname, '..', dir));
    }
  }

  async performCleanup(options = {}) {
    if (!this.isInitialized) {
      throw new Error('CleanupService module not initialized');
    }

    const {
      rules = Object.keys(this.cleanupRules),
      dryRun = false,
      force = false
    } = options;

    const cleanupId = this.generateCleanupId();
    const startTime = Date.now();

    const cleanup = {
      id: cleanupId,
      rules,
      dryRun,
      startTime: new Date(),
      results: {},
      errors: [],
      duration: 0
    };

    try {
      this.logger.info(`Starting cleanup ${cleanupId} (dry run: ${dryRun})`);

      // Perform cleanup for each rule
      for (const ruleName of rules) {
        const rule = this.cleanupRules[ruleName];
        if (!rule || !rule.enabled) {
          this.logger.warn(`Skipping disabled rule: ${ruleName}`);
          continue;
        }

        try {
          const result = await this.cleanupRule(ruleName, rule, { dryRun, force });
          cleanup.results[ruleName] = result;
        } catch (error) {
          cleanup.errors.push(`${ruleName}: ${error.message}`);
          this.logger.error(`Cleanup rule ${ruleName} failed:`, error);
        }
      }

      cleanup.duration = Date.now() - startTime;
      cleanup.status = 'completed';

      this.logger.info(`Cleanup ${cleanupId} completed in ${cleanup.duration}ms`);

      // Store cleanup record
      await this.storeCleanupRecord(cleanup);

      return cleanup;

    } catch (error) {
      cleanup.status = 'failed';
      cleanup.error = error.message;
      cleanup.duration = Date.now() - startTime;

      this.logger.error(`Cleanup ${cleanupId} failed:`, error);
      await this.storeCleanupRecord(cleanup);

      throw error;
    }
  }

  async cleanupRule(ruleName, rule, options) {
    const { dryRun, force } = options;
    const result = {
      filesFound: 0,
      filesDeleted: 0,
      bytesFreed: 0,
      errors: []
    };

    this.logger.info(`Cleaning up rule: ${ruleName}`);

    // Process each directory
    for (const dir of rule.directories) {
      try {
        const dirPath = path.join(__dirname, '..', dir);
        
        if (!await fs.pathExists(dirPath)) {
          this.logger.warn(`Directory does not exist: ${dirPath}`);
          continue;
        }

        const dirResult = await this.cleanupDirectory(dirPath, rule, { dryRun, force });
        
        result.filesFound += dirResult.filesFound;
        result.filesDeleted += dirResult.filesDeleted;
        result.bytesFreed += dirResult.bytesFreed;
        result.errors.push(...dirResult.errors);

      } catch (error) {
        result.errors.push(`Directory ${dir}: ${error.message}`);
        this.logger.error(`Failed to cleanup directory ${dir}:`, error);
      }
    }

    this.logger.info(`Rule ${ruleName} cleanup result: ${result.filesDeleted}/${result.filesFound} files deleted, ${this.formatBytes(result.bytesFreed)} freed`);
    return result;
  }

  async cleanupDirectory(dirPath, rule, options) {
    const { dryRun, force } = options;
    const result = {
      filesFound: 0,
      filesDeleted: 0,
      bytesFreed: 0,
      errors: []
    };

    const cutoffDate = moment().subtract(rule.retention, 'days').toDate();

    try {
      const files = await this.getFilesInDirectory(dirPath, rule.patterns);
      
      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          result.filesFound++;

          // Check if file is older than retention period
          if (stats.mtime < cutoffDate) {
            if (dryRun) {
              this.logger.info(`[DRY RUN] Would delete: ${file} (${this.formatBytes(stats.size)})`);
            } else {
              await fs.remove(file);
              result.filesDeleted++;
              result.bytesFreed += stats.size;
              this.logger.info(`Deleted: ${file} (${this.formatBytes(stats.size)})`);
            }
          }

        } catch (error) {
          result.errors.push(`File ${file}: ${error.message}`);
          this.logger.warn(`Failed to process file ${file}:`, error.message);
        }
      }

    } catch (error) {
      result.errors.push(`Directory ${dirPath}: ${error.message}`);
      this.logger.error(`Failed to read directory ${dirPath}:`, error);
    }

    return result;
  }

  async getFilesInDirectory(dirPath, patterns) {
    const files = [];
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          // Recursively get files in subdirectories
          const subFiles = await this.getFilesInDirectory(fullPath, patterns);
          files.push(...subFiles);
        } else if (stats.isFile()) {
          // Check if file matches any pattern
          if (this.matchesPattern(item, patterns)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to read directory ${dirPath}:`, error.message);
    }

    return files;
  }

  matchesPattern(filename, patterns) {
    return patterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(filename);
    });
  }

  async cleanupDatabase(options = {}) {
    const { dryRun = false, collections = [] } = options;
    
    this.logger.info('Starting database cleanup...');
    const results = {};

    try {
      // Cleanup old user sessions
      if (collections.includes('sessions') || collections.length === 0) {
        results.sessions = await this.cleanupSessions(dryRun);
      }

      // Cleanup old notifications
      if (collections.includes('notifications') || collections.length === 0) {
        results.notifications = await this.cleanupNotifications(dryRun);
      }

      // Cleanup old user activities
      if (collections.includes('activities') || collections.length === 0) {
        results.activities = await this.cleanupActivities(dryRun);
      }

      this.logger.info('Database cleanup completed');
      return results;

    } catch (error) {
      this.logger.error('Database cleanup failed:', error);
      throw error;
    }
  }

  async cleanupSessions(dryRun) {
    const cutoffDate = moment().subtract(30, 'days').toDate();
    
    try {
      const Session = require('mongoose').model('Session');
      
      if (dryRun) {
        const count = await Session.countDocuments({ expires: { $lt: cutoffDate } });
        this.logger.info(`[DRY RUN] Would delete ${count} expired sessions`);
        return { deleted: 0, wouldDelete: count };
      } else {
        const result = await Session.deleteMany({ expires: { $lt: cutoffDate } });
        this.logger.info(`Deleted ${result.deletedCount} expired sessions`);
        return { deleted: result.deletedCount };
      }
    } catch (error) {
      this.logger.error('Failed to cleanup sessions:', error);
      throw error;
    }
  }

  async cleanupNotifications(dryRun) {
    const cutoffDate = moment().subtract(90, 'days').toDate();
    
    try {
      const Notification = require('mongoose').model('Notification');
      
      if (dryRun) {
        const count = await Notification.countDocuments({ 
          createdAt: { $lt: cutoffDate },
          read: true 
        });
        this.logger.info(`[DRY RUN] Would delete ${count} old read notifications`);
        return { deleted: 0, wouldDelete: count };
      } else {
        const result = await Notification.deleteMany({ 
          createdAt: { $lt: cutoffDate },
          read: true 
        });
        this.logger.info(`Deleted ${result.deletedCount} old read notifications`);
        return { deleted: result.deletedCount };
      }
    } catch (error) {
      this.logger.error('Failed to cleanup notifications:', error);
      throw error;
    }
  }

  async cleanupActivities(dryRun) {
    const cutoffDate = moment().subtract(180, 'days').toDate();
    
    try {
      const UserActivity = require('mongoose').model('UserActivity');
      
      if (dryRun) {
        const count = await UserActivity.countDocuments({ timestamp: { $lt: cutoffDate } });
        this.logger.info(`[DRY RUN] Would delete ${count} old user activities`);
        return { deleted: 0, wouldDelete: count };
      } else {
        const result = await UserActivity.deleteMany({ timestamp: { $lt: cutoffDate } });
        this.logger.info(`Deleted ${result.deletedCount} old user activities`);
        return { deleted: result.deletedCount };
      }
    } catch (error) {
      this.logger.error('Failed to cleanup activities:', error);
      throw error;
    }
  }

  async cleanupOrphanedFiles() {
    this.logger.info('Cleaning up orphaned files...');
    const results = {};

    try {
      // Cleanup orphaned uploads
      results.uploads = await this.cleanupOrphanedUploads();
      
      // Cleanup orphaned assets
      results.assets = await this.cleanupOrphanedAssets();

      this.logger.info('Orphaned files cleanup completed');
      return results;

    } catch (error) {
      this.logger.error('Orphaned files cleanup failed:', error);
      throw error;
    }
  }

  async cleanupOrphanedUploads() {
    // Implementation for cleaning up orphaned file uploads
    // This would check for files that exist but aren't referenced in the database
    this.logger.info('Orphaned uploads cleanup not yet implemented');
    return { deleted: 0 };
  }

  async cleanupOrphanedAssets() {
    // Implementation for cleaning up orphaned assets
    // This would check for asset files that aren't referenced in content
    this.logger.info('Orphaned assets cleanup not yet implemented');
    return { deleted: 0 };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateCleanupId() {
    return `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async storeCleanupRecord(cleanup) {
    // Keep only last 50 cleanup records in memory
    this.cleanupHistory.push(cleanup);
    if (this.cleanupHistory.length > 50) {
      this.cleanupHistory.shift();
    }

    // Save to file for persistence
    try {
      const cleanupsDir = path.join(__dirname, '../cleanups');
      await fs.ensureDir(cleanupsDir);
      
      const filename = `cleanup-${moment().format('YYYY-MM-DD')}.json`;
      const filePath = path.join(cleanupsDir, filename);
      
      let cleanups = [];
      if (await fs.pathExists(filePath)) {
        cleanups = await fs.readJson(filePath);
      }
      
      cleanups.push(cleanup);
      await fs.writeJson(filePath, cleanups, { spaces: 2 });
    } catch (error) {
      this.logger.warn('Failed to save cleanup record:', error.message);
    }
  }

  async loadCleanupHistory() {
    try {
      const cleanupsDir = path.join(__dirname, '../cleanups');
      if (await fs.pathExists(cleanupsDir)) {
        const files = await fs.readdir(cleanupsDir);
        const cleanupFiles = files.filter(f => f.startsWith('cleanup-') && f.endsWith('.json'));
        
        for (const file of cleanupFiles.slice(-10)) { // Load last 10 days
          const cleanups = await fs.readJson(path.join(cleanupsDir, file));
          this.cleanupHistory.push(...cleanups);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load cleanup history:', error.message);
    }
  }

  async getCleanupStats(days = 30) {
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const recentCleanups = this.cleanupHistory.filter(cleanup => 
      new Date(cleanup.startTime) > cutoff
    );

    const stats = {
      total: recentCleanups.length,
      totalFilesDeleted: 0,
      totalBytesFreed: 0,
      byRule: {},
      averageDuration: 0
    };

    if (recentCleanups.length > 0) {
      recentCleanups.forEach(cleanup => {
        // Sum up files deleted and bytes freed
        Object.values(cleanup.results).forEach(result => {
          stats.totalFilesDeleted += result.filesDeleted || 0;
          stats.totalBytesFreed += result.bytesFreed || 0;
        });

        // Count by rule
        cleanup.rules.forEach(rule => {
          stats.byRule[rule] = (stats.byRule[rule] || 0) + 1;
        });
      });

      // Calculate average duration
      const totalDuration = recentCleanups.reduce((sum, cleanup) => sum + cleanup.duration, 0);
      stats.averageDuration = totalDuration / recentCleanups.length;
    }

    return stats;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalCleanups: this.cleanupHistory.length,
      activeRules: Object.keys(this.cleanupRules).filter(key => this.cleanupRules[key].enabled),
      lastCleanup: this.cleanupHistory.length > 0 ? 
        this.cleanupHistory[this.cleanupHistory.length - 1] : null,
      recentCleanups: this.cleanupHistory.slice(-5)
    };
  }

  async shutdown() {
    this.logger.info('CleanupService module shutting down');
    // Cleanup any ongoing operations
  }
}

module.exports = CleanupService;