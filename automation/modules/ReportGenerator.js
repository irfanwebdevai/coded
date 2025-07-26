const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const mongoose = require('mongoose');

class ReportGenerator {
  constructor(logger) {
    this.logger = logger;
    this.isInitialized = false;
    this.reportHistory = [];
    this.reportTemplates = {
      weekly: {
        name: 'Weekly System Report',
        schedule: '0 3 * * 0', // Every Sunday at 3 AM
        sections: ['system', 'users', 'performance', 'errors']
      },
      monthly: {
        name: 'Monthly Analytics Report',
        schedule: '0 3 1 * *', // First day of month at 3 AM
        sections: ['analytics', 'trends', 'growth', 'recommendations']
      },
      daily: {
        name: 'Daily Health Report',
        schedule: '0 6 * * *', // Every day at 6 AM
        sections: ['health', 'alerts', 'performance']
      }
    };
  }

  async initialize() {
    try {
      // Load report history
      await this.loadReportHistory();
      
      // Ensure reports directory exists
      await this.ensureReportsDirectory();
      
      this.isInitialized = true;
      this.logger.info('ReportGenerator module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ReportGenerator module:', error);
      throw error;
    }
  }

  async ensureReportsDirectory() {
    const reportsDir = path.join(__dirname, '../reports');
    await fs.ensureDir(reportsDir);
  }

  async generateReport(options = {}) {
    if (!this.isInitialized) {
      throw new Error('ReportGenerator module not initialized');
    }

    const {
      type = 'weekly',
      sections = [],
      format = 'json',
      includeCharts = true,
      dateRange = null
    } = options;

    const reportId = this.generateReportId();
    const startTime = Date.now();

    const report = {
      id: reportId,
      type,
      format,
      generatedAt: new Date(),
      dateRange: dateRange || this.getDefaultDateRange(type),
      sections: sections.length > 0 ? sections : this.reportTemplates[type]?.sections || [],
      data: {},
      charts: [],
      summary: {},
      status: 'generating'
    };

    try {
      this.logger.info(`Generating ${type} report: ${reportId}`);

      // Generate each section
      for (const section of report.sections) {
        try {
          report.data[section] = await this.generateSection(section, report.dateRange);
        } catch (error) {
          this.logger.error(`Failed to generate section ${section}:`, error);
          report.data[section] = { error: error.message };
        }
      }

      // Generate summary
      report.summary = await this.generateSummary(report.data, type);

      // Generate charts if requested
      if (includeCharts) {
        report.charts = await this.generateCharts(report.data, type);
      }

      // Format and save report
      const formattedReport = await this.formatReport(report, format);
      await this.saveReport(reportId, formattedReport, format);

      report.status = 'completed';
      report.duration = Date.now() - startTime;

      this.logger.info(`Report ${reportId} generated successfully in ${report.duration}ms`);

      // Store report record
      await this.storeReportRecord(report);

      return report;

    } catch (error) {
      report.status = 'failed';
      report.error = error.message;
      report.duration = Date.now() - startTime;

      this.logger.error(`Report ${reportId} generation failed:`, error);
      await this.storeReportRecord(report);

      throw error;
    }
  }

  async generateWeeklyReport() {
    return this.generateReport({
      type: 'weekly',
      format: 'html',
      includeCharts: true
    });
  }

  async generateMonthlyReport() {
    return this.generateReport({
      type: 'monthly',
      format: 'html',
      includeCharts: true
    });
  }

  async generateDailyReport() {
    return this.generateReport({
      type: 'daily',
      format: 'json',
      includeCharts: false
    });
  }

  async generateSection(section, dateRange) {
    switch (section) {
      case 'system':
        return this.generateSystemSection(dateRange);
      case 'users':
        return this.generateUsersSection(dateRange);
      case 'performance':
        return this.generatePerformanceSection(dateRange);
      case 'errors':
        return this.generateErrorsSection(dateRange);
      case 'analytics':
        return this.generateAnalyticsSection(dateRange);
      case 'trends':
        return this.generateTrendsSection(dateRange);
      case 'growth':
        return this.generateGrowthSection(dateRange);
      case 'health':
        return this.generateHealthSection(dateRange);
      case 'alerts':
        return this.generateAlertsSection(dateRange);
      case 'recommendations':
        return this.generateRecommendationsSection(dateRange);
      default:
        throw new Error(`Unknown report section: ${section}`);
    }
  }

  async generateSystemSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      uptime: await this.getSystemUptime(startDate, endDate),
      resources: await this.getSystemResources(),
      deployments: await this.getDeploymentStats(startDate, endDate),
      backups: await this.getBackupStats(startDate, endDate),
      cleanups: await this.getCleanupStats(startDate, endDate)
    };
  }

  async generateUsersSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      totalUsers: await this.getTotalUsers(),
      newUsers: await this.getNewUsers(startDate, endDate),
      activeUsers: await this.getActiveUsers(startDate, endDate),
      userEngagement: await this.getUserEngagement(startDate, endDate),
      userProgress: await this.getUserProgress(startDate, endDate),
      topUsers: await this.getTopUsers(startDate, endDate)
    };
  }

  async generatePerformanceSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      responseTimes: await this.getResponseTimes(startDate, endDate),
      errorRates: await this.getErrorRates(startDate, endDate),
      throughput: await this.getThroughput(startDate, endDate),
      database: await this.getDatabasePerformance(startDate, endDate),
      memory: await this.getMemoryUsage(startDate, endDate),
      cpu: await this.getCpuUsage(startDate, endDate)
    };
  }

  async generateErrorsSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      totalErrors: await this.getTotalErrors(startDate, endDate),
      errorTypes: await this.getErrorTypes(startDate, endDate),
      errorTrends: await this.getErrorTrends(startDate, endDate),
      criticalErrors: await this.getCriticalErrors(startDate, endDate),
      resolvedErrors: await this.getResolvedErrors(startDate, endDate)
    };
  }

  async generateAnalyticsSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      pageViews: await this.getPageViews(startDate, endDate),
      lessonCompletions: await this.getLessonCompletions(startDate, endDate),
      courseProgress: await this.getCourseProgress(startDate, endDate),
      achievements: await this.getAchievements(startDate, endDate),
      retention: await this.getRetentionMetrics(startDate, endDate)
    };
  }

  async generateTrendsSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      userGrowth: await this.getUserGrowthTrend(startDate, endDate),
      engagementTrends: await this.getEngagementTrends(startDate, endDate),
      performanceTrends: await this.getPerformanceTrends(startDate, endDate),
      contentTrends: await this.getContentTrends(startDate, endDate)
    };
  }

  async generateGrowthSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      userGrowth: await this.getUserGrowth(startDate, endDate),
      revenueGrowth: await this.getRevenueGrowth(startDate, endDate),
      featureAdoption: await this.getFeatureAdoption(startDate, endDate),
      marketExpansion: await this.getMarketExpansion(startDate, endDate)
    };
  }

  async generateHealthSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      systemHealth: await this.getSystemHealth(startDate, endDate),
      serviceStatus: await this.getServiceStatus(startDate, endDate),
      alerts: await this.getHealthAlerts(startDate, endDate),
      incidents: await this.getIncidents(startDate, endDate)
    };
  }

  async generateAlertsSection(dateRange) {
    const { startDate, endDate } = dateRange;
    
    return {
      totalAlerts: await this.getTotalAlerts(startDate, endDate),
      alertTypes: await this.getAlertTypes(startDate, endDate),
      alertSeverity: await this.getAlertSeverity(startDate, endDate),
      resolvedAlerts: await this.getResolvedAlerts(startDate, endDate),
      alertTrends: await this.getAlertTrends(startDate, endDate)
    };
  }

  async generateRecommendationsSection(dateRange) {
    return {
      performance: await this.getPerformanceRecommendations(),
      security: await this.getSecurityRecommendations(),
      scalability: await this.getScalabilityRecommendations(),
      userExperience: await this.getUserExperienceRecommendations(),
      business: await this.getBusinessRecommendations()
    };
  }

  // Data collection methods
  async getSystemUptime(startDate, endDate) {
    // Implementation would query system uptime data
    return {
      totalUptime: '99.9%',
      downtime: '0.1%',
      incidents: 2,
      averageResponseTime: '150ms'
    };
  }

  async getSystemResources() {
    const os = require('os');
    
    return {
      cpu: {
        usage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      disk: {
        // Simplified disk usage
        usage: '45%'
      }
    };
  }

  async getDeploymentStats(startDate, endDate) {
    // Implementation would query deployment data
    return {
      total: 15,
      successful: 14,
      failed: 1,
      averageDuration: '2.5 minutes',
      environments: {
        production: 3,
        staging: 8,
        development: 4
      }
    };
  }

  async getBackupStats(startDate, endDate) {
    // Implementation would query backup data
    return {
      total: 28,
      successful: 28,
      failed: 0,
      totalSize: '2.5 GB',
      averageSize: '90 MB'
    };
  }

  async getCleanupStats(startDate, endDate) {
    // Implementation would query cleanup data
    return {
      total: 4,
      filesDeleted: 1250,
      spaceFreed: '500 MB',
      averageDuration: '45 seconds'
    };
  }

  async getTotalUsers() {
    try {
      const User = mongoose.model('User');
      return await User.countDocuments();
    } catch (error) {
      this.logger.warn('Failed to get total users:', error.message);
      return 0;
    }
  }

  async getNewUsers(startDate, endDate) {
    try {
      const User = mongoose.model('User');
      return await User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });
    } catch (error) {
      this.logger.warn('Failed to get new users:', error.message);
      return 0;
    }
  }

  async getActiveUsers(startDate, endDate) {
    try {
      const User = mongoose.model('User');
      return await User.countDocuments({
        lastActive: { $gte: startDate, $lte: endDate }
      });
    } catch (error) {
      this.logger.warn('Failed to get active users:', error.message);
      return 0;
    }
  }

  async getUserEngagement(startDate, endDate) {
    // Implementation would calculate user engagement metrics
    return {
      dailyActiveUsers: 150,
      weeklyActiveUsers: 450,
      monthlyActiveUsers: 1200,
      averageSessionDuration: '25 minutes',
      lessonsPerUser: 3.2
    };
  }

  async getUserProgress(startDate, endDate) {
    // Implementation would calculate user progress metrics
    return {
      lessonsCompleted: 1250,
      averageProgress: '45%',
      courseCompletions: 25,
      achievementsUnlocked: 180
    };
  }

  async getTopUsers(startDate, endDate) {
    try {
      const User = mongoose.model('User');
      return await User.find()
        .sort({ totalXp: -1 })
        .limit(10)
        .select('name email totalXp level lessonsCompleted');
    } catch (error) {
      this.logger.warn('Failed to get top users:', error.message);
      return [];
    }
  }

  async getResponseTimes(startDate, endDate) {
    // Implementation would query performance data
    return {
      average: '150ms',
      p95: '300ms',
      p99: '500ms',
      slowest: '800ms'
    };
  }

  async getErrorRates(startDate, endDate) {
    // Implementation would query error data
    return {
      total: 45,
      rate: '0.5%',
      byType: {
        '404': 20,
        '500': 15,
        'timeout': 10
      }
    };
  }

  async getTotalErrors(startDate, endDate) {
    // Implementation would query error logs
    return 45;
  }

  async getErrorTypes(startDate, endDate) {
    // Implementation would analyze error types
    return {
      '404 Not Found': 20,
      '500 Internal Server Error': 15,
      'Timeout': 10
    };
  }

  async getPageViews(startDate, endDate) {
    // Implementation would query analytics data
    return {
      total: 15000,
      unique: 2500,
      topPages: [
        { page: '/courses/python', views: 5000 },
        { page: '/dashboard', views: 3000 },
        { page: '/profile', views: 2000 }
      ]
    };
  }

  async getLessonCompletions(startDate, endDate) {
    // Implementation would query lesson completion data
    return {
      total: 1250,
      averagePerUser: 3.2,
      byChapter: {
        'Chapter 1': 300,
        'Chapter 2': 250,
        'Chapter 3': 200
      }
    };
  }

  async generateSummary(data, type) {
    const summary = {
      generatedAt: new Date(),
      type,
      highlights: [],
      metrics: {},
      recommendations: []
    };

    // Generate highlights based on data
    if (data.users) {
      summary.highlights.push(`Total users: ${data.users.totalUsers}`);
      summary.highlights.push(`New users this period: ${data.users.newUsers}`);
    }

    if (data.performance) {
      summary.highlights.push(`Average response time: ${data.performance.responseTimes.average}`);
      summary.highlights.push(`Error rate: ${data.performance.errorRates.rate}`);
    }

    if (data.analytics) {
      summary.highlights.push(`Total page views: ${data.analytics.pageViews.total}`);
      summary.highlights.push(`Lesson completions: ${data.analytics.lessonCompletions.total}`);
    }

    return summary;
  }

  async generateCharts(data, type) {
    const charts = [];

    // Generate charts based on data and type
    if (data.users && data.users.userEngagement) {
      charts.push({
        type: 'line',
        title: 'User Engagement Over Time',
        data: this.generateUserEngagementChart(data.users.userEngagement)
      });
    }

    if (data.performance && data.performance.responseTimes) {
      charts.push({
        type: 'bar',
        title: 'Response Time Distribution',
        data: this.generateResponseTimeChart(data.performance.responseTimes)
      });
    }

    return charts;
  }

  generateUserEngagementChart(engagement) {
    // Generate chart data for user engagement
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Daily Active Users',
        data: [120, 135, 150, 140, 160, 180, 170]
      }]
    };
  }

  generateResponseTimeChart(responseTimes) {
    // Generate chart data for response times
    return {
      labels: ['<100ms', '100-200ms', '200-300ms', '300-500ms', '>500ms'],
      datasets: [{
        label: 'Response Time Distribution',
        data: [60, 25, 10, 3, 2]
      }]
    };
  }

  async formatReport(report, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.generateHtmlReport(report);
      case 'pdf':
        return this.generatePdfReport(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.type} Report - Codedx Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; }
        .highlight { background: #e8f5e8; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.type.toUpperCase()} REPORT</h1>
        <p>Generated on ${moment(report.generatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="highlight">
            ${report.summary.highlights.map(h => `<p>• ${h}</p>`).join('')}
        </div>
    </div>
    
    ${Object.entries(report.data).map(([section, data]) => `
    <div class="section">
        <h2>${section.toUpperCase()}</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
    `).join('')}
</body>
</html>
    `;
  }

  generatePdfReport(report) {
    // Implementation for PDF generation
    // This would use a library like puppeteer or jsPDF
    throw new Error('PDF generation not yet implemented');
  }

  async saveReport(reportId, content, format) {
    const reportsDir = path.join(__dirname, '../reports');
    const extension = format === 'html' ? 'html' : format === 'pdf' ? 'pdf' : 'json';
    const filename = `report-${reportId}.${extension}`;
    const filepath = path.join(reportsDir, filename);
    
    await fs.writeFile(filepath, content);
    this.logger.info(`Report saved: ${filepath}`);
  }

  getDefaultDateRange(type) {
    const now = moment();
    
    switch (type) {
      case 'daily':
        return {
          startDate: now.clone().subtract(1, 'day').toDate(),
          endDate: now.toDate()
        };
      case 'weekly':
        return {
          startDate: now.clone().subtract(7, 'days').toDate(),
          endDate: now.toDate()
        };
      case 'monthly':
        return {
          startDate: now.clone().subtract(30, 'days').toDate(),
          endDate: now.toDate()
        };
      default:
        return {
          startDate: now.clone().subtract(7, 'days').toDate(),
          endDate: now.toDate()
        };
    }
  }

  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async storeReportRecord(report) {
    // Keep only last 100 reports in memory
    this.reportHistory.push(report);
    if (this.reportHistory.length > 100) {
      this.reportHistory.shift();
    }

    // Save to file for persistence
    try {
      const reportsDir = path.join(__dirname, '../reports');
      await fs.ensureDir(reportsDir);
      
      const filename = `report-record-${moment().format('YYYY-MM-DD')}.json`;
      const filePath = path.join(reportsDir, filename);
      
      let reports = [];
      if (await fs.pathExists(filePath)) {
        reports = await fs.readJson(filePath);
      }
      
      reports.push(report);
      await fs.writeJson(filePath, reports, { spaces: 2 });
    } catch (error) {
      this.logger.warn('Failed to save report record:', error.message);
    }
  }

  async loadReportHistory() {
    try {
      const reportsDir = path.join(__dirname, '../reports');
      if (await fs.pathExists(reportsDir)) {
        const files = await fs.readdir(reportsDir);
        const reportFiles = files.filter(f => f.startsWith('report-record-') && f.endsWith('.json'));
        
        for (const file of reportFiles.slice(-10)) { // Load last 10 days
          const reports = await fs.readJson(path.join(reportsDir, file));
          this.reportHistory.push(...reports);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load report history:', error.message);
    }
  }

  async getReportStats(days = 30) {
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const recentReports = this.reportHistory.filter(report => 
      new Date(report.generatedAt) > cutoff
    );

    const stats = {
      total: recentReports.length,
      byType: {},
      byFormat: {},
      averageDuration: 0
    };

    if (recentReports.length > 0) {
      recentReports.forEach(report => {
        stats.byType[report.type] = (stats.byType[report.type] || 0) + 1;
        stats.byFormat[report.format] = (stats.byFormat[report.format] || 0) + 1;
      });

      const totalDuration = recentReports.reduce((sum, report) => sum + (report.duration || 0), 0);
      stats.averageDuration = totalDuration / recentReports.length;
    }

    return stats;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalReports: this.reportHistory.length,
      templates: Object.keys(this.reportTemplates),
      lastReport: this.reportHistory.length > 0 ? 
        this.reportHistory[this.reportHistory.length - 1] : null,
      recentReports: this.reportHistory.slice(-5)
    };
  }

  async shutdown() {
    this.logger.info('ReportGenerator module shutting down');
    // Cleanup any ongoing report generation
  }
}

module.exports = ReportGenerator;