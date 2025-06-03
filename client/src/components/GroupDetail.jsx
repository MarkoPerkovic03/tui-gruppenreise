import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert
} from '@mui/material';
import api from '../utils/api'; // KORRIGIERT: Verwende die konfigurierte API

const GroupDetail = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [openPollDialog, setOpenPollDialog] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['']);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        console.log('Lade Gruppendetails für ID:', id);
        setLoading(true);
        setError('');
        
        // KORRIGIERT: Verwende api statt axios
        const groupResponse = await api.get(`/groups/${id}`);
        console.log('Gruppe geladen:', groupResponse.data);
        setGroup(groupResponse.data);
        
        const pollsResponse = await api.get(`/groups/${id}/polls`);
        console.log('Abstimmungen geladen:', pollsResponse.data);
        setPolls(pollsResponse.data);
        
      } catch (error) {
        console.error('Fehler beim Laden der Gruppendetails:', error);
        setError('Fehler beim Laden der Gruppendetails. Bitte versuchen Sie es erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchGroupDetails();
    }
  }, [id]);

  const handleAddOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    try {
      // KORRIGIERT: Verwende api statt axios
      const response = await api.post(`/groups/${id}/polls`, {
        title: pollTitle,
        options: pollOptions.filter(option => option.trim() !== '')
      });
      setPolls([...polls, response.data]);
      setOpenPollDialog(false);
      setPollTitle('');
      setPollOptions(['']);
    } catch (error) {
      console.error('Fehler beim Erstellen der Abstimmung:', error);
      setError('Fehler beim Erstellen der Abstimmung.');
    }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      // KORRIGIERT: Verwende api statt axios
      await api.post(`/polls/${pollId}/vote`, { optionId });
      const updatedPollsResponse = await api.get(`/groups/${id}/polls`);
      setPolls(updatedPollsResponse.data);
    } catch (error) {
      console.error('Fehler beim Abstimmen:', error);
      setError('Fehler beim Abstimmen.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Lädt Gruppendetails...</Typography>
      </Box>
    );
  }

  if (error && !group) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Erneut versuchen
        </Button>
      </Box>
    );
  }

  if (!group) {
    return <Box sx={{ p: 3 }}><Typography>Gruppe nicht gefunden</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Typography variant="h4" sx={{ color: '#0057B8', mb: 3 }}>
        {group.name}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Mitglieder</Typography>
            <List>
              {group.members && group.members.map((member, index) => (
                <ListItem key={index}>
                  <ListItemText primary={member.email} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => setOpenPollDialog(true)}
              sx={{
                backgroundColor: '#0057B8',
                '&:hover': { backgroundColor: '#004494' }
              }}
            >
              Neue Abstimmung erstellen
            </Button>
          </Box>

          <Grid container spacing={2}>
            {polls.map((poll) => (
              <Grid item xs={12} key={poll.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {poll.title}
                    </Typography>
                    {poll.options && poll.options.map((option) => (
                      <Box key={option.id} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body1" sx={{ flexGrow: 1 }}>
                            {option.text}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleVote(poll.id, option.id)}
                            sx={{
                              ml: 2,
                              color: '#0057B8',
                              borderColor: '#0057B8'
                            }}
                          >
                            Abstimmen
                          </Button>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {option.votes || 0} Stimmen
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Dialog open={openPollDialog} onClose={() => setOpenPollDialog(false)}>
        <DialogTitle>Neue Abstimmung erstellen</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Titel der Abstimmung"
            value={pollTitle}
            onChange={(e) => setPollTitle(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          {pollOptions.map((option, index) => (
            <TextField
              key={index}
              fullWidth
              label={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              sx={{ mb: 1 }}
            />
          ))}
          <Button onClick={handleAddOption} sx={{ mt: 1 }}>
            Option hinzufügen
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPollDialog(false)}>Abbrechen</Button>
          <Button
            onClick={handleCreatePoll}
            variant="contained"
            sx={{
              backgroundColor: '#0057B8',
              '&:hover': { backgroundColor: '#004494' }
            }}
          >
            Abstimmung erstellen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupDetail;