#!/usr/bin/env node

/**
 * Codedx Platform - Vercel Deployment Helper
 * This script helps prepare and deploy the application to Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Codedx Platform - Vercel Deployment Helper\n');

// Check if required files exist
const requiredFiles = [
    'vercel.json',
    'package.json',
    'server.js',
    '.gitignore'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - Found`);
    } else {
        console.log(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Please ensure all files are present.');
    process.exit(1);
}

// Check if Vercel CLI is installed
console.log('\n🔧 Checking Vercel CLI...');
try {
    execSync('vercel --version', { stdio: 'pipe' });
    console.log('✅ Vercel CLI is installed');
} catch (error) {
    console.log('❌ Vercel CLI is not installed');
    console.log('📦 Installing Vercel CLI...');
    try {
        execSync('npm install -g vercel', { stdio: 'inherit' });
        console.log('✅ Vercel CLI installed successfully');
    } catch (installError) {
        console.log('❌ Failed to install Vercel CLI');
        console.log('Please run: npm install -g vercel');
        process.exit(1);
    }
}

// Check environment variables
console.log('\n🔐 Environment Variables Checklist:');
const requiredEnvVars = [
    'MONGODB_URI',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET'
];

console.log('Make sure you have set these environment variables in Vercel:');
requiredEnvVars.forEach(envVar => {
    console.log(`   - ${envVar}`);
});

console.log('\n📝 Pre-deployment checklist:');
console.log('   ✅ All required files are present');
console.log('   ✅ Vercel CLI is installed');
console.log('   ⚠️  Make sure MongoDB Atlas is configured');
console.log('   ⚠️  Make sure OAuth apps are configured');
console.log('   ⚠️  Make sure environment variables are set in Vercel');

console.log('\n🚀 Ready to deploy!');
console.log('\nNext steps:');
console.log('1. Run: vercel login');
console.log('2. Run: vercel');
console.log('3. Follow the prompts');
console.log('4. Set environment variables: vercel env add VARIABLE_NAME');
console.log('5. Redeploy: vercel --prod');

console.log('\n📖 For detailed instructions, see DEPLOYMENT.md');
console.log('\n🎉 Good luck with your deployment!'); 