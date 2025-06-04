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
const travelProposals = [];
const users = [
  {
    id: 1,
    email: 'admin@tui.com',
    password: 'admin123', // Temporär Klartext für einfaches Testen
    isSystemAdmin: true
  },
  {
    id: 2,
    email: 'demo@tui.com',
    password: 'demo123', // Temporär Klartext für einfaches Testen
    isSystemAdmin: false
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
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, isSystemAdmin } = req.body;

    // Prüfe, ob der Benutzer bereits existiert
    if (users.some(u => u.email === email)) {
      return res.status(400).json({ message: 'Ein Benutzer mit dieser E-Mail existiert bereits' });
    }

    const newUser = {
      id: users.length + 1,
      email,
      password, // In einer echten Anwendung würde das Passwort gehasht werden
      isSystemAdmin: isSystemAdmin || false
    };

    users.push(newUser);

    const userToken = jwt.sign(
      { userId: newUser.id, email: newUser.email, isSystemAdmin: newUser.isSystemAdmin },
      'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token: userToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        isSystemAdmin: newUser.isSystemAdmin
      }
    });
  } catch (error) {
    console.error('Registrierungsfehler:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }

    // In einer echten Anwendung würde hier das Passwort verglichen werden
    if (password === user.password) {
      const userToken = jwt.sign(
        { userId: user.id, email: user.email, isSystemAdmin: user.isSystemAdmin },
        'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        token: userToken,
        user: {
          id: user.id,
          email: user.email,
          isSystemAdmin: user.isSystemAdmin
        }
      });
    } else {
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
});

// Systemadmin-Route zum Auflisten aller Benutzer
app.get('/api/users', authenticateToken, (req, res) => {
  if (!req.user.isSystemAdmin) {
    return res.status(403).json({ message: 'Nur Systemadministratoren haben Zugriff auf diese Funktion' });
  }

  const userList = users.map(user => ({
    id: user.id,
    email: user.email,
    isSystemAdmin: user.isSystemAdmin
  }));

  res.json(userList);
});

// Systemadmin-Route zum Bearbeiten von Benutzerrollen
app.put('/api/users/:id', authenticateToken, (req, res) => {
  if (!req.user.isSystemAdmin) {
    return res.status(403).json({ message: 'Nur Systemadministratoren haben Zugriff auf diese Funktion' });
  }

  const userId = parseInt(req.params.id);
  const { isSystemAdmin } = req.body;

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'Benutzer nicht gefunden' });
  }

  user.isSystemAdmin = isSystemAdmin;
  res.json({
    id: user.id,
    email: user.email,
    isSystemAdmin: user.isSystemAdmin
  });
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
  const { name, description, members, maxParticipants, travelPeriod, preferences } = req.body;
  
  // Validierung
  if (members.length < 1) { // Mind. 2 Teilnehmer (inkl. Admin)
    return res.status(400).json({ message: 'Eine Gruppe muss mindestens zwei Teilnehmer haben' });
  }

  const newGroup = {
    id: uuidv4(),
    name,
    description,
    maxParticipants,
    travelPeriod: {
      start: travelPeriod.start,
      end: travelPeriod.end
    },
    preferences,
    members: [
      { email: req.user.email, id: uuidv4(), role: 'admin' },
      ...members.map(email => ({ email, id: uuidv4(), role: 'member' }))
    ],
    createdAt: new Date().toISOString(),
    createdBy: req.user.email,
    travelProposals: []
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

// Neue Route für Reisevorschläge
app.post('/api/groups/:id/proposals', authenticateToken, (req, res) => {
  const { title, description, destination, dates, estimatedCost } = req.body;
  const group = groups.find(g => g.id === req.params.id);
  
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }
  
  const newProposal = {
    id: uuidv4(),
    groupId: req.params.id,
    title,
    description,
    destination,
    dates,
    estimatedCost,
    createdAt: new Date().toISOString(),
    createdBy: req.user.email,
    votes: []
  };
  
  group.travelProposals.push(newProposal);
  console.log('Neuer Reisevorschlag erstellt:', newProposal);
  res.status(201).json(newProposal);
});

// Route zum Bearbeiten von Gruppenpräferenzen (nur für Admins)
app.put('/api/groups/:id/preferences', authenticateToken, (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  const isAdmin = group.members.some(member => 
    member.email === req.user.email && member.role === 'admin'
  );
  
  if (!isAdmin) {
    return res.status(403).json({ message: 'Nur Admins können Präferenzen bearbeiten' });
  }
  
  group.preferences = req.body.preferences;
  res.json(group);
});

// Route zum Verwalten von Teilnehmern (nur für Admins)
app.put('/api/groups/:id/members', authenticateToken, (req, res) => {
  const { members } = req.body;
  const group = groups.find(g => g.id === req.params.id);
  
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  const isAdmin = group.members.some(member => 
    member.email === req.user.email && member.role === 'admin'
  );
  
  if (!isAdmin) {
    return res.status(403).json({ message: 'Nur Admins können Mitglieder verwalten' });
  }
  
  // Stelle sicher, dass mindestens ein Admin bleibt
  const hasAdmin = members.some(member => member.role === 'admin');
  if (!hasAdmin) {
    return res.status(400).json({ message: 'Die Gruppe muss mindestens einen Admin haben' });
  }
  
  group.members = members;
  res.json(group);
});

// Route zum Hinzufügen eines neuen Mitglieds
app.post('/api/groups/:id/members', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    const group = groups.find(g => g.id === id);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }

    // Prüfen, ob der aktuelle Benutzer Admin der Gruppe ist
    const isAdmin = group.members.some(
      member => member.email === req.user.email && member.role === 'admin'
    );
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppenadmins können Mitglieder hinzufügen' });
    }

    // Prüfen, ob das Mitglied bereits in der Gruppe ist
    const isMemberExists = group.members.some(member => member.email === email);
    if (isMemberExists) {
      return res.status(400).json({ message: 'Benutzer ist bereits Mitglied der Gruppe' });
    }

    // Prüfen, ob die maximale Teilnehmerzahl erreicht ist
    if (group.members.length >= group.maxParticipants) {
      return res.status(400).json({ message: 'Die maximale Teilnehmerzahl ist erreicht' });
    }

    // Neues Mitglied hinzufügen
    const newMember = {
      email,
      role: 'member'
    };
    
    group.members.push(newMember);
    
    res.status(201).json(newMember);
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Mitglieds:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
});

// Route zum Entfernen eines Mitglieds
app.delete('/api/groups/:id/members/:email', authenticateToken, async (req, res) => {
  const { id, email } = req.params;

  try {
    const group = groups.find(g => g.id === id);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }

    // Prüfen, ob der aktuelle Benutzer Admin der Gruppe ist
    const isAdmin = group.members.some(
      member => member.email === req.user.email && member.role === 'admin'
    );
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppenadmins können Mitglieder entfernen' });
    }

    // Prüfen, ob das zu entfernende Mitglied ein Admin ist
    const memberToRemove = group.members.find(member => member.email === email);
    if (!memberToRemove) {
      return res.status(404).json({ message: 'Mitglied nicht gefunden' });
    }
    if (memberToRemove.role === 'admin') {
      return res.status(403).json({ message: 'Admins können nicht entfernt werden' });
    }

    // Mitglied entfernen
    group.members = group.members.filter(member => member.email !== email);
    
    res.status(200).json({ message: 'Mitglied erfolgreich entfernt' });
  } catch (error) {
    console.error('Fehler beim Entfernen des Mitglieds:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server läuft auf Port ${port}`);
  console.log(`Test-URL: http://localhost:${port}/test`);
  console.log(`Login-URL: http://localhost:${port}/api/auth/login`);
});