const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Your exact connection string
const MONGODB_URI = 'mongodb+srv://irfan:504200@cluster0.zu2ptmv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// User schema (simplified version)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    googleId: { type: String, sparse: true },
    githubId: { type: String, sparse: true },
    provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);

async function createTestUsers() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!');
        
        console.log('📊 Database Info:');
        console.log('- Database Name:', mongoose.connection.name);
        console.log('- Host:', mongoose.connection.host);
        console.log('- Collections:', await mongoose.connection.db.listCollections().toArray());
        
        // Check existing users
        const existingCount = await User.countDocuments();
        console.log(`📈 Existing users: ${existingCount}`);
        
        // Create test users
        const testUsers = [
            {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                provider: 'local'
            },
            {
                name: 'Jane Smith',
                email: 'jane@example.com',
                password: 'password123',
                provider: 'local'
            },
            {
                name: 'Test User',
                email: 'test@codedx.com',
                password: 'password123',
                provider: 'local'
            }
        ];
        
        console.log('👥 Creating test users...');
        
        for (const userData of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email: userData.email });
                if (existingUser) {
                    console.log(`⚠️  User ${userData.email} already exists, skipping...`);
                    continue;
                }
                
                const user = new User(userData);
                const savedUser = await user.save();
                console.log(`✅ Created user: ${savedUser.name} (${savedUser.email})`);
                console.log(`   - ID: ${savedUser._id}`);
                console.log(`   - Created: ${savedUser.createdAt}`);
            } catch (error) {
                console.log(`❌ Failed to create user ${userData.email}:`, error.message);
            }
        }
        
        // Show final count
        const finalCount = await User.countDocuments();
        console.log(`\n📊 Final user count: ${finalCount}`);
        
        // List all users
        console.log('\n👥 All users in database:');
        const allUsers = await User.find().select('-password');
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.provider} - ${user.createdAt.toISOString()}`);
        });
        
        console.log('\n🎉 Test users created successfully!');
        console.log('🌐 Check your MongoDB Atlas dashboard now!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
createTestUsers(); 