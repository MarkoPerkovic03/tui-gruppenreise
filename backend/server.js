require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const app = express();

// Verbindung zur Datenbank herstellen
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite Dev Server
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/groups', require('./routes/groups'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
});