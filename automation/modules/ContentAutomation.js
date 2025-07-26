const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');
const mongoose = require('mongoose');

class ContentAutomation {
  constructor(logger) {
    this.logger = logger;
    this.isInitialized = false;
    this.contentHistory = [];
    this.contentSources = {
      github: {
        enabled: true,
        repos: ['irfanwebdevai/coded'],
        updateInterval: 24 * 60 * 60 * 1000 // 24 hours
      },
      external: {
        enabled: true,
        sources: [
          'https://docs.python.org/3/tutorial/',
          'https://realpython.com/',
          'https://www.w3schools.com/python/'
        ],
        updateInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    };
    this.lastUpdate = null;
  }

  async initialize() {
    try {
      // Load content history
      await this.loadContentHistory();
      
      // Initialize content directories
      await this.initializeContentDirectories();
      
      this.isInitialized = true;
      this.logger.info('ContentAutomation module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ContentAutomation module:', error);
      throw error;
    }
  }

  async initializeContentDirectories() {
    const contentDir = path.join(__dirname, '../content');
    const directories = [
      'lessons',
      'exercises',
      'templates',
      'assets',
      'backups'
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(contentDir, dir));
    }
  }

  async checkForUpdates() {
    if (!this.isInitialized) {
      throw new Error('ContentAutomation module not initialized');
    }

    this.logger.info('Checking for content updates...');
    const updates = [];

    try {
      // Check GitHub repositories for updates
      if (this.contentSources.github.enabled) {
        const githubUpdates = await this.checkGitHubUpdates();
        updates.push(...githubUpdates);
      }

      // Check external sources for updates
      if (this.contentSources.external.enabled) {
        const externalUpdates = await this.checkExternalUpdates();
        updates.push(...externalUpdates);
      }

      // Check for local content changes
      const localUpdates = await this.checkLocalContentChanges();
      updates.push(...localUpdates);

      this.lastUpdate = new Date();
      this.logger.info(`Found ${updates.length} content updates`);

      return updates;

    } catch (error) {
      this.logger.error('Failed to check for content updates:', error);
      throw error;
    }
  }

  async checkGitHubUpdates() {
    const updates = [];

    for (const repo of this.contentSources.github.repos) {
      try {
        const [owner, repoName] = repo.split('/');
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/commits`;
        
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: {
            per_page: 10,
            since: this.lastUpdate ? this.lastUpdate.toISOString() : undefined
          }
        });

        if (response.data.length > 0) {
          updates.push({
            source: 'github',
            repository: repo,
            commits: response.data.length,
            latestCommit: response.data[0].sha,
            timestamp: new Date(response.data[0].commit.author.date)
          });
        }

      } catch (error) {
        this.logger.warn(`Failed to check GitHub repository ${repo}:`, error.message);
      }
    }

    return updates;
  }

  async checkExternalUpdates() {
    const updates = [];

    for (const source of this.contentSources.external.sources) {
      try {
        const response = await axios.get(source, { timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        // Check for last modified header
        const lastModified = response.headers['last-modified'];
        if (lastModified) {
          const lastModifiedDate = new Date(lastModified);
          
          if (!this.lastUpdate || lastModifiedDate > this.lastUpdate) {
            updates.push({
              source: 'external',
              url: source,
              lastModified: lastModifiedDate,
              title: $('title').text() || source,
              contentLength: response.data.length
            });
          }
        }

      } catch (error) {
        this.logger.warn(`Failed to check external source ${source}:`, error.message);
      }
    }

    return updates;
  }

  async checkLocalContentChanges() {
    const updates = [];
    const contentDir = path.join(__dirname, '../content');

    try {
      const files = await this.getContentFiles(contentDir);
      
      for (const file of files) {
        const stats = await fs.stat(file);
        const relativePath = path.relative(contentDir, file);
        
        // Check if file was modified since last update
        if (!this.lastUpdate || stats.mtime > this.lastUpdate) {
          updates.push({
            source: 'local',
            file: relativePath,
            modified: stats.mtime,
            size: stats.size
          });
        }
      }

    } catch (error) {
      this.logger.warn('Failed to check local content changes:', error.message);
    }

    return updates;
  }

  async getContentFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          files.push(...await this.getContentFiles(fullPath));
        } else if (stats.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to read directory ${dir}:`, error.message);
    }

    return files;
  }

  async updateContent(options = {}) {
    if (!this.isInitialized) {
      throw new Error('ContentAutomation module not initialized');
    }

    const {
      source = 'all',
      force = false,
      backup = true
    } = options;

    const updateId = this.generateUpdateId();
    const startTime = Date.now();

    const update = {
      id: updateId,
      source,
      status: 'pending',
      startTime: new Date(),
      changes: [],
      errors: [],
      duration: 0
    };

    try {
      this.logger.info(`Starting content update ${updateId} from ${source}`);

      // Create backup if requested
      if (backup) {
        await this.createContentBackup(update);
      }

      // Update content based on source
      switch (source) {
        case 'github':
          update.changes = await this.updateFromGitHub(update);
          break;
        case 'external':
          update.changes = await this.updateFromExternal(update);
          break;
        case 'local':
          update.changes = await this.updateFromLocal(update);
          break;
        case 'all':
          update.changes = [
            ...await this.updateFromGitHub(update),
            ...await this.updateFromExternal(update),
            ...await this.updateFromLocal(update)
          ];
          break;
        default:
          throw new Error(`Unknown content source: ${source}`);
      }

      // Update database content if needed
      await this.updateDatabaseContent(update);

      // Generate content index
      await this.generateContentIndex(update);

      update.status = 'success';
      update.duration = Date.now() - startTime;

      this.logger.info(`Content update ${updateId} completed successfully in ${update.duration}ms`);

      // Store update record
      await this.storeContentUpdate(update);

      return update;

    } catch (error) {
      update.status = 'failed';
      update.errors.push(error.message);
      update.duration = Date.now() - startTime;

      this.logger.error(`Content update ${updateId} failed:`, error);
      await this.storeContentUpdate(update);

      throw error;
    }
  }

  async createContentBackup(update) {
    const contentDir = path.join(__dirname, '../content');
    const backupDir = path.join(__dirname, '../content/backups');
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const backupPath = path.join(backupDir, `backup_${timestamp}`);

    try {
      await fs.copy(contentDir, backupPath, {
        filter: (src) => !src.includes('backups') // Don't copy backups directory
      });

      update.changes.push({
        type: 'backup',
        path: backupPath,
        timestamp: new Date()
      });

      this.logger.info(`Content backup created: ${backupPath}`);
    } catch (error) {
      this.logger.warn('Failed to create content backup:', error.message);
    }
  }

  async updateFromGitHub(update) {
    const changes = [];

    for (const repo of this.contentSources.github.repos) {
      try {
        const [owner, repoName] = repo.split('/');
        
        // Get repository content
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents`;
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        for (const item of response.data) {
          if (item.type === 'file' && this.isContentFile(item.name)) {
            const fileContent = await this.downloadGitHubFile(item.download_url);
            const localPath = path.join(__dirname, '../content', item.path);
            
            await fs.ensureDir(path.dirname(localPath));
            await fs.writeFile(localPath, fileContent);

            changes.push({
              type: 'github',
              file: item.path,
              action: 'updated',
              size: item.size,
              sha: item.sha
            });
          }
        }

      } catch (error) {
        update.errors.push(`GitHub update failed for ${repo}: ${error.message}`);
        this.logger.warn(`Failed to update from GitHub repository ${repo}:`, error.message);
      }
    }

    return changes;
  }

  async updateFromExternal(update) {
    const changes = [];

    for (const source of this.contentSources.external.sources) {
      try {
        const response = await axios.get(source, { timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        // Extract content based on source type
        const content = this.extractContentFromSource(source, $);
        
        if (content) {
          const fileName = this.generateFileNameFromUrl(source);
          const filePath = path.join(__dirname, '../content/external', fileName);
          
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, content);

          changes.push({
            type: 'external',
            source: source,
            file: fileName,
            action: 'updated',
            size: content.length
          });
        }

      } catch (error) {
        update.errors.push(`External update failed for ${source}: ${error.message}`);
        this.logger.warn(`Failed to update from external source ${source}:`, error.message);
      }
    }

    return changes;
  }

  async updateFromLocal(update) {
    const changes = [];
    const contentDir = path.join(__dirname, '../content');

    try {
      const files = await this.getContentFiles(contentDir);
      
      for (const file of files) {
        const relativePath = path.relative(contentDir, file);
        const stats = await fs.stat(file);
        
        // Process content file
        const processed = await this.processContentFile(file);
        
        if (processed) {
          changes.push({
            type: 'local',
            file: relativePath,
            action: 'processed',
            size: stats.size,
            processed: true
          });
        }
      }

    } catch (error) {
      update.errors.push(`Local update failed: ${error.message}`);
      this.logger.warn('Failed to update local content:', error.message);
    }

    return changes;
  }

  async updateDatabaseContent(update) {
    try {
      // Update lesson content in database
      const lessonFiles = await this.getContentFiles(path.join(__dirname, '../content/lessons'));
      
      for (const file of lessonFiles) {
        if (file.endsWith('.json')) {
          const lessonData = await fs.readJson(file);
          await this.updateLessonInDatabase(lessonData);
          
          update.changes.push({
            type: 'database',
            collection: 'lessons',
            action: 'updated',
            file: path.basename(file)
          });
        }
      }

    } catch (error) {
      update.errors.push(`Database update failed: ${error.message}`);
      this.logger.warn('Failed to update database content:', error.message);
    }
  }

  async updateLessonInDatabase(lessonData) {
    try {
      // This would update the lesson in your MongoDB database
      // Implementation depends on your database schema
      const Lesson = mongoose.model('Lesson');
      
      await Lesson.findOneAndUpdate(
        { lessonId: lessonData.lessonId },
        lessonData,
        { upsert: true, new: true }
      );

    } catch (error) {
      this.logger.warn(`Failed to update lesson ${lessonData.lessonId}:`, error.message);
    }
  }

  async generateContentIndex(update) {
    try {
      const contentDir = path.join(__dirname, '../content');
      const index = {
        generated: new Date(),
        lessons: [],
        exercises: [],
        templates: [],
        assets: []
      };

      // Index lessons
      const lessonFiles = await this.getContentFiles(path.join(contentDir, 'lessons'));
      for (const file of lessonFiles) {
        if (file.endsWith('.json')) {
          const lessonData = await fs.readJson(file);
          index.lessons.push({
            id: lessonData.lessonId,
            title: lessonData.title,
            chapter: lessonData.chapter,
            file: path.relative(contentDir, file)
          });
        }
      }

      // Index exercises
      const exerciseFiles = await this.getContentFiles(path.join(contentDir, 'exercises'));
      for (const file of exerciseFiles) {
        if (file.endsWith('.json')) {
          const exerciseData = await fs.readJson(file);
          index.exercises.push({
            id: exerciseData.exerciseId,
            title: exerciseData.title,
            difficulty: exerciseData.difficulty,
            file: path.relative(contentDir, file)
          });
        }
      }

      // Save index
      const indexPath = path.join(contentDir, 'content-index.json');
      await fs.writeJson(indexPath, index, { spaces: 2 });

      update.changes.push({
        type: 'index',
        action: 'generated',
        file: 'content-index.json',
        items: index.lessons.length + index.exercises.length
      });

    } catch (error) {
      update.errors.push(`Index generation failed: ${error.message}`);
      this.logger.warn('Failed to generate content index:', error.message);
    }
  }

  isContentFile(filename) {
    const contentExtensions = ['.json', '.md', '.txt', '.html', '.js', '.css'];
    return contentExtensions.some(ext => filename.endsWith(ext));
  }

  async downloadGitHubFile(url) {
    const response = await axios.get(url);
    return response.data;
  }

  extractContentFromSource(source, $) {
    // Extract main content based on source type
    if (source.includes('python.org')) {
      return $('main, .content, #content').text() || $.text();
    } else if (source.includes('realpython.com')) {
      return $('article, .content, .post-content').text() || $.text();
    } else {
      return $('body').text();
    }
  }

  generateFileNameFromUrl(url) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '_');
    return `${urlObj.hostname}${pathname}.txt`;
  }

  async processContentFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Process content based on file type
      if (filePath.endsWith('.md')) {
        return this.processMarkdownContent(content);
      } else if (filePath.endsWith('.json')) {
        return this.processJsonContent(content);
      }
      
      return true;
    } catch (error) {
      this.logger.warn(`Failed to process content file ${filePath}:`, error.message);
      return false;
    }
  }

  processMarkdownContent(content) {
    // Process markdown content (e.g., extract metadata, validate structure)
    return true;
  }

  processJsonContent(content) {
    // Process JSON content (e.g., validate schema, extract metadata)
    return true;
  }

  generateUpdateId() {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async storeContentUpdate(update) {
    // Keep only last 50 updates in memory
    this.contentHistory.push(update);
    if (this.contentHistory.length > 50) {
      this.contentHistory.shift();
    }

    // Save to file for persistence
    try {
      const updatesDir = path.join(__dirname, '../content/updates');
      await fs.ensureDir(updatesDir);
      
      const filename = `update-${moment().format('YYYY-MM-DD')}.json`;
      const filePath = path.join(updatesDir, filename);
      
      let updates = [];
      if (await fs.pathExists(filePath)) {
        updates = await fs.readJson(filePath);
      }
      
      updates.push(update);
      await fs.writeJson(filePath, updates, { spaces: 2 });
    } catch (error) {
      this.logger.warn('Failed to save content update:', error.message);
    }
  }

  async loadContentHistory() {
    try {
      const updatesDir = path.join(__dirname, '../content/updates');
      if (await fs.pathExists(updatesDir)) {
        const files = await fs.readdir(updatesDir);
        const updateFiles = files.filter(f => f.startsWith('update-') && f.endsWith('.json'));
        
        for (const file of updateFiles.slice(-10)) { // Load last 10 days
          const updates = await fs.readJson(path.join(updatesDir, file));
          this.contentHistory.push(...updates);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load content history:', error.message);
    }
  }

  async getContentStats() {
    const contentDir = path.join(__dirname, '../content');
    
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: {},
      byDirectory: {},
      lastUpdate: this.lastUpdate
    };

    try {
      const files = await this.getContentFiles(contentDir);
      
      for (const file of files) {
        const stats = await fs.stat(file);
        const ext = path.extname(file);
        const dir = path.relative(contentDir, path.dirname(file));
        
        stats.totalFiles++;
        stats.totalSize += stats.size;
        
        stats.byType[ext] = (stats.byType[ext] || 0) + 1;
        stats.byDirectory[dir] = (stats.byDirectory[dir] || 0) + 1;
      }

    } catch (error) {
      this.logger.warn('Failed to get content stats:', error.message);
    }

    return stats;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      lastUpdate: this.lastUpdate,
      totalUpdates: this.contentHistory.length,
      sources: Object.keys(this.contentSources).filter(key => this.contentSources[key].enabled),
      recentUpdates: this.contentHistory.slice(-5)
    };
  }

  async shutdown() {
    this.logger.info('ContentAutomation module shutting down');
    // Cleanup any ongoing content processing
  }
}

module.exports = ContentAutomation;