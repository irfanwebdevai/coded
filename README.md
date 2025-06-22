# 🛡️ Codedx Platform - Master the Art of Code

A modern, interactive EdTech platform designed with a pixel art aesthetic and gamified learning experience. Built with Node.js, Express, MongoDB, and deployed on Vercel.

![Codedx Platform](https://img.shields.io/badge/Codedx-Platform-purple?style=for-the-badge&logo=code&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.18-blue?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)

## ✨ Features

### 🎮 Gamified Learning Experience
- **XP System**: Earn experience points for completing lessons
- **Progress Tracking**: Visual progress indicators and completion status
- **Achievement System**: Unlock achievements as you advance
- **Streaks**: Maintain learning streaks for bonus rewards

### 🐍 Comprehensive Python Course
- **10 Chapters**: From basics to advanced concepts
- **50+ Lessons**: Interactive coding exercises
- **Real-time Code Editor**: Practice coding directly in the browser
- **Instant Feedback**: Get immediate feedback on your code

### 🔐 Advanced Authentication
- **Email/Password**: Traditional registration and login
- **Google OAuth**: Sign in with Google account
- **GitHub OAuth**: Sign in with GitHub account
- **Secure Sessions**: MongoDB-based session storage

### 🎨 Modern UI/UX
- **Pixel Art Aesthetic**: Retro gaming-inspired design
- **3D Button Effects**: Interactive button animations
- **Purple Theme**: Modern color scheme with gradients
- **Mobile Responsive**: Works perfectly on all devices

### 🚀 Performance Optimized
- **Serverless Architecture**: Deployed on Vercel
- **Database Optimization**: MongoDB Atlas with connection pooling
- **Static Asset Caching**: Optimized loading times
- **Rate Limiting**: API protection and abuse prevention

## 🏗️ Technical Architecture

### Backend Stack
- **Node.js 18.x**: Server runtime
- **Express.js**: Web framework
- **MongoDB Atlas**: Cloud database
- **Passport.js**: Authentication middleware
- **EJS**: Template engine

### Frontend Stack
- **Vanilla JavaScript**: Modern ES6+ features
- **CSS3**: Advanced animations and effects
- **Responsive Design**: Mobile-first approach
- **Web Fonts**: Google Fonts integration

### Security Features
- **HTTPS**: Secure connections
- **CSRF Protection**: Cross-site request forgery prevention
- **XSS Protection**: Cross-site scripting prevention
- **Rate Limiting**: API abuse prevention
- **Secure Headers**: Security-first configuration

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- MongoDB Atlas account
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd codedx-platform
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file with:
   ```bash
   MONGODB_URI=your-mongodb-connection-string
   SESSION_SECRET=your-session-secret-min-32-chars
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## 🌐 Deployment

### Vercel Deployment

1. **Prepare for deployment**:
   ```bash
   npm run deploy
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add SESSION_SECRET
   # ... add other variables
   ```

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📖 Course Structure

### Python Programming Course

#### Chapter 1: Hello World & Setup (5 lessons)
- Introduction to Python
- Setting up the environment
- Your first Python program
- Understanding the interpreter
- Basic syntax rules

#### Chapter 2: Variables & Data Types (6 lessons)
- What are variables?
- Numbers and strings
- Boolean values
- Type conversion
- Variable naming conventions
- Practice exercises

#### Chapter 3: Numbers & Math Operations (5 lessons)
- Arithmetic operators
- Order of operations
- Working with integers and floats
- Math functions
- Number formatting

#### Chapter 4: Strings & Text (6 lessons)
- String creation and manipulation
- String methods
- Formatting strings
- Escape characters
- Working with text
- String exercises

#### Chapter 5: Input & Output (4 lessons)
- Getting user input
- Displaying output
- File input/output basics
- Error handling

#### Chapter 6: Conditions & If Statements (7 lessons)
- Boolean logic
- If statements
- Elif and else
- Comparison operators
- Logical operators
- Nested conditions
- Conditional exercises

#### Chapter 7: Loops & Repetition (6 lessons)
- For loops
- While loops
- Loop control statements
- Nested loops
- Loop patterns
- Loop exercises

#### Chapter 8: Lists & Collections (5 lessons)
- Creating lists
- List methods
- List comprehensions
- Tuples and sets
- Working with collections

#### Chapter 9: Functions & Code Reuse (6 lessons)
- Defining functions
- Parameters and arguments
- Return values
- Scope and variables
- Lambda functions
- Function exercises

#### Chapter 10: Final Project & Certificate (1 lesson)
- Capstone project
- Code review
- Certificate generation
- Next steps

## 🎯 User Progress System

### Experience Points (XP)
- **Lesson Completion**: 10 XP + (Chapter × 2) bonus
- **Perfect Code**: Additional 5 XP for error-free solutions
- **Speed Bonus**: Extra XP for quick completion
- **Streak Bonus**: Daily learning streak rewards

### Levels
- **Novice**: 0-100 XP
- **Apprentice**: 101-300 XP
- **Developer**: 301-600 XP
- **Expert**: 601-1000 XP
- **Master**: 1000+ XP

### Achievements
- 🎯 **First Steps**: Complete your first lesson
- 🔥 **On Fire**: Complete 5 lessons in a day
- 📚 **Bookworm**: Complete an entire chapter
- 🏆 **Champion**: Complete the entire course
- ⚡ **Speed Demon**: Complete lessons quickly
- 🎨 **Code Artist**: Write clean, efficient code

## 🔧 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `GET /auth/logout` - User logout
- `GET /auth/google` - Google OAuth
- `GET /auth/github` - GitHub OAuth

### Course & Lessons
- `GET /courses/python` - Python course overview
- `GET /courses/python/lesson/:chapter/:lesson` - Specific lesson

### Progress Tracking
- `POST /api/progress/complete-lesson` - Mark lesson as complete
- `GET /api/progress/stats` - Get user progress statistics

### System
- `GET /api/health` - Health check endpoint

## 🛠️ Development Scripts

```bash
# Development
npm run dev          # Start development server with nodemon
npm start           # Start production server

# Deployment
npm run deploy      # Run deployment helper
npm run vercel-build # Vercel build command
npm run deploy-vercel # Deploy to Vercel production

# Utilities
npm test           # Run tests (coming soon)
npm run lint       # Run linting (coming soon)
```

## 🔒 Security Features

- **Environment Variables**: Sensitive data protection
- **Session Security**: Secure cookie configuration
- **Rate Limiting**: API abuse prevention
- **Input Validation**: SQL injection prevention
- **XSS Protection**: Cross-site scripting prevention
- **CSRF Protection**: Cross-site request forgery prevention
- **HTTPS Enforcement**: Secure connections only

## 🎨 Design System

### Colors
- **Primary Purple**: `#8b5cf6`
- **Secondary Gold**: `#fbbf24`
- **Dark Background**: `#0f172a`
- **Text Light**: `#e2e8f0`
- **Success Green**: `#10b981`
- **Error Red**: `#ef4444`

### Typography
- **Headers**: Press Start 2P (Pixel font)
- **Body Text**: VT323 (Monospace)
- **Code**: Monospace system fonts

### Components
- **3D Buttons**: Physical button effects with shadows
- **Gradient Cards**: Modern card designs with gradients
- **Animated Icons**: Smooth icon animations
- **Progress Bars**: Animated progress indicators

## 📱 Mobile Optimization

- **Responsive Design**: Works on all screen sizes
- **Touch Friendly**: Optimized for touch interactions
- **Fast Loading**: Optimized assets and lazy loading
- **Offline Ready**: Service worker implementation (coming soon)

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check our [DEPLOYMENT.md](DEPLOYMENT.md) guide
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join our GitHub Discussions
- **Email**: support@codedx.com (coming soon)

## 🗺️ Roadmap

### Version 2.0
- [ ] JavaScript course
- [ ] HTML/CSS course
- [ ] Code challenges
- [ ] Community features
- [ ] Mobile app

### Version 3.0
- [ ] AI-powered code review
- [ ] Collaborative coding
- [ ] Live coding sessions
- [ ] Advanced analytics

---

**Built with ❤️ by the Codedx Team**

*Master the Art of Code* 🚀 