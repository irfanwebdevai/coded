const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');
const moment = require('moment');
const AWS = require('aws-sdk');

class DeploymentAutomation {
  constructor(logger) {
    this.logger = logger;
    this.isInitialized = false;
    this.deploymentHistory = [];
    this.git = simpleGit();
    this.currentBranch = null;
    this.deploymentConfig = {
      environments: {
        development: {
          branch: 'develop',
          autoDeploy: true,
          platform: 'vercel',
          domain: process.env.DEV_DOMAIN
        },
        staging: {
          branch: 'staging',
          autoDeploy: true,
          platform: 'vercel',
          domain: process.env.STAGING_DOMAIN
        },
        production: {
          branch: 'main',
          autoDeploy: false, // Manual approval required
          platform: 'vercel',
          domain: process.env.PROD_DOMAIN
        }
      },
      platforms: {
        vercel: {
          command: 'vercel',
          configFile: 'vercel.json'
        },
        aws: {
          command: 'aws',
          configFile: 'aws-config.json'
        },
        netlify: {
          command: 'netlify',
          configFile: 'netlify.toml'
        }
      }
    };
  }

  async initialize() {
    try {
      // Get current git branch
      this.currentBranch = await this.git.branch();
      
      // Load deployment history
      await this.loadDeploymentHistory();
      
      // Configure AWS if credentials are available
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        AWS.config.update({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        });
      }
      
      this.isInitialized = true;
      this.logger.info('DeploymentAutomation module initialized');
    } catch (error) {
      this.logger.error('Failed to initialize DeploymentAutomation module:', error);
      throw error;
    }
  }

  async deploy(options = {}) {
    if (!this.isInitialized) {
      throw new Error('DeploymentAutomation module not initialized');
    }

    const {
      environment = 'staging',
      platform = 'vercel',
      force = false,
      skipTests = false,
      buildCommand = 'npm run build',
      deployCommand = null
    } = options;

    const deploymentId = this.generateDeploymentId();
    const startTime = Date.now();

    const deployment = {
      id: deploymentId,
      environment,
      platform,
      status: 'pending',
      startTime: new Date(),
      branch: this.currentBranch.current,
      commit: null,
      buildLog: [],
      deployLog: [],
      error: null,
      duration: 0
    };

    try {
      this.logger.info(`Starting deployment ${deploymentId} to ${environment} (${platform})`);

      // Pre-deployment checks
      await this.preDeploymentChecks(deployment, { skipTests });

      // Get current commit
      const commit = await this.git.log(['-1']);
      deployment.commit = commit.latest;

      // Run tests (if not skipped)
      if (!skipTests) {
        await this.runTests(deployment);
      }

      // Build the application
      await this.buildApplication(deployment, { buildCommand });

      // Deploy to platform
      await this.deployToPlatform(deployment, { platform, deployCommand });

      // Post-deployment checks
      await this.postDeploymentChecks(deployment, { environment });

      // Update deployment status
      deployment.status = 'success';
      deployment.duration = Date.now() - startTime;

      this.logger.info(`Deployment ${deploymentId} completed successfully in ${deployment.duration}ms`);

      // Store deployment record
      await this.storeDeployment(deployment);

      return deployment;

    } catch (error) {
      deployment.status = 'failed';
      deployment.error = error.message;
      deployment.duration = Date.now() - startTime;

      this.logger.error(`Deployment ${deploymentId} failed:`, error);
      await this.storeDeployment(deployment);

      throw error;
    }
  }

  async preDeploymentChecks(deployment, options) {
    this.logger.info('Running pre-deployment checks...');
    deployment.buildLog.push('Running pre-deployment checks...');

    // Check if we're on the correct branch
    const envConfig = this.deploymentConfig.environments[deployment.environment];
    if (envConfig && envConfig.branch && this.currentBranch.current !== envConfig.branch) {
      throw new Error(`Deployment to ${deployment.environment} requires branch '${envConfig.branch}', but current branch is '${this.currentBranch.current}'`);
    }

    // Check for uncommitted changes
    const status = await this.git.status();
    if (status.modified.length > 0 || status.created.length > 0 || status.deleted.length > 0) {
      if (!options.force) {
        throw new Error('There are uncommitted changes. Use --force to deploy anyway.');
      }
      deployment.buildLog.push('Warning: Deploying with uncommitted changes');
    }

    // Check if package.json exists
    if (!await fs.pathExists('package.json')) {
      throw new Error('package.json not found in current directory');
    }

    // Check if build script exists
    const packageJson = await fs.readJson('package.json');
    if (!packageJson.scripts || !packageJson.scripts.build) {
      throw new Error('No build script found in package.json');
    }

    deployment.buildLog.push('Pre-deployment checks passed');
  }

  async runTests(deployment) {
    this.logger.info('Running tests...');
    deployment.buildLog.push('Running tests...');

    return new Promise((resolve, reject) => {
      const testProcess = exec('npm test', { cwd: process.cwd() });
      
      testProcess.stdout.on('data', (data) => {
        deployment.buildLog.push(`TEST: ${data.toString().trim()}`);
      });

      testProcess.stderr.on('data', (data) => {
        deployment.buildLog.push(`TEST ERROR: ${data.toString().trim()}`);
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          deployment.buildLog.push('Tests passed');
          resolve();
        } else {
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });
    });
  }

  async buildApplication(deployment, options) {
    this.logger.info('Building application...');
    deployment.buildLog.push('Building application...');

    return new Promise((resolve, reject) => {
      const buildProcess = exec(options.buildCommand, { cwd: process.cwd() });
      
      buildProcess.stdout.on('data', (data) => {
        deployment.buildLog.push(`BUILD: ${data.toString().trim()}`);
      });

      buildProcess.stderr.on('data', (data) => {
        deployment.buildLog.push(`BUILD ERROR: ${data.toString().trim()}`);
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          deployment.buildLog.push('Build completed successfully');
          resolve();
        } else {
          reject(new Error(`Build failed with exit code ${code}`));
        }
      });
    });
  }

  async deployToPlatform(deployment, options) {
    this.logger.info(`Deploying to ${options.platform}...`);
    deployment.deployLog.push(`Deploying to ${options.platform}...`);

    switch (options.platform) {
      case 'vercel':
        return this.deployToVercel(deployment, options);
      case 'aws':
        return this.deployToAWS(deployment, options);
      case 'netlify':
        return this.deployToNetlify(deployment, options);
      default:
        throw new Error(`Unsupported platform: ${options.platform}`);
    }
  }

  async deployToVercel(deployment, options) {
    return new Promise((resolve, reject) => {
      const deployCommand = options.deployCommand || 'vercel --prod';
      const deployProcess = exec(deployCommand, { cwd: process.cwd() });
      
      deployProcess.stdout.on('data', (data) => {
        deployment.deployLog.push(`VERCEL: ${data.toString().trim()}`);
      });

      deployProcess.stderr.on('data', (data) => {
        deployment.deployLog.push(`VERCEL ERROR: ${data.toString().trim()}`);
      });

      deployProcess.on('close', (code) => {
        if (code === 0) {
          deployment.deployLog.push('Vercel deployment completed');
          resolve();
        } else {
          reject(new Error(`Vercel deployment failed with exit code ${code}`));
        }
      });
    });
  }

  async deployToAWS(deployment, options) {
    // AWS deployment implementation
    // This would use AWS CLI or SDK to deploy to S3, CloudFront, etc.
    deployment.deployLog.push('AWS deployment not yet implemented');
    throw new Error('AWS deployment not yet implemented');
  }

  async deployToNetlify(deployment, options) {
    return new Promise((resolve, reject) => {
      const deployCommand = options.deployCommand || 'netlify deploy --prod';
      const deployProcess = exec(deployCommand, { cwd: process.cwd() });
      
      deployProcess.stdout.on('data', (data) => {
        deployment.deployLog.push(`NETLIFY: ${data.toString().trim()}`);
      });

      deployProcess.stderr.on('data', (data) => {
        deployment.deployLog.push(`NETLIFY ERROR: ${data.toString().trim()}`);
      });

      deployProcess.on('close', (code) => {
        if (code === 0) {
          deployment.deployLog.push('Netlify deployment completed');
          resolve();
        } else {
          reject(new Error(`Netlify deployment failed with exit code ${code}`));
        }
      });
    });
  }

  async postDeploymentChecks(deployment, options) {
    this.logger.info('Running post-deployment checks...');
    deployment.deployLog.push('Running post-deployment checks...');

    // Check if the deployment is accessible
    const envConfig = this.deploymentConfig.environments[deployment.environment];
    if (envConfig && envConfig.domain) {
      try {
        const axios = require('axios');
        const response = await axios.get(`https://${envConfig.domain}`, {
          timeout: 10000,
          validateStatus: () => true // Accept any status code
        });
        
        if (response.status === 200) {
          deployment.deployLog.push(`Deployment accessible at https://${envConfig.domain}`);
        } else {
          deployment.deployLog.push(`Warning: Deployment returned status ${response.status}`);
        }
      } catch (error) {
        deployment.deployLog.push(`Warning: Could not verify deployment accessibility: ${error.message}`);
      }
    }

    deployment.deployLog.push('Post-deployment checks completed');
  }

  async autoDeploy() {
    // Check if current branch should auto-deploy
    const currentBranch = this.currentBranch.current;
    
    for (const [environment, config] of Object.entries(this.deploymentConfig.environments)) {
      if (config.branch === currentBranch && config.autoDeploy) {
        this.logger.info(`Auto-deploying to ${environment} for branch ${currentBranch}`);
        
        try {
          await this.deploy({
            environment,
            platform: config.platform,
            skipTests: false
          });
        } catch (error) {
          this.logger.error(`Auto-deployment to ${environment} failed:`, error);
          throw error;
        }
      }
    }
  }

  async rollback(deploymentId) {
    const deployment = this.deploymentHistory.find(d => d.id === deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    this.logger.info(`Rolling back deployment ${deploymentId}`);

    // Implementation would depend on the platform
    // For Vercel, you might use their rollback API
    // For AWS, you might restore from a previous version
    
    throw new Error('Rollback functionality not yet implemented');
  }

  generateDeploymentId() {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async storeDeployment(deployment) {
    // Keep only last 100 deployments in memory
    this.deploymentHistory.push(deployment);
    if (this.deploymentHistory.length > 100) {
      this.deploymentHistory.shift();
    }

    // Save to file for persistence
    try {
      const deploymentsDir = path.join(__dirname, '../deployments');
      await fs.ensureDir(deploymentsDir);
      
      const filename = `deployment-${moment().format('YYYY-MM-DD')}.json`;
      const filePath = path.join(deploymentsDir, filename);
      
      let deployments = [];
      if (await fs.pathExists(filePath)) {
        deployments = await fs.readJson(filePath);
      }
      
      deployments.push(deployment);
      await fs.writeJson(filePath, deployments, { spaces: 2 });
    } catch (error) {
      this.logger.warn('Failed to save deployment record:', error.message);
    }
  }

  async loadDeploymentHistory() {
    try {
      const deploymentsDir = path.join(__dirname, '../deployments');
      if (await fs.pathExists(deploymentsDir)) {
        const files = await fs.readdir(deploymentsDir);
        const deploymentFiles = files.filter(f => f.startsWith('deployment-') && f.endsWith('.json'));
        
        for (const file of deploymentFiles.slice(-5)) { // Load last 5 days
          const deployments = await fs.readJson(path.join(deploymentsDir, file));
          this.deploymentHistory.push(...deployments);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load deployment history:', error.message);
    }
  }

  async getDeploymentStats(days = 30) {
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const recentDeployments = this.deploymentHistory.filter(deployment => 
      new Date(deployment.startTime) > cutoff
    );

    const stats = {
      total: recentDeployments.length,
      successful: recentDeployments.filter(d => d.status === 'success').length,
      failed: recentDeployments.filter(d => d.status === 'failed').length,
      byEnvironment: {},
      byPlatform: {},
      averageDuration: 0
    };

    // Calculate averages and breakdowns
    if (recentDeployments.length > 0) {
      const successfulDeployments = recentDeployments.filter(d => d.status === 'success');
      stats.averageDuration = successfulDeployments.length > 0 ? 
        successfulDeployments.reduce((sum, d) => sum + d.duration, 0) / successfulDeployments.length : 0;

      recentDeployments.forEach(deployment => {
        stats.byEnvironment[deployment.environment] = (stats.byEnvironment[deployment.environment] || 0) + 1;
        stats.byPlatform[deployment.platform] = (stats.byPlatform[deployment.platform] || 0) + 1;
      });
    }

    return stats;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentBranch: this.currentBranch?.current,
      totalDeployments: this.deploymentHistory.length,
      lastDeployment: this.deploymentHistory.length > 0 ? 
        this.deploymentHistory[this.deploymentHistory.length - 1] : null,
      environments: Object.keys(this.deploymentConfig.environments),
      platforms: Object.keys(this.deploymentConfig.platforms)
    };
  }

  async shutdown() {
    this.logger.info('DeploymentAutomation module shutting down');
    // Cleanup any ongoing deployments
  }
}

module.exports = DeploymentAutomation;