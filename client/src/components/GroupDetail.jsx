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
  LinearProgress
} from '@mui/material';
import axios from 'axios';

const GroupDetail = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [openPollDialog, setOpenPollDialog] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['']);
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await axios.get(`/api/groups/${id}`);
        setGroup(response.data);
        const pollsResponse = await axios.get(`/api/groups/${id}/polls`);
        setPolls(pollsResponse.data);
      } catch (error) {
        console.error('Fehler beim Laden der Gruppendetails:', error);
      }
    };
    fetchGroupDetails();
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
      const response = await axios.post(`/api/groups/${id}/polls`, {
        title: pollTitle,
        options: pollOptions.filter(option => option.trim() !== '')
      });
      setPolls([...polls, response.data]);
      setOpenPollDialog(false);
      setPollTitle('');
      setPollOptions(['']);
    } catch (error) {
      console.error('Fehler beim Erstellen der Abstimmung:', error);
    }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      await axios.post(`/api/polls/${pollId}/vote`, { optionId });
      const updatedPollsResponse = await axios.get(`/api/groups/${id}/polls`);
      setPolls(updatedPollsResponse.data);
    } catch (error) {
      console.error('Fehler beim Abstimmen:', error);
    }
  };

  if (!group) {
    return <Box sx={{ p: 3 }}><Typography>Lädt...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: '#0057B8', mb: 3 }}>
        {group.name}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Mitglieder</Typography>
            <List>
              {group.members.map((member, index) => (
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
                    {poll.options.map((option) => (
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
                          value={(option.votes / poll.totalVotes) * 100}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {option.votes} Stimmen
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