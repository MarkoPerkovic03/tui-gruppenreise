import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// In-Memory Datenbank
const groups = [];
const polls = [];

// Gruppen-Routen
app.get('/api/groups', (req, res) => {
  res.json(groups);
});

app.post('/api/groups', (req, res) => {
  const { name, description, members } = req.body;
  const newGroup = {
    id: uuidv4(),
    name,
    description,
    members: members.map(email => ({ email, id: uuidv4() })),
    createdAt: new Date().toISOString()
  };
  groups.push(newGroup);
  res.status(201).json(newGroup);
});

app.get('/api/groups/:id', (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ message: 'Gruppe nicht gefunden' });
  }
  res.json(group);
});

// Abstimmungs-Routen
app.get('/api/groups/:id/polls', (req, res) => {
  const groupPolls = polls.filter(p => p.groupId === req.params.id);
  res.json(groupPolls);
});

app.post('/api/groups/:id/polls', (req, res) => {
  const { title, options } = req.body;
  const newPoll = {
    id: uuidv4(),
    groupId: req.params.id,
    title,
    options: options.map(text => ({
      id: uuidv4(),
      text,
      votes: 0
    })),
    totalVotes: 0,
    createdAt: new Date().toISOString()
  };
  polls.push(newPoll);
  res.status(201).json(newPoll);
});

app.post('/api/polls/:pollId/vote', (req, res) => {
  const { optionId } = req.body;
  const poll = polls.find(p => p.id === req.params.pollId);
  
  if (!poll) {
    return res.status(404).json({ message: 'Abstimmung nicht gefunden' });
  }

  const option = poll.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(404).json({ message: 'Option nicht gefunden' });
  }

  option.votes += 1;
  poll.totalVotes += 1;
  
  res.json(poll);
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
