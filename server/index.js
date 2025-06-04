import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const port = 3001;

// CORS-Konfiguration
app.use(cors({
  origin: true,
  credentials: true
}));

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

// Beispiel-Reiseangebote
const travelOffers = [
  {
    id: '1',
    title: 'Traumhafte Toskana Tour',
    location: 'Toskana, Italien',
    duration: 7,
    price: 129,
    pricePerDay: 129,
    rating: 4.8,
    image: 'https://source.unsplash.com/random?tuscany,wine',
    description: 'Entdecken Sie die malerische Landschaft der Toskana, besuchen Sie historische Städte und genießen Sie die italienische Küche.',
    travelType: ['Kulturreise', 'Genussreise'],
    activities: [
      'Weinverkostungen in traditionellen Weingütern',
      'Kochkurse für toskanische Spezialitäten',
      'Besichtigung historischer Städte',
      'Olivenöl-Verkostungen',
      'Fotografie-Workshops in der Landschaft'
    ],
    tags: ['Kultur', 'Kulinarik', 'Entspannung']
  },
  {
    id: '2',
    title: 'Nordlichter in Norwegen',
    location: 'Tromsø, Norwegen',
    duration: 5,
    price: 259,
    pricePerDay: 259,
    rating: 4.9,
    image: 'https://source.unsplash.com/random?norway,northern,lights',
    description: 'Erleben Sie das magische Naturschauspiel der Nordlichter und entdecken Sie die atemberaubende norwegische Landschaft.',
    travelType: ['Abenteuerreise', 'Naturreise'],
    activities: [
      'Nordlichter-Fotografie',
      'Hundeschlittentouren',
      'Schneemobil-Safari',
      'Besuch eines Sami-Camps',
      'Walbeobachtung'
    ],
    tags: ['Abenteuer', 'Natur', 'Winter']
  },
  {
    id: '3',
    title: 'Griechische Inselträume',
    location: 'Kykladen, Griechenland',
    duration: 10,
    price: 119,
    pricePerDay: 119,
    rating: 4.7,
    image: 'https://source.unsplash.com/random?greece,santorini',
    description: 'Entspannen Sie auf den schönsten Inseln Griechenlands, besuchen Sie antike Stätten und genießen Sie das mediterrane Flair.',
    travelType: ['Strandurlaub', 'Kulturreise'],
    activities: [
      'Inselhopping zu den schönsten Stränden',
      'Besichtigung antiker Tempel',
      'Schnorcheltouren',
      'Griechische Kochkurse',
      'Sonnenuntergang-Segeltouren'
    ],
    tags: ['Strand', 'Kultur', 'Entspannung']
  },
  {
    id: '4',
    title: 'Spanische Tapas Tour',
    location: 'Barcelona & Madrid, Spanien',
    duration: 6,
    price: 133,
    pricePerDay: 133,
    rating: 4.6,
    image: 'https://source.unsplash.com/random?spain,tapas',
    description: 'Entdecken Sie die kulinarische Vielfalt Spaniens und erleben Sie die lebendige Kultur der spanischen Metropolen.',
    travelType: ['Städtereise', 'Genussreise'],
    activities: [
      'Tapas-Workshops',
      'Stadtführungen',
      'Flamenco-Shows',
      'Weinverkostungen',
      'Besuch lokaler Märkte'
    ],
    tags: ['Kulinarik', 'Städtereise', 'Kultur']
  },
  {
    id: '5',
    title: 'Alpen Wanderparadies',
    location: 'Tirol, Österreich',
    duration: 8,
    price: 112,
    pricePerDay: 112,
    rating: 4.8,
    image: 'https://source.unsplash.com/random?alps,hiking',
    description: 'Wandern Sie durch die malerische Bergwelt Tirols und genießen Sie die frische Bergluft und traditionelle Hüttengastronomie.',
    travelType: ['Aktivreise', 'Naturreise'],
    activities: [
      'Geführte Bergwanderungen',
      'Klettersteig-Touren',
      'Mountain-Biking',
      'Yoga in den Bergen',
      'Besuch traditioneller Almhütten'
    ],
    tags: ['Wandern', 'Natur', 'Sport']
  },
  {
    id: '6',
    title: 'Kroatische Küstenträume',
    location: 'Dalmatien, Kroatien',
    duration: 9,
    price: 111,
    pricePerDay: 111,
    rating: 4.7,
    image: 'https://source.unsplash.com/random?croatia,coast',
    description: 'Entdecken Sie die traumhafte Küste Dalmatiens, kristallklares Wasser und historische Städte.',
    travelType: ['Strandurlaub', 'Aktivreise'],
    activities: [
      'Kajak-Touren entlang der Küste',
      'Schnorcheln in Buchten',
      'Stadtführungen in Dubrovnik',
      'Inselhopping',
      'Weinverkostungen'
    ],
    tags: ['Strand', 'Kultur', 'Entspannung']
  },
  {
    id: '7',
    title: 'Island Abenteuer',
    location: 'Reykjavik & Golden Circle, Island',
    duration: 8,
    price: 289,
    pricePerDay: 289,
    rating: 4.9,
    image: 'https://source.unsplash.com/random?iceland,waterfall',
    description: 'Erleben Sie die faszinierende Naturgewalt Islands mit seinen Geysiren, Wasserfällen und Vulkanen.',
    travelType: ['Abenteuerreise', 'Naturreise'],
    activities: [
      'Gletscherwanderungen',
      'Bade in heißen Quellen',
      'Super-Jeep Touren',
      'Vulkanwanderungen',
      'Walbeobachtung'
    ],
    tags: ['Abenteuer', 'Natur', 'Aktiv']
  },
  {
    id: '8',
    title: 'Portugal Surf Camp',
    location: 'Peniche, Portugal',
    duration: 7,
    price: 99,
    pricePerDay: 99,
    rating: 4.6,
    image: 'https://source.unsplash.com/random?portugal,surf',
    description: 'Lernen Sie das Surfen an Portugals besten Stränden und genießen Sie die entspannte Atmosphäre.',
    travelType: ['Sportreise', 'Strandurlaub'],
    activities: [
      'Surfkurse für alle Level',
      'Yoga am Strand',
      'Stand-Up Paddling',
      'Beachvolleyball',
      'Sunset BBQs'
    ],
    tags: ['Sport', 'Strand', 'Aktiv']
  },
  {
    id: '9',
    title: 'Französische Gourmet-Tour',
    location: 'Provence & Côte d\'Azur, Frankreich',
    duration: 6,
    price: 199,
    pricePerDay: 199,
    rating: 4.8,
    image: 'https://source.unsplash.com/random?france,provence',
    description: 'Eine kulinarische Reise durch die Provence mit Weinverkostungen und Kochkursen.',
    travelType: ['Genussreise', 'Kulturreise'],
    activities: [
      'Besuch lokaler Märkte',
      'Weinverkostungen',
      'Französische Kochkurse',
      'Lavendelfeld-Besichtigungen',
      'Käserei-Besuche'
    ],
    tags: ['Kulinarik', 'Kultur', 'Genuss']
  },
  {
    id: '10',
    title: 'Schottische Highlands',
    location: 'Highlands, Schottland',
    duration: 8,
    price: 159,
    pricePerDay: 159,
    rating: 4.7,
    image: 'https://source.unsplash.com/random?scotland,highlands',
    description: 'Entdecken Sie die mystische Landschaft der schottischen Highlands mit ihren Burgen und Lochs.',
    travelType: ['Naturreise', 'Kulturreise'],
    activities: [
      'Whisky Destillerie Besuche',
      'Wanderungen durch die Highlands',
      'Bootstouren auf Loch Ness',
      'Besuch historischer Burgen',
      'Highland Games Erlebnis'
    ],
    tags: ['Natur', 'Kultur', 'Wandern']
  }
];

// Middleware für Token-Authentifizierung
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Kein Token vorhanden' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    const user = users.find(u => u.id === decoded.id && u.email === decoded.email);
    if (!user) {
      return res.status(403).json({ message: 'Ungültiger Token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Ungültiger Token' });
  }
};

// Test-Route
app.get('/test', (req, res) => {
  res.json({ message: 'Server läuft!' });
});

// Auth-Routen
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, isSystemAdmin: user.isSystemAdmin },
    'your-secret-key',
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      email: user.email,
      isSystemAdmin: user.isSystemAdmin
    }
  });
});

app.post('/auth/register', async (req, res) => {
  const { email, password, isSystemAdmin } = req.body;
  
  // Überprüfen, ob E-Mail bereits existiert
  if (users.some(u => u.email === email)) {
    return res.status(400).json({ message: 'Diese E-Mail-Adresse ist bereits registriert' });
  }
  
  // Neuen Benutzer erstellen
  const newUser = {
    id: users.length + 1,
    email,
    password, // In der Produktion sollte das Passwort gehasht werden
    isSystemAdmin: isSystemAdmin || false
  };
  
  users.push(newUser);
  
  // JWT Token generieren
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, isSystemAdmin: newUser.isSystemAdmin },
    'your-secret-key',
    { expiresIn: '24h' }
  );
  
  // Benutzer ohne Passwort zurückgeben
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json({
    token,
    user: userWithoutPassword
  });
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

// Gruppen-Routen
app.get('/groups', authenticateToken, (req, res) => {
  const userGroups = groups.filter(group => 
    group.members.some(member => member.email === req.user.email)
  );
  res.json(userGroups);
});

app.post('/groups', authenticateToken, (req, res) => {
  const { name, description, maxParticipants, travelDateFrom, travelDateTo, preferences, budgetMin, budgetMax } = req.body;
  
  const newGroup = {
    id: uuidv4(),
    name,
    description,
    maxParticipants,
    travelPeriod: {
      start: travelDateFrom,
      end: travelDateTo
    },
    preferences,
    budgetMin,
    budgetMax,
    members: [
      { email: req.user.email, role: 'admin' }
    ],
    createdAt: new Date().toISOString(),
    createdBy: req.user.email,
    travelProposals: []
  };
  groups.push(newGroup);
  console.log('Neue Gruppe erstellt:', newGroup);
  res.status(201).json(newGroup);
});

app.get('/groups/:id', authenticateToken, (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  
  const isMember = group.members.some(member => member.email === req.user.email);
  if (!isMember) {
    return res.status(403).json({ message: 'Zugriff verweigert' });
  }
  
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

// Reiseangebote-Route
app.get('/api/travel-offers', authenticateToken, (req, res) => {
  res.json(travelOffers);
});

// Server-Start
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server läuft auf Port ${port}`);
  console.log(`Test-URL: http://localhost:${port}/test`);
  console.log(`Login-URL: http://localhost:${port}/api/auth/login`);
});