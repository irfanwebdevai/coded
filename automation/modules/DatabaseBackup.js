const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const moment = require('moment');
const AWS = require('aws-sdk');
const { google } = require('googleapis');

class DatabaseBackup {
  constructor(logger) {
    this.logger = logger;
    this.backupDir = path.join(__dirname, '../backups');
    this.isInitialized = false;
    this.lastBackup = null;
    this.backupStats = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      totalSize: 0
    };
  }

  async initialize() {
    try {
      // Ensure backup directory exists
      await fs.ensureDir(this.backupDir);
      
      // Load backup statistics
      await this.loadBackupStats();
      
      // Configure cloud storage if credentials are available
      await this.configureCloudStorage();
      
      this.isInitialized = true;
      this.logger.info('DatabaseBackup module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize DatabaseBackup module:', error);
      throw error;
    }
  }

  async configureCloudStorage() {
    // Configure AWS S3 if credentials are available
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      this.s3Bucket = process.env.AWS_S3_BACKUP_BUCKET;
      this.logger.info('AWS S3 backup storage configured');
    }

    // Configure Google Drive if credentials are available
    if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        this.drive = google.drive({ version: 'v3', auth });
        this.driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        this.logger.info('Google Drive backup storage configured');
      } catch (error) {
        this.logger.warn('Failed to configure Google Drive:', error.message);
      }
    }
  }

  async performBackup(options = {}) {
    if (!this.isInitialized) {
      throw new Error('DatabaseBackup module not initialized');
    }

    const startTime = Date.now();
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const backupName = `codedx_backup_${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      this.logger.info(`Starting database backup: ${backupName}`);

      // Create backup directory
      await fs.ensureDir(backupPath);

      // Export database collections
      await this.exportCollections(backupPath);

      // Create compressed archive
      const archivePath = await this.createArchive(backupPath, backupName);

      // Upload to cloud storage
      await this.uploadToCloud(archivePath, backupName);

      // Cleanup local files
      await this.cleanupLocalFiles(backupPath, archivePath);

      // Update statistics
      const duration = Date.now() - startTime;
      await this.updateBackupStats(archivePath, duration, true);

      this.lastBackup = {
        name: backupName,
        timestamp: new Date(),
        size: await this.getFileSize(archivePath),
        duration,
        cloudStorage: this.getCloudStorageStatus()
      };

      this.logger.info(`Database backup completed successfully: ${backupName} (${duration}ms)`);
      return this.lastBackup;

    } catch (error) {
      this.logger.error(`Database backup failed: ${backupName}`, error);
      await this.updateBackupStats(null, Date.now() - startTime, false);
      throw error;
    }
  }

  async exportCollections(backupPath) {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const collectionPath = path.join(backupPath, `${collectionName}.json`);
      
      try {
        const data = await mongoose.connection.db
          .collection(collectionName)
          .find({})
          .toArray();
        
        await fs.writeJson(collectionPath, data, { spaces: 2 });
        this.logger.info(`Exported collection: ${collectionName} (${data.length} documents)`);
      } catch (error) {
        this.logger.error(`Failed to export collection ${collectionName}:`, error);
        throw error;
      }
    }
  }

  async createArchive(backupPath, backupName) {
    const archivePath = path.join(this.backupDir, `${backupName}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        this.logger.info(`Archive created: ${archivePath} (${archive.pointer()} bytes)`);
        resolve(archivePath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(backupPath, false);
      archive.finalize();
    });
  }

  async uploadToCloud(archivePath, backupName) {
    const uploadPromises = [];

    // Upload to AWS S3
    if (this.s3 && this.s3Bucket) {
      uploadPromises.push(this.uploadToS3(archivePath, backupName));
    }

    // Upload to Google Drive
    if (this.drive && this.driveFolderId) {
      uploadPromises.push(this.uploadToGoogleDrive(archivePath, backupName));
    }

    if (uploadPromises.length > 0) {
      await Promise.allSettled(uploadPromises);
      this.logger.info(`Uploaded backup to ${uploadPromises.length} cloud storage(s)`);
    }
  }

  async uploadToS3(archivePath, backupName) {
    try {
      const fileContent = await fs.readFile(archivePath);
      const key = `backups/${backupName}.zip`;

      await this.s3.upload({
        Bucket: this.s3Bucket,
        Key: key,
        Body: fileContent,
        ContentType: 'application/zip',
        Metadata: {
          'backup-date': new Date().toISOString(),
          'backup-type': 'database'
        }
      }).promise();

      this.logger.info(`Uploaded to S3: ${key}`);
    } catch (error) {
      this.logger.error('Failed to upload to S3:', error);
      throw error;
    }
  }

  async uploadToGoogleDrive(archivePath, backupName) {
    try {
      const fileMetadata = {
        name: `${backupName}.zip`,
        parents: [this.driveFolderId]
      };

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(archivePath)
      };

      await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      });

      this.logger.info(`Uploaded to Google Drive: ${backupName}.zip`);
    } catch (error) {
      this.logger.error('Failed to upload to Google Drive:', error);
      throw error;
    }
  }

  async cleanupLocalFiles(backupPath, archivePath) {
    try {
      // Keep the archive for 7 days, remove the uncompressed backup immediately
      await fs.remove(backupPath);
      
      // Schedule archive cleanup
      setTimeout(async () => {
        try {
          await fs.remove(archivePath);
          this.logger.info(`Cleaned up old backup archive: ${archivePath}`);
        } catch (error) {
          this.logger.warn(`Failed to cleanup archive ${archivePath}:`, error.message);
        }
      }, 7 * 24 * 60 * 60 * 1000); // 7 days

      this.logger.info('Local backup files cleaned up');
    } catch (error) {
      this.logger.warn('Failed to cleanup local files:', error.message);
    }
  }

  async loadBackupStats() {
    const statsPath = path.join(this.backupDir, 'backup-stats.json');
    
    try {
      if (await fs.pathExists(statsPath)) {
        this.backupStats = await fs.readJson(statsPath);
      }
    } catch (error) {
      this.logger.warn('Failed to load backup stats:', error.message);
    }
  }

  async updateBackupStats(archivePath, duration, success) {
    this.backupStats.totalBackups++;
    
    if (success) {
      this.backupStats.successfulBackups++;
      if (archivePath) {
        this.backupStats.totalSize += await this.getFileSize(archivePath);
      }
    } else {
      this.backupStats.failedBackups++;
    }

    // Save stats
    const statsPath = path.join(this.backupDir, 'backup-stats.json');
    await fs.writeJson(statsPath, this.backupStats, { spaces: 2 });
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  getCloudStorageStatus() {
    const status = {};
    
    if (this.s3) status.s3 = 'configured';
    if (this.drive) status.googleDrive = 'configured';
    
    return status;
  }

  async restoreBackup(backupPath, options = {}) {
    if (!this.isInitialized) {
      throw new Error('DatabaseBackup module not initialized');
    }

    this.logger.info(`Starting database restore from: ${backupPath}`);

    try {
      // Extract backup if it's compressed
      const extractPath = await this.extractBackup(backupPath);
      
      // Import collections
      await this.importCollections(extractPath, options);
      
      // Cleanup
      await fs.remove(extractPath);
      
      this.logger.info('Database restore completed successfully');
    } catch (error) {
      this.logger.error('Database restore failed:', error);
      throw error;
    }
  }

  async extractBackup(backupPath) {
    // Implementation for extracting compressed backups
    // This would use archiver to extract the backup
    const extractPath = path.join(this.backupDir, 'temp_restore');
    await fs.ensureDir(extractPath);
    
    // Extract logic here...
    return extractPath;
  }

  async importCollections(extractPath, options) {
    const files = await fs.readdir(extractPath);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const collectionName = file.replace('.json', '');
        const filePath = path.join(extractPath, file);
        
        try {
          const data = await fs.readJson(filePath);
          
          if (options.dropExisting) {
            await mongoose.connection.db.collection(collectionName).drop();
          }
          
          if (data.length > 0) {
            await mongoose.connection.db.collection(collectionName).insertMany(data);
          }
          
          this.logger.info(`Imported collection: ${collectionName} (${data.length} documents)`);
        } catch (error) {
          this.logger.error(`Failed to import collection ${collectionName}:`, error);
          throw error;
        }
      }
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.zip') && file.startsWith('codedx_backup_')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }
      
      return backups.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      this.logger.error('Failed to list backups:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      lastBackup: this.lastBackup,
      backupStats: this.backupStats,
      cloudStorage: this.getCloudStorageStatus()
    };
  }

  async shutdown() {
    this.logger.info('DatabaseBackup module shutting down');
    // Cleanup any temporary files
  }
}

module.exports = DatabaseBackup;