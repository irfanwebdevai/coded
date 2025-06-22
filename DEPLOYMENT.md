# 🚀 Codedx Platform - Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **MongoDB Atlas**: Database should be hosted on MongoDB Atlas (not localhost)

## Environment Variables Setup

Before deploying, you need to set up the following environment variables in Vercel:

### Required Environment Variables

```bash
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codedx?retryWrites=true&w=majority

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production-min-32-chars

# OAuth Configuration (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Application Configuration
NODE_ENV=production
```

## Deployment Steps

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (for first deployment)
   - What's your project's name? **codedx-platform**
   - In which directory is your code located? **./**

5. **Set Environment Variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add SESSION_SECRET
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   vercel env add GITHUB_CLIENT_ID
   vercel env add GITHUB_CLIENT_SECRET
   ```

6. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Method 2: Vercel Dashboard

1. **Connect GitHub Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**:
   - Framework Preset: **Other**
   - Build Command: `npm run build`
   - Output Directory: Leave empty
   - Install Command: `npm install`

3. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required environment variables listed above

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

## OAuth Redirect URLs

After deployment, update your OAuth application settings:

### Google OAuth
- Authorized JavaScript origins: `https://your-app-name.vercel.app`
- Authorized redirect URIs: `https://your-app-name.vercel.app/auth/google/callback`

### GitHub OAuth
- Authorization callback URL: `https://your-app-name.vercel.app/auth/github/callback`

## Domain Configuration

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update OAuth redirect URLs to use your custom domain

## Post-Deployment Checklist

- [ ] All environment variables are set
- [ ] Database connection is working
- [ ] OAuth authentication is working
- [ ] All pages load correctly
- [ ] User registration/login works
- [ ] Course progression tracking works
- [ ] No console errors in browser

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify MONGODB_URI is correct
   - Ensure MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
   - Check if database user has proper permissions

2. **Session Issues**:
   - Verify SESSION_SECRET is set and at least 32 characters
   - Check if cookies are being set properly

3. **OAuth Not Working**:
   - Verify OAuth credentials are correct
   - Check redirect URLs match exactly
   - Ensure OAuth apps are not in sandbox mode

4. **Static Files Not Loading**:
   - Verify public folder structure
   - Check if files are properly committed to Git

5. **Function Timeout**:
   - Vercel has a 10-second timeout for Hobby plan
   - Optimize database queries
   - Consider upgrading to Pro plan for longer timeouts

## Performance Optimization

1. **Database Optimization**:
   - Use MongoDB indexes for frequently queried fields
   - Implement connection pooling
   - Cache frequently accessed data

2. **Static Assets**:
   - Enable Vercel's automatic static optimization
   - Use CDN for images and fonts
   - Compress CSS and JavaScript

3. **Monitoring**:
   - Use Vercel Analytics
   - Monitor function execution times
   - Set up error tracking

## Security Considerations

1. **Environment Variables**:
   - Never commit secrets to Git
   - Use strong, unique SESSION_SECRET
   - Rotate secrets regularly

2. **Database Security**:
   - Use MongoDB Atlas with proper authentication
   - Enable database encryption
   - Regular security updates

3. **HTTPS**:
   - Vercel provides HTTPS by default
   - Ensure all external resources use HTTPS
   - Set secure cookie flags in production

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console for errors
3. Check MongoDB Atlas logs
4. Contact support with specific error messages

## Useful Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm

# Check domain status
vercel domains ls

# Set environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls
```

---

**🎉 Your Codedx platform should now be live on Vercel!**

Visit your deployment URL to start teaching and learning code! 🚀 