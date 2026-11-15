const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/greenfield_cms';
  console.log(`Connecting to MongoDB: ${uri.replace(/\/\/[^@/]*@/, '//***@')}`);
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }); // fail after 8s instead of hanging for 30s
  } catch (err) {
    console.error(`
✖ Could not connect to MongoDB: ${err.message}

  The database is not running or MONGO_URI is wrong. Fix it with ONE of these:
   1. Install MongoDB Community and start it (Windows: start the "MongoDB" service, Mac: brew services start mongodb-community)
   2. Or create a free cluster on MongoDB Atlas, then create server/.env containing:
        MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/greenfield_cms
`);
    throw err;
  }
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};
