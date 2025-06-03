require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');

const app = express();

// Middleware
app.use(express.json());

// Datenbankverbindung
connectDB();

// Routes
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/groups', require('./routes/groups'));
// etc.

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});