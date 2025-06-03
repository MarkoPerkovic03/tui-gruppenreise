import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// In-Memory Datenbanken
const groups = [];
const polls = [];
const users = [
  {
    id: 1,
    email: 'demo@tui.com',
    password: 'demo123' // Temporär Klartext für einfaches Testen
  }
];

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const authToken = authHeader && authHeader.split(' ')[1];

  if (!authToken) {
    return res.status(401).json({ message: 'Nicht authentifiziert' });
  }

  jwt.verify(authToken, 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Ungültiger Token' });
    }
    req.user = user;
    next();
  });
};

// Test-Route
app.get('/test', (req, res) => {
  res.json({ message: 'Server läuft!' });
});

// Auth-Routen
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login-Versuch:', req.body);
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      console.log('User nicht gefunden');
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }

    console.log('User gefunden:', user.email);
    
    // Einfacher Klartext-Vergleich für Demo
    if (password === user.password && email === 'demo@tui.com') {
      console.log('✅ Demo-Login erfolgreich');
      
      const userToken = jwt.sign(
        { userId: user.id, email: user.email },
        'your-secret-key',
        { expiresIn: '24h' }
      );

      console.log('✅ Token erstellt, sende Antwort...');
      res.json({ token: userToken, user: { id: user.id, email: user.email } });
    } else {
      console.log('❌ Passwort falsch');
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
});

// Gruppen-Routen - KORRIGIERT: Endpunkte ohne /api prefix
app.get('/api/groups', authenticateToken, (req, res) => {
  const userGroups = groups.filter(group => 
    group.members.some(member => member.email === req.user.email)
  );
  console.log('Gruppen für User:', req.user.email, userGroups);
  res.json(userGroups);
});

app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, description, members } = req.body;
  const newGroup = {
    id: uuidv4(),
    name,
    description,
    members: [
      { email: req.user.email, id: uuidv4(), role: 'admin' },
      ...members.map(email => ({ email, id: uuidv4(), role: 'member' }))
    ],
    createdAt: new Date().toISOString(),
    createdBy: req.user.email
  };
  groups.push(newGroup);
  console.log('Neue Gruppe erstellt:', newGroup);
  res.status(201).json(newGroup);
});

app.get('/api/groups/:id', authenticateToken, (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }
  
  console.log('Gruppendetails geladen:', group);
  res.json(group);
});

// Abstimmungs-Routen - KORRIGIERT
app.get('/api/groups/:id/polls', authenticateToken, (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }
  
  const groupPolls = polls.filter(p => p.groupId === req.params.id);
  console.log('Abstimmungen für Gruppe:', req.params.id, groupPolls);
  res.json(groupPolls);
});

app.post('/api/groups/:id/polls', authenticateToken, (req, res) => {
  const { title, options } = req.body;
  const group = groups.find(g => g.id === req.params.id);
  
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }
  
  const newPoll = {
    id: uuidv4(),
    groupId: req.params.id,
    title,
    options: options.map(text => ({
      id: uuidv4(),
      text,
      votes: 0,
      voters: []
    })),
    totalVotes: 0,
    createdAt: new Date().toISOString(),
    createdBy: req.user.email
  };
  polls.push(newPoll);
  console.log('Neue Abstimmung erstellt:', newPoll);
  res.status(201).json(newPoll);
});

// KORRIGIERT: Abstimmungs-Endpunkt ohne /api prefix
app.post('/polls/:pollId/vote', authenticateToken, (req, res) => {
  const { optionId } = req.body;
  const poll = polls.find(p => p.id === req.params.pollId);
  
  console.log('Abstimmungsversuch:', { pollId: req.params.pollId, optionId, user: req.user.email });
  
  if (!poll) {
    console.log('Abstimmung nicht gefunden:', req.params.pollId);
    return res.status(404).json({ message: 'Abstimmung nicht gefunden' });
  }

  const group = groups.find(g => g.id === poll.groupId);
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }

  const option = poll.options.find(o => o.id === optionId);
  if (!option) {
    console.log('Option nicht gefunden:', optionId);
    return res.status(404).json({ message: 'Option nicht gefunden' });
  }

  // Prüfe, ob der User bereits abgestimmt hat
  const hasVoted = poll.options.some(opt => opt.voters.includes(req.user.email));
  if (hasVoted) {
    console.log('User hat bereits abgestimmt:', req.user.email);
    return res.status(400).json({ message: 'Sie haben bereits abgestimmt' });
  }

  option.votes += 1;
  option.voters.push(req.user.email);
  poll.totalVotes += 1;
  
  console.log('✅ Abstimmung erfolgreich:', { 
    user: req.user.email, 
    option: option.text, 
    votes: option.votes 
  });
  
  res.json(poll);
});

app.listen(port, () => {
  console.log(`🚀 Server läuft auf Port ${port}`);
  console.log(`Test-URL: http://localhost:${port}/test`);
  console.log(`Login-URL: http://localhost:${port}/api/auth/login`);
});