// client/src/components/ProposalManager.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Rating,
  Alert,
  Stack,
  Fab,
  LinearProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  Restaurant as RestaurantIcon,
  DirectionsBus as TransferIcon,
  Delete as DeleteIcon,
  Poll as PollIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  Euro as EuroIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  ThumbUp as ThumbUpIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { useAuth } from '../App';
import api from '../utils/api';
import deLocale from 'date-fns/locale/de';

const ProposalManager = ({ groupId, group, onGroupUpdate }) => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [travelOffers, setTravelOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [votingDialog, setVotingDialog] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  
  const [proposalData, setProposalData] = useState({
    sourceType: 'destination', // 'destination' oder 'travelOffer'
    destinationId: '',
    travelOfferId: '',
    hotelName: '',
    hotelUrl: '',
    pricePerPerson: '',
    departureDate: null,
    returnDate: null,
    description: '',
    includesFlight: true,
    includesTransfer: true,
    mealPlan: 'breakfast'
  });

  const [votingData, setVotingData] = useState({
    deadline: null
  });

  const isAdmin = group?.members?.some(member => 
    member.user?._id === user?.id && member.role === 'admin'
  );

  useEffect(() => {
    loadProposals();
    loadDestinations();
    loadTravelOffers();
  }, [groupId]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/proposals/group/${groupId}`);
      setProposals(response.data);
      setError('');
    } catch (error) {
      console.error('Fehler beim Laden der Vorschläge:', error);
      setError('Fehler beim Laden der Vorschläge');
    } finally {
      setLoading(false);
    }
  };

  const loadDestinations = async () => {
    try {
      const response = await api.get('/destinations');
      setDestinations(response.data.destinations || response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Reiseziele:', error);
    }
  };

  const loadTravelOffers = async () => {
    try {
      const response = await api.get('/travel-offers');
      setTravelOffers(response.data.offers || response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Reiseangebote:', error);
    }
  };

  const handleCreateProposal = async () => {
    try {
      setError('');
      
      if (!proposalData.pricePerPerson || !proposalData.departureDate || !proposalData.returnDate) {
        setError('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      if (proposalData.sourceType === 'destination' && !proposalData.destinationId) {
        setError('Bitte wählen Sie ein Reiseziel aus');
        return;
      }

      if (proposalData.sourceType === 'travelOffer' && !proposalData.travelOfferId) {
        setError('Bitte wählen Sie ein Reiseangebot aus');
        return;
      }

      const submitData = {
        groupId,
        ...proposalData,
        destinationId: proposalData.sourceType === 'destination' ? proposalData.destinationId : undefined,
        travelOfferId: proposalData.sourceType === 'travelOffer' ? proposalData.travelOfferId : undefined
      };

      await api.post('/proposals', submitData);
      
      setCreateDialog(false);
      setProposalData({
        sourceType: 'destination',
        destinationId: '',
        travelOfferId: '',
        hotelName: '',
        hotelUrl: '',
        pricePerPerson: '',
        departureDate: null,
        returnDate: null,
        description: '',
        includesFlight: true,
        includesTransfer: true,
        mealPlan: 'breakfast'
      });
      
      await loadProposals();
    } catch (error) {
      console.error('Fehler beim Erstellen des Vorschlags:', error);
      setError(error.response?.data?.message || 'Fehler beim Erstellen des Vorschlags');
    }
  };

  const handleVote = async (proposalId, rank) => {
    try {
      await api.post(`/proposals/${proposalId}/vote`, { rank });
      await loadProposals();
      setError('');
    } catch (error) {
      console.error('Fehler beim Abstimmen:', error);
      setError(error.response?.data?.message || 'Fehler beim Abstimmen');
    }
  };

  const handleDeleteProposal = async (proposalId) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Vorschlag löschen möchten?')) {
      return;
    }

    try {
      await api.delete(`/proposals/${proposalId}`);
      await loadProposals();
      setError('');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      setError(error.response?.data?.message || 'Fehler beim Löschen des Vorschlags');
    }
  };

  const handleStartVoting = async () => {
    try {
      await api.post(`/proposals/group/${groupId}/start-voting`, {
        votingDeadline: votingData.deadline
      });
      
      setVotingDialog(false);
      setVotingData({ deadline: null });
      
      if (onGroupUpdate) {
        onGroupUpdate();
      }
      
      setError('');
    } catch (error) {
      console.error('Fehler beim Starten der Abstimmung:', error);
      setError(error.response?.data?.message || 'Fehler beim Starten der Abstimmung');
    }
  };

  const handleEndVoting = async () => {
    if (!window.confirm('Sind Sie sicher, dass Sie die Abstimmung beenden möchten?')) {
      return;
    }

    try {
      await api.post(`/proposals/group/${groupId}/end-voting`);
      
      if (onGroupUpdate) {
        onGroupUpdate();
      }
      
      await loadProposals();
      setError('');
    } catch (error) {
      console.error('Fehler beim Beenden der Abstimmung:', error);
      setError(error.response?.data?.message || 'Fehler beim Beenden der Abstimmung');
    }
  };

  const getUserVote = (proposal) => {
    return proposal.votes?.find(vote => vote.user?._id === user?.id);
  };

  const getVoteStats = (proposal) => {
    const votes = proposal.votes || [];
    const stats = { 1: 0, 2: 0, 3: 0 };
    votes.forEach(vote => {
      stats[vote.rank] = (stats[vote.rank] || 0) + 1;
    });
    return stats;
  };

  const mealPlanLabels = {
    none: 'Ohne Verpflegung',
    breakfast: 'Nur Frühstück',
    half_board: 'Halbpension',
    full_board: 'Vollpension',
    all_inclusive: 'All Inclusive'
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Lade Reisevorschläge...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Header mit Status und Aktionen */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">
              Reisevorschläge ({proposals.length})
            </Typography>
            
            <Box display="flex" gap={2}>
              {group?.status === 'planning' && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialog(true)}
                >
                  Vorschlag hinzufügen
                </Button>
              )}
              
              {isAdmin && group?.status === 'planning' && proposals.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={<PollIcon />}
                  onClick={() => setVotingDialog(true)}
                >
                  Abstimmung starten
                </Button>
              )}
              
              {isAdmin && group?.status === 'voting' && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<TimeIcon />}
                  onClick={handleEndVoting}
                >
                  Abstimmung beenden
                </Button>
              )}
            </Box>
          </Box>

          {/* Status Anzeige */}
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              label={group?.status === 'planning' ? 'Planungsphase' : 
                     group?.status === 'voting' ? 'Abstimmungsphase' :
                     group?.status === 'decided' ? 'Entschieden' : 'Unbekannt'}
              color={group?.status === 'planning' ? 'primary' : 
                     group?.status === 'voting' ? 'warning' :
                     group?.status === 'decided' ? 'success' : 'default'}
            />
            
            {group?.votingDeadline && group?.status === 'voting' && (
              <Typography variant="body2" color="text.secondary">
                Abstimmung bis: {new Date(group.votingDeadline).toLocaleDateString('de-DE')}
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Vorschläge Liste */}
        {proposals.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <PollIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Noch keine Reisevorschläge vorhanden
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Erstellen Sie den ersten Vorschlag für Ihre Gruppe!
            </Typography>
            {group?.status === 'planning' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog(true)}
                sx={{ mt: 2 }}
              >
                Ersten Vorschlag erstellen
              </Button>
            )}
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {proposals.map((proposal) => {
              const userVote = getUserVote(proposal);
              const voteStats = getVoteStats(proposal);
              const isWinner = group?.winningProposal === proposal._id;
              
              return (
                <Grid item xs={12} md={6} lg={4} key={proposal._id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      border: isWinner ? 2 : 0,
                      borderColor: 'success.main'
                    }}
                  >
                    {isWinner && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1
                        }}
                      >
                        <Chip
                          icon={<TrophyIcon />}
                          label="Gewinner"
                          color="success"
                          size="small"
                        />
                      </Box>
                    )}

                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Destination */}
                      <Box display="flex" alignItems="center" mb={2}>
                        <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">
                          {proposal.destination?.name}, {proposal.destination?.country}
                        </Typography>
                      </Box>

                      {/* Hotel Info */}
                      {proposal.hotelName && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <HotelIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {proposal.hotelName}
                          </Typography>
                        </Box>
                      )}

                      {/* Dates */}
                      <Box display="flex" alignItems="center" mb={1}>
                        <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {new Date(proposal.departureDate).toLocaleDateString('de-DE')} - {' '}
                          {new Date(proposal.returnDate).toLocaleDateString('de-DE')}
                        </Typography>
                      </Box>

                      {/* Price */}
                      <Box display="flex" alignItems="center" mb={1}>
                        <EuroIcon sx={{ mr: 1, color: 'success.main' }} />
                        <Typography variant="body2">
                          €{proposal.pricePerPerson}/Person (Total: €{proposal.totalPrice})
                        </Typography>
                      </Box>

                      {/* Features */}
                      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                        {proposal.includesFlight && (
                          <Chip icon={<FlightIcon />} label="Flug" size="small" variant="outlined" />
                        )}
                        {proposal.includesTransfer && (
                          <Chip icon={<TransferIcon />} label="Transfer" size="small" variant="outlined" />
                        )}
                        <Chip 
                          icon={<RestaurantIcon />} 
                          label={mealPlanLabels[proposal.mealPlan]} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Stack>

                      {/* Description */}
                      {proposal.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {proposal.description}
                        </Typography>
                      )}

                      {/* Proposer */}
                      <Typography variant="caption" color="text.secondary">
                        Vorgeschlagen von {proposal.proposedBy?.name}
                      </Typography>

                      {/* Voting Stats */}
                      {group?.status !== 'planning' && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Abstimmungsergebnis
                          </Typography>
                          
                          <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Typography variant="body2">
                              Stimmen: {proposal.voteCount}
                            </Typography>
                            <Rating
                              value={proposal.weightedScore || 0}
                              max={3}
                              precision={0.1}
                              readOnly
                              size="small"
                            />
                            <Typography variant="body2">
                              ({(proposal.weightedScore || 0).toFixed(1)}/3.0)
                            </Typography>
                          </Box>

                          <Box display="flex" gap={1}>
                            <Chip label={`👍 ${voteStats[1]}`} size="small" color="success" />
                            <Chip label={`👌 ${voteStats[2]}`} size="small" color="warning" />
                            <Chip label={`👎 ${voteStats[3]}`} size="small" color="error" />
                          </Box>
                        </Box>
                      )}
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      {/* Voting Buttons */}
                      {group?.status === 'voting' && (
                        <Box display="flex" gap={1} width="100%">
                          <Button
                            variant={userVote?.rank === 1 ? "contained" : "outlined"}
                            color="success"
                            size="small"
                            onClick={() => handleVote(proposal._id, 1)}
                            sx={{ flex: 1 }}
                          >
                            👍 Super
                          </Button>
                          <Button
                            variant={userVote?.rank === 2 ? "contained" : "outlined"}
                            color="warning"
                            size="small"
                            onClick={() => handleVote(proposal._id, 2)}
                            sx={{ flex: 1 }}
                          >
                            👌 OK
                          </Button>
                          <Button
                            variant={userVote?.rank === 3 ? "contained" : "outlined"}
                            color="error"
                            size="small"
                            onClick={() => handleVote(proposal._id, 3)}
                            sx={{ flex: 1 }}
                          >
                            👎 Nein
                          </Button>
                        </Box>
                      )}

                      {/* Delete Button */}
                      {(proposal.proposedBy?._id === user?.id || isAdmin) && group?.status === 'planning' && (
                        <IconButton
                          onClick={() => handleDeleteProposal(proposal._id)}
                          color="error"
                          size="small"
                          sx={{ ml: 'auto' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Create Proposal Dialog */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Neuen Reisevorschlag erstellen</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Source Type Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Quelle</InputLabel>
                  <Select
                    value={proposalData.sourceType}
                    onChange={(e) => setProposalData({...proposalData, sourceType: e.target.value})}
                    label="Quelle"
                  >
                    <MenuItem value="destination">Reiseziel auswählen</MenuItem>
                    <MenuItem value="travelOffer">Reiseangebot auswählen</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Destination Selection */}
              {proposalData.sourceType === 'destination' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Reiseziel</InputLabel>
                    <Select
                      value={proposalData.destinationId}
                      onChange={(e) => setProposalData({...proposalData, destinationId: e.target.value})}
                      label="Reiseziel"
                      required
                    >
                      {destinations.map((dest) => (
                        <MenuItem key={dest._id} value={dest._id}>
                          {dest.name}, {dest.country}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Travel Offer Selection */}
              {proposalData.sourceType === 'travelOffer' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Reiseangebot</InputLabel>
                    <Select
                      value={proposalData.travelOfferId}
                      onChange={(e) => setProposalData({...proposalData, travelOfferId: e.target.value})}
                      label="Reiseangebot"
                      required
                    >
                      {travelOffers.map((offer) => (
                        <MenuItem key={offer._id} value={offer._id}>
                          {offer.title} - {offer.destination} (€{offer.pricePerPerson})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Hotel Info */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Hotel/Unterkunft"
                  value={proposalData.hotelName}
                  onChange={(e) => setProposalData({...proposalData, hotelName: e.target.value})}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Hotel Website/Buchungslink"
                  value={proposalData.hotelUrl}
                  onChange={(e) => setProposalData({...proposalData, hotelUrl: e.target.value})}
                />
              </Grid>

              {/* Price */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Preis pro Person (€)"
                  type="number"
                  value={proposalData.pricePerPerson}
                  onChange={(e) => setProposalData({...proposalData, pricePerPerson: e.target.value})}
                  required
                />
              </Grid>

              {/* Meal Plan */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Verpflegung</InputLabel>
                  <Select
                    value={proposalData.mealPlan}
                    onChange={(e) => setProposalData({...proposalData, mealPlan: e.target.value})}
                    label="Verpflegung"
                  >
                    <MenuItem value="none">Ohne Verpflegung</MenuItem>
                    <MenuItem value="breakfast">Nur Frühstück</MenuItem>
                    <MenuItem value="half_board">Halbpension</MenuItem>
                    <MenuItem value="full_board">Vollpension</MenuItem>
                    <MenuItem value="all_inclusive">All Inclusive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Abreisedatum"
                  value={proposalData.departureDate}
                  onChange={(date) => setProposalData({...proposalData, departureDate: date})}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                  minDate={new Date()}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Rückreisedatum"
                  value={proposalData.returnDate}
                  onChange={(date) => setProposalData({...proposalData, returnDate: date})}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                  minDate={proposalData.departureDate || new Date()}
                />
              </Grid>

              {/* Checkboxes */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <label>
                    <input
                      type="checkbox"
                      checked={proposalData.includesFlight}
                      onChange={(e) => setProposalData({...proposalData, includesFlight: e.target.checked})}
                    />
                    {' '}Flug inklusive
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={proposalData.includesTransfer}
                      onChange={(e) => setProposalData({...proposalData, includesTransfer: e.target.checked})}
                    />
                    {' '}Transfer inklusive
                  </label>
                </Stack>
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Beschreibung (optional)"
                  multiline
                  rows={3}
                  value={proposalData.description}
                  onChange={(e) => setProposalData({...proposalData, description: e.target.value})}
                  placeholder="Zusätzliche Informationen zu diesem Vorschlag..."
                />
              </Grid>

              {/* Price Preview */}
              {proposalData.pricePerPerson && group?.maxParticipants && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Kostenvorschau:</strong><br />
                      Pro Person: €{proposalData.pricePerPerson}<br />
                      Gesamtkosten ({group.maxParticipants} Personen): €{proposalData.pricePerPerson * group.maxParticipants}
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)}>Abbrechen</Button>
            <Button onClick={handleCreateProposal} variant="contained">
              Vorschlag erstellen
            </Button>
          </DialogActions>
        </Dialog>

        {/* Start Voting Dialog */}
        <Dialog open={votingDialog} onClose={() => setVotingDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Abstimmung starten</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Möchten Sie die Abstimmungsphase für diese Gruppe starten?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Nach dem Start können keine neuen Vorschläge mehr hinzugefügt werden. 
              Alle Gruppenmitglieder können dann für ihre Favoriten abstimmen.
            </Typography>

            <DatePicker
              label="Abstimmungsende (optional)"
              value={votingData.deadline}
              onChange={(date) => setVotingData({...votingData, deadline: date})}
              renderInput={(params) => <TextField {...params} fullWidth />}
              minDate={new Date()}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Aktuell sind {proposals.length} Vorschläge vorhanden.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVotingDialog(false)}>Abbrechen</Button>
            <Button onClick={handleStartVoting} variant="contained" color="warning">
              Abstimmung starten
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ProposalManager;