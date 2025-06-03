const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Temporär auskommentiert für Tests
    console.log('⚠️ MongoDB temporär deaktiviert - Server läuft ohne DB');
    // await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reisegruppen');
    // console.log('MongoDB verbunden');
  } catch (error) {
    console.error('MongoDB Verbindungsfehler:', error.message);
  }
};

module.exports = connectDB;