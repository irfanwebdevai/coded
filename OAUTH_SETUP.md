# OAuth Setup Instructions

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
     - Add your production domain when deploying
5. Copy the Client ID and Client Secret
6. Update your environment variables or replace in `config/passport.js`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

## GitHub OAuth Setup

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: Codedx
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy the Client ID and Client Secret
6. Update your environment variables or replace in `config/passport.js`:
   ```
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Visit:
   - Main site: http://localhost:3000
   - Sign up: http://localhost:3000/auth/signup
   - Login: http://localhost:3000/auth/login

## Features

- ✅ Email/Password authentication
- ✅ Google OAuth login
- ✅ GitHub OAuth login  
- ✅ Password hashing with bcrypt
- ✅ Session management with MongoDB
- ✅ Flash messages for feedback
- ✅ Protected routes
- ✅ User dashboard
- ✅ Responsive pixel retro design

## Database

The app connects to your MongoDB database:
```
mongodb+srv://irfan:504200@cluster0.zu2ptmv.mongodb.net/codedx
```

Users will be stored in the `users` collection with the following schema:
- Email, password (hashed), name, avatar
- OAuth IDs (googleId, githubId)
- Provider info, verification status
- Created/last login timestamps 