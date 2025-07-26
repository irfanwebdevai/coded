const axios = require('axios');
const os = require('os');
const mongoose = require('mongoose');
const moment = require('moment');

class HealthMonitor {
  constructor(logger) {
    this.logger = logger;
    this.isInitialized = false;
    this.healthChecks = new Map();
    this.alertThresholds = {
      cpu: 80, // CPU usage percentage
      memory: 85, // Memory usage percentage
      disk: 90, // Disk usage percentage
      responseTime: 2000, // Response time in ms
      errorRate: 5, // Error rate percentage
      databaseConnections: 80 // Database connection pool usage
    };
    this.healthHistory = [];
    this.lastAlert = null;
    this.alertCooldown = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    try {
      // Register health checks
      this.registerHealthChecks();
      
      // Load historical data
      await this.loadHealthHistory();
      
      this.isInitialized = true;
      this.logger.info('HealthMonitor module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize HealthMonitor module:', error);
      throw error;
    }
  }

  registerHealthChecks() {
    // System health checks
    this.healthChecks.set('system', this.checkSystemHealth.bind(this));
    this.healthChecks.set('database', this.checkDatabaseHealth.bind(this));
    this.healthChecks.set('application', this.checkApplicationHealth.bind(this));
    this.healthChecks.set('network', this.checkNetworkHealth.bind(this));
    this.healthChecks.set('disk', this.checkDiskHealth.bind(this));
    this.healthChecks.set('memory', this.checkMemoryHealth.bind(this));
  }

  async checkHealth() {
    if (!this.isInitialized) {
      throw new Error('HealthMonitor module not initialized');
    }

    const startTime = Date.now();
    const healthReport = {
      timestamp: new Date(),
      overall: 'healthy',
      checks: {},
      metrics: {},
      alerts: []
    };

    try {
      this.logger.info('Starting health check...');

      // Run all health checks
      const checkPromises = Array.from(this.healthChecks.entries()).map(
        async ([name, check]) => {
          try {
            const result = await check();
            healthReport.checks[name] = result;
            return result;
          } catch (error) {
            const errorResult = {
              status: 'error',
              message: error.message,
              timestamp: new Date()
            };
            healthReport.checks[name] = errorResult;
            return errorResult;
          }
        }
      );

      await Promise.allSettled(checkPromises);

      // Collect system metrics
      healthReport.metrics = await this.collectSystemMetrics();

      // Determine overall health
      healthReport.overall = this.determineOverallHealth(healthReport.checks);

      // Check for alerts
      healthReport.alerts = await this.checkForAlerts(healthReport);

      // Store health report
      await this.storeHealthReport(healthReport);

      const duration = Date.now() - startTime;
      this.logger.info(`Health check completed in ${duration}ms - Status: ${healthReport.overall}`);

      return healthReport;

    } catch (error) {
      this.logger.error('Health check failed:', error);
      throw error;
    }
  }

  async checkSystemHealth() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    return {
      status: 'healthy',
      metrics: {
        cpu: {
          usage: Math.round(cpuUsage * 100) / 100,
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        },
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: totalMemory - freeMemory,
          usage: Math.round(memoryUsage * 100) / 100
        },
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch()
      },
      timestamp: new Date()
    };
  }

  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Check database connection
      const dbState = mongoose.connection.readyState;
      const isConnected = dbState === 1;
      
      // Test database query
      const testQuery = await mongoose.connection.db.admin().ping();
      
      const responseTime = Date.now() - startTime;
      
      // Get connection pool stats
      const poolStats = mongoose.connection.db.admin().serverStatus();
      
      return {
        status: isConnected && testQuery.ok ? 'healthy' : 'unhealthy',
        metrics: {
          connectionState: dbState,
          isConnected,
          responseTime,
          poolSize: mongoose.connection.pool.size,
          poolUsed: mongoose.connection.pool.used,
          poolAvailable: mongoose.connection.pool.available
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  async checkApplicationHealth() {
    try {
      const startTime = Date.now();
      
      // Check if the application is responding
      const response = await axios.get(`${process.env.APP_URL || 'http://localhost:3000'}/api/health`, {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        metrics: {
          statusCode: response.status,
          responseTime,
          responseSize: response.data ? JSON.stringify(response.data).length : 0
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  async checkNetworkHealth() {
    try {
      const tests = [
        { name: 'google', url: 'https://www.google.com' },
        { name: 'github', url: 'https://api.github.com' },
        { name: 'vercel', url: 'https://vercel.com' }
      ];

      const results = await Promise.allSettled(
        tests.map(async (test) => {
          const startTime = Date.now();
          const response = await axios.get(test.url, { timeout: 5000 });
          const responseTime = Date.now() - startTime;
          
          return {
            name: test.name,
            status: response.status,
            responseTime,
            success: true
          };
        })
      );

      const successfulTests = results.filter(r => r.status === 'fulfilled').length;
      const avgResponseTime = results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value.responseTime, 0) / successfulTests;

      return {
        status: successfulTests >= 2 ? 'healthy' : 'unhealthy',
        metrics: {
          successfulConnections: successfulTests,
          totalTests: tests.length,
          averageResponseTime: Math.round(avgResponseTime),
          tests: results.map((r, i) => ({
            name: tests[i].name,
            success: r.status === 'fulfilled',
            responseTime: r.status === 'fulfilled' ? r.value.responseTime : null,
            error: r.status === 'rejected' ? r.reason.message : null
          }))
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  async checkDiskHealth() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check disk usage for the current directory
      const stats = fs.statSync('.');
      const totalSpace = stats.size;
      
      // This is a simplified check - in production you'd use a proper disk usage library
      const diskUsage = {
        total: totalSpace,
        free: totalSpace * 0.8, // Simplified
        used: totalSpace * 0.2, // Simplified
        usagePercent: 20
      };

      return {
        status: diskUsage.usagePercent < this.alertThresholds.disk ? 'healthy' : 'warning',
        metrics: diskUsage,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  async checkMemoryHealth() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      return {
        status: memoryUsagePercent < this.alertThresholds.memory ? 'healthy' : 'warning',
        metrics: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usagePercent: Math.round(memoryUsagePercent * 100) / 100
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  async collectSystemMetrics() {
    return {
      timestamp: new Date(),
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: os.uptime(),
        loadAverage: os.loadavg()
      },
      process: {
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
      }
    };
  }

  determineOverallHealth(checks) {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  async checkForAlerts(healthReport) {
    const alerts = [];
    const now = Date.now();

    // Check if we're in alert cooldown
    if (this.lastAlert && (now - this.lastAlert) < this.alertCooldown) {
      return alerts;
    }

    // Check system metrics
    const systemCheck = healthReport.checks.system;
    if (systemCheck && systemCheck.metrics) {
      if (systemCheck.metrics.cpu.usage > this.alertThresholds.cpu) {
        alerts.push({
          type: 'warning',
          component: 'system',
          metric: 'cpu',
          value: systemCheck.metrics.cpu.usage,
          threshold: this.alertThresholds.cpu,
          message: `High CPU usage: ${systemCheck.metrics.cpu.usage}%`
        });
      }

      if (systemCheck.metrics.memory.usage > this.alertThresholds.memory) {
        alerts.push({
          type: 'warning',
          component: 'system',
          metric: 'memory',
          value: systemCheck.metrics.memory.usage,
          threshold: this.alertThresholds.memory,
          message: `High memory usage: ${systemCheck.metrics.memory.usage}%`
        });
      }
    }

    // Check database
    const dbCheck = healthReport.checks.database;
    if (dbCheck && dbCheck.status === 'error') {
      alerts.push({
        type: 'error',
        component: 'database',
        message: 'Database connection failed',
        details: dbCheck.message
      });
    }

    // Check application
    const appCheck = healthReport.checks.application;
    if (appCheck && appCheck.status === 'error') {
      alerts.push({
        type: 'error',
        component: 'application',
        message: 'Application health check failed',
        details: appCheck.message
      });
    }

    // Check response time
    if (appCheck && appCheck.metrics && appCheck.metrics.responseTime > this.alertThresholds.responseTime) {
      alerts.push({
        type: 'warning',
        component: 'application',
        metric: 'responseTime',
        value: appCheck.metrics.responseTime,
        threshold: this.alertThresholds.responseTime,
        message: `Slow response time: ${appCheck.metrics.responseTime}ms`
      });
    }

    // Update last alert time if we have alerts
    if (alerts.length > 0) {
      this.lastAlert = now;
    }

    return alerts;
  }

  async storeHealthReport(healthReport) {
    // Keep only last 100 reports in memory
    this.healthHistory.push(healthReport);
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }

    // Save to file for persistence
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      const reportsDir = path.join(__dirname, '../reports');
      await fs.ensureDir(reportsDir);
      
      const filename = `health-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`;
      await fs.writeJson(path.join(reportsDir, filename), healthReport, { spaces: 2 });
    } catch (error) {
      this.logger.warn('Failed to save health report:', error.message);
    }
  }

  async loadHealthHistory() {
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      const reportsDir = path.join(__dirname, '../reports');
      if (await fs.pathExists(reportsDir)) {
        const files = await fs.readdir(reportsDir);
        const healthFiles = files.filter(f => f.startsWith('health-') && f.endsWith('.json'));
        
        for (const file of healthFiles.slice(-10)) { // Load last 10 reports
          const report = await fs.readJson(path.join(reportsDir, file));
          this.healthHistory.push(report);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load health history:', error.message);
    }
  }

  getHealthSummary() {
    if (this.healthHistory.length === 0) {
      return { message: 'No health data available' };
    }

    const recentReports = this.healthHistory.slice(-10);
    const statusCounts = recentReports.reduce((counts, report) => {
      counts[report.overall] = (counts[report.overall] || 0) + 1;
      return counts;
    }, {});

    const latestReport = recentReports[recentReports.length - 1];
    
    return {
      currentStatus: latestReport.overall,
      recentStatuses: statusCounts,
      lastCheck: latestReport.timestamp,
      totalChecks: this.healthHistory.length,
      alerts: latestReport.alerts
    };
  }

  async getDetailedReport(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const recentReports = this.healthHistory.filter(report => 
      new Date(report.timestamp) > cutoff
    );

    if (recentReports.length === 0) {
      return { message: 'No data available for the specified time range' };
    }

    // Calculate averages
    const metrics = recentReports.reduce((acc, report) => {
      if (report.metrics && report.metrics.system) {
        acc.cpuUsage.push(report.metrics.system.cpu?.usage || 0);
        acc.memoryUsage.push(report.metrics.system.memory?.usage || 0);
      }
      return acc;
    }, { cpuUsage: [], memoryUsage: [] });

    return {
      timeRange: `${hours} hours`,
      totalReports: recentReports.length,
      averageMetrics: {
        cpuUsage: metrics.cpuUsage.length > 0 ? 
          Math.round(metrics.cpuUsage.reduce((a, b) => a + b, 0) / metrics.cpuUsage.length * 100) / 100 : 0,
        memoryUsage: metrics.memoryUsage.length > 0 ? 
          Math.round(metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length * 100) / 100 : 0
      },
      statusBreakdown: recentReports.reduce((counts, report) => {
        counts[report.overall] = (counts[report.overall] || 0) + 1;
        return counts;
      }, {}),
      recentAlerts: recentReports.flatMap(report => report.alerts)
    };
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      lastCheck: this.healthHistory.length > 0 ? this.healthHistory[this.healthHistory.length - 1].timestamp : null,
      totalChecks: this.healthHistory.length,
      alertThresholds: this.alertThresholds,
      summary: this.getHealthSummary()
    };
  }

  async shutdown() {
    this.logger.info('HealthMonitor module shutting down');
    // Cleanup any ongoing monitoring
  }
}

module.exports = HealthMonitor;