const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Try the URI from .env (usually Atlas)
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Atlas connection failed: ${error.message}`);

    // Fallback 1: Local MongoDB
    try {
      console.log('Trying local connection...');
      const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/alumni_dev', {
        serverSelectionTimeoutMS: 2000
      });
      console.log(`Local MongoDB Connected: ${localConn.connection.host}`);
      return;
    } catch (localError) {
      console.log('Local MongoDB not available');
    }

    // Fallback 2: In-memory MongoDB
    console.log('Trying in-memory fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');

      // Try explicit config if standard one fails
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'alumni_db'
        },
        // On Windows, some versions crash with fassert(). Use a stable one if needed.
        binary: {
          version: '6.0.5' // Stable fallback version 
        }
      });

      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
    } catch (memError) {
      console.error(`Fatal: Could not connect to any database: ${memError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
