import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import api from '../utils/api';

const TravelProposal = ({ groupId, isAdmin, onProposalAdded }) => {
  const [open, setOpen] = useState(false);
  const [proposal, setProposal] = useState({
    title: '',
    description: '',
    destination: '',
    dates: {
      start: null,
      end: null
    },
    estimatedCost: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proposal.title || !proposal.destination || !proposal.dates.start || !proposal.dates.end) {
      setError('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      const response = await api.post(`/groups/${groupId}/proposals`, proposal);
      onProposalAdded(response.data);
      setOpen(false);
      setProposal({
        title: '',
        description: '',
        destination: '',
        dates: {
          start: null,
          end: null
        },
        estimatedCost: ''
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Reisevorschlags:', error);
      setError('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        Reisevorschlag einreichen
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neuer Reisevorschlag</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Titel"
              value={proposal.title}
              onChange={(e) => setProposal(prev => ({ ...prev, title: e.target.value }))}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Reiseziel"
              value={proposal.destination}
              onChange={(e) => setProposal(prev => ({ ...prev, destination: e.target.value }))}
              required
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <DatePicker
                label="Von"
                value={proposal.dates.start}
                onChange={(date) => setProposal(prev => ({
                  ...prev,
                  dates: { ...prev.dates, start: date }
                }))}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
              <DatePicker
                label="Bis"
                value={proposal.dates.end}
                onChange={(date) => setProposal(prev => ({
                  ...prev,
                  dates: { ...prev.dates, end: date }
                }))}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </Stack>

            <TextField
              fullWidth
              label="Geschätzte Kosten pro Person (€)"
              type="number"
              value={proposal.estimatedCost}
              onChange={(e) => setProposal(prev => ({ ...prev, estimatedCost: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Beschreibung"
              value={proposal.description}
              onChange={(e) => setProposal(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={4}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSubmit}>Vorschlag einreichen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const TravelProposalList = ({ proposals, groupId, isAdmin, onVote }) => {
  return (
    <Box sx={{ mt: 2 }}>
      {proposals.map((proposal) => (
        <Card key={proposal.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {proposal.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {proposal.destination}
            </Typography>
            <Typography variant="body2" paragraph>
              {proposal.description}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
              <Chip
                label={`${new Date(proposal.dates.start).toLocaleDateString()} - ${new Date(proposal.dates.end).toLocaleDateString()}`}
                variant="outlined"
              />
              {proposal.estimatedCost && (
                <Chip
                  label={`${proposal.estimatedCost}€ pro Person`}
                  variant="outlined"
                />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Vorgeschlagen von {proposal.createdBy}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              startIcon={<ThumbUpIcon />}
              onClick={() => onVote(proposal.id)}
            >
              Abstimmen ({proposal.votes.length})
            </Button>
            {isAdmin && (
              <>
                <IconButton size="small">
                  <EditIcon />
                </IconButton>
                <IconButton size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

export default TravelProposal; 