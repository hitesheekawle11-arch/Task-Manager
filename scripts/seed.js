// Load environment variables FIRST before any other requires that depend on them
if (require.main === module) {
  require('dotenv').config();
}

const User = require('../models/User');
const Category = require('../models/Category');
const Task = require('../models/Task');

const seedData = async (shouldClear = false) => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0 && !shouldClear) {
      return;
    }

    if (shouldClear) {
      console.log('🧹 Clearing existing database records...');
      await User.deleteMany({});
      await Category.deleteMany({});
      await Task.deleteMany({});
    }

    console.log('👤 Seeding demo users...');
    const adminUser = await User.create({
      name: 'Admin Director',
      email: 'admin@taskmanager.com',
      password: 'password123',
      role: 'admin',
      bio: 'Lead project coordinator & system admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    });

    const demoUser = await User.create({
      name: 'Alex Rivera',
      email: 'alex@taskmanager.com',
      password: 'password123',
      role: 'user',
      bio: 'Full-stack software developer & productivity enthusiast',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    });

    console.log('📁 Seeding categories for demo user...');
    const categories = await Category.insertMany([
      { name: 'Engineering', color: '#3b82f6', icon: '💻', description: 'Core software development', user: demoUser._id },
      { name: 'Marketing', color: '#ec4899', icon: '🚀', description: 'Product marketing and launch', user: demoUser._id },
      { name: 'Personal', color: '#10b981', icon: '🏡', description: 'Personal life and fitness', user: demoUser._id },
      { name: 'Academics', color: '#8b5cf6', icon: '🎓', description: 'Continuous learning & certifications', user: demoUser._id },
    ]);

    // Also give admin user default categories
    await Category.insertMany([
      { name: 'Operations', color: '#6366f1', icon: '⚙️', description: 'System operations', user: adminUser._id },
      { name: 'Management', color: '#f59e0b', icon: '📊', description: 'Team management', user: adminUser._id },
    ]);

    const engCat = categories[0]._id;
    const mktCat = categories[1]._id;
    const persCat = categories[2]._id;
    const acadCat = categories[3]._id;

    const today = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log('📝 Seeding sample tasks...');
    await Task.insertMany([
      {
        title: 'Architect Secure Authentication Layer',
        description: 'Implement JWT tokens, bcrypt hash validation, refresh mechanism and role-based route guards.',
        status: 'Completed',
        priority: 'Urgent',
        dueDate: yesterday,
        category: engCat,
        tags: ['backend', 'security', 'jwt'],
        user: demoUser._id,
        isFavorite: true,
        subtasks: [
          { title: 'Define User Supabase PostgreSQL schema', completed: true },
          { title: 'Add bcrypt password pre-save hook', completed: true },
          { title: 'Implement JWT sign & verify middleware', completed: true },
        ],
        notes: 'Security audit passed with zero vulnerabilities.',
        completedAt: new Date(),
      },
      {
        title: 'Design Kanban Drag & Drop Task Board',
        description: 'Build native HTML5 Drag and Drop Kanban board supporting To Do, In Progress, and Completed swimlanes with dynamic backend sync.',
        status: 'In Progress',
        priority: 'High',
        dueDate: today,
        category: engCat,
        tags: ['frontend', 'kanban', 'ui'],
        user: demoUser._id,
        isFavorite: true,
        subtasks: [
          { title: 'Build column drop zones', completed: true },
          { title: 'Add dragover & drop event listeners', completed: true },
          { title: 'Trigger PATCH /api/tasks/:id/status on drop', completed: false },
        ],
        notes: 'Ensure touch drag works seamlessly on mobile devices.',
      },
      {
        title: 'Conduct Q2 Marketing Growth Campaign',
        description: 'Coordinate newsletter distribution, social media teaser clips, and analytics tracking.',
        status: 'To Do',
        priority: 'Medium',
        dueDate: tomorrow,
        category: mktCat,
        tags: ['marketing', 'growth', 'q2'],
        user: demoUser._id,
        isFavorite: false,
        subtasks: [
          { title: 'Draft email blast copy', completed: false },
          { title: 'Design social banner graphics', completed: false },
          { title: 'Configure UTM tracking tags', completed: false },
        ],
        notes: 'Target audience: Indie hackers and technical leaders.',
      },
      {
        title: 'Morning 5K Jog & Mobility Routine',
        description: 'Keep fitness consistency high. Run around lake trail and complete 15 min mobility cool-down.',
        status: 'Completed',
        priority: 'Low',
        dueDate: yesterday,
        category: persCat,
        tags: ['fitness', 'health', 'daily'],
        user: demoUser._id,
        isFavorite: false,
        subtasks: [
          { title: '5K run under 26 mins', completed: true },
          { title: 'Hamstring & hip mobility stretches', completed: true },
        ],
        notes: 'Pace: 5:12/km. Felt great!',
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      {
        title: 'Complete Distributed Systems Research Paper',
        description: 'Read the Raft consensus paper and write a 2-page summary highlighting leader election and log replication.',
        status: 'To Do',
        priority: 'High',
        dueDate: nextWeek,
        category: acadCat,
        tags: ['reading', 'consensus', 'distributed'],
        user: demoUser._id,
        isFavorite: true,
        subtasks: [
          { title: 'Read Sections 1 through 5', completed: true },
          { title: 'Outline state machine replication model', completed: false },
          { title: 'Draft summary conclusion', completed: false },
        ],
        notes: 'Raft paper: https://raft.github.io/raft.pdf',
      },
      {
        title: 'Renew Cloud Hosting & Domain SSL Certificates',
        description: 'Verify auto-renew configuration on Namecheap and AWS Route53 records.',
        status: 'To Do',
        priority: 'Urgent',
        dueDate: yesterday,
        category: engCat,
        tags: ['devops', 'infra', 'ssl'],
        user: demoUser._id,
        isFavorite: false,
        subtasks: [
          { title: 'Check SSL expiration dates', completed: true },
          { title: 'Update DNS verification TXT records', completed: false },
        ],
        notes: 'CRITICAL: Must be renewed before weekend cutoff.',
      },
    ]);

    console.log('✅ Demo data ready:');
    console.log('   👤 User: alex@taskmanager.com (password: password123)');
    console.log('   👑 Admin: admin@taskmanager.com (password: password123)');
  } catch (err) {
    console.error('❌ Error in seedData:', err.message);
  }
};

// If run directly from CLI
if (require.main === module) {
  // dotenv already loaded at top of this file
  const { connectDB, disconnectDB } = require('../config/db');
  (async () => {
    await connectDB();
    await seedData(true);
    await disconnectDB();
    process.exit(0);
  })();
}

module.exports = seedData;
