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
    // Passwort: "demo123"
    password: '$2a$10$XFE/UQjM6PpqXkQBj.OIy.HK.L7qW9kPkWq.suVgQVCKbGvN9ZKe2'
  }
];

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Nicht authentifiziert' });
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Ungültiger Token' });
    }
    req.user = user;
    next();
  });
};

// Auth-Routen
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
});

// Gruppen-Routen
app.get('/api/groups', authenticateToken, (req, res) => {
  const userGroups = groups.filter(group => 
    group.members.some(member => member.email === req.user.email)
  );
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
  res.status(201).json(newGroup);
});

app.get('/api/groups/:id', authenticateToken, (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  // Prüfen ob User Mitglied der Gruppe ist
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }
  
  res.json(group);
});

// Abstimmungs-Routen
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
  res.status(201).json(newPoll);
});

app.post('/api/polls/:pollId/vote', authenticateToken, (req, res) => {
  const { optionId } = req.body;
  const poll = polls.find(p => p.id === req.params.pollId);
  
  if (!poll) {
    return res.status(404).json({ message: 'Abstimmung nicht gefunden' });
  }

  // Prüfen ob User Mitglied der Gruppe ist
  const group = groups.find(g => g.id === poll.groupId);
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }

  const option = poll.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(404).json({ message: 'Option nicht gefunden' });
  }

  // Prüfen ob User bereits abgestimmt hat
  const hasVoted = poll.options.some(opt => opt.voters.includes(req.user.email));
  if (hasVoted) {
    return res.status(400).json({ message: 'Sie haben bereits abgestimmt' });
  }

  option.votes += 1;
  option.voters.push(req.user.email);
  poll.totalVotes += 1;
  
  res.json(poll);
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});