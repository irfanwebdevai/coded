const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://irfan:504200@cluster0.zu2ptmv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    provider: { type: String, default: 'local' },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);

async function createVisibleUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');
        
        const timestamp = new Date().toISOString().slice(0, 19);
        const uniqueEmail = `user_${Date.now()}@atlas-test.com`;
        
        const newUser = new User({
            name: `Atlas Test User ${timestamp}`,
            email: uniqueEmail,
            password: 'password123',
            provider: 'local'
        });
        
        const savedUser = await newUser.save();
        
        console.log('🎉 NEW USER CREATED IN ATLAS:');
        console.log('- Name:', savedUser.name);
        console.log('- Email:', savedUser.email);
        console.log('- ID:', savedUser._id);
        console.log('- Created:', savedUser.createdAt);
        console.log('- Database:', mongoose.connection.name);
        
        const totalUsers = await User.countDocuments();
        console.log(`📊 Total users in database: ${totalUsers}`);
        
        console.log('\n🌐 GO TO ATLAS NOW:');
        console.log('1. Click "Browse collections"');
        console.log('2. Look for database: "test"');
        console.log('3. Click "users" collection');
        console.log('4. You should see this new user at the top!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

createVisibleUser(); 