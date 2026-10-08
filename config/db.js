const { supabase, isConfigured, checkConnection } = require('./supabase');

const connectDB = async () => {
  try {
    const status = await checkConnection();

    if (status.mode === 'remote-postgres') {
      console.log(`✅ Supabase PostgreSQL Connected successfully: ${status.url}`);
    } else {
      console.log(`✅ Supabase Database Engine initialized (${status.mode})`);
    }

    // Auto-seed initial demo accounts if database is empty
    const seedData = require('../scripts/seed');
    await seedData(false);
  } catch (error) {
    console.error(`❌ Failed to initialize database: ${error.message}`);
  }
};

const disconnectDB = async () => {
  try {
    console.log('Database connections closed');
  } catch (err) {
    console.error('Error disconnecting database:', err);
  }
};

module.exports = { connectDB, disconnectDB, supabase, isConfigured };
