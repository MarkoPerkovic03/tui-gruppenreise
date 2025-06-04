require('dotenv').config();
const express = require('express');
const cors = require('cors'); // HINZUFÜGEN
const connectDB = require('./config/database');

const app = express();

// Middleware
app.use(cors()); // HINZUFÜGEN
app.use(express.json());

// Datenbankverbindung
connectDB();

// TEST ROUTE - HINZUFÜGEN
app.get('/', (req, res) => {
  res.json({ message: 'Backend läuft!' });
});

// Routes - AKTIVIEREN!
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});