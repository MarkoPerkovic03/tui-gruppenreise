// client/src/components/ProposalManager.jsx - OPTIMIERTE VERSION
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
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CardMedia,
  Autocomplete
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
  Group as GroupIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { useAuth } from '../App';
import api from '../utils/api';
import deLocale from 'date-fns/locale/de';

const ProposalManager = ({ groupId, group, onGroupUpdate }) => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [travelOffers, setTravelOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [offerPreviewDialog, setOfferPreviewDialog] = useState(false);
  const [votingDialog, setVotingDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  
  const [proposalData, setProposalData] = useState({
    travelOfferId: '',
    departureDate: null,
    returnDate: null,
    description: ''
  });

  const [votingData, setVotingData] = useState({
    deadline: null
  });

  const isAdmin = group?.members?.some(member => 
    member.user?._id === user?.id && member.role === 'admin'
  );

  useEffect(() => {
    loadProposals();
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

  const loadTravelOffers = async () => {
    try {
      const response = await api.get('/travel-offers');
      setTravelOffers(response.data.offers || response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Reiseangebote:', error);
    }
  };

  const handleOfferSelection = (offer) => {
    setSelectedOffer(offer);
    setProposalData({
      travelOfferId: offer._id,
      departureDate: null,
      returnDate: null,
      description: ''
    });
  };

  const handleCreateProposal = async () => {
    try {
      setError('');
      
      if (!proposalData.travelOfferId || !proposalData.departureDate || !proposalData.returnDate) {
        setError('Bitte wählen Sie ein Reiseangebot und geben Sie die Reisedaten an');
        return;
      }

      if (new Date(proposalData.returnDate) <= new Date(proposalData.departureDate)) {
        setError('Das Rückreisedatum muss nach dem Abreisedatum liegen');
        return;
      }

      const submitData = {
        groupId,
        travelOfferId: proposalData.travelOfferId,
        departureDate: proposalData.departureDate,
        returnDate: proposalData.returnDate,
        description: proposalData.description || '',
        // Diese Felder werden automatisch aus dem TravelOffer übernommen:
        // - pricePerPerson
        // - hotelName  
        // - destination
        // - mealPlan
        // - etc.
      };

      await api.post('/proposals', submitData);
      
      setCreateDialog(false);
      setSelectedOffer(null);
      setProposalData({
        travelOfferId: '',
        departureDate: null,
        returnDate: null,
        description: ''
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
                  Reiseangebot vorschlagen
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
              Wählen Sie aus unseren verfügbaren Reiseangeboten!
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

        {/* Create Proposal Dialog - NUR REISEANGEBOTE */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Reiseangebot vorschlagen</DialogTitle>
          <DialogContent>
            {!selectedOffer ? (
              // Schritt 1: Reiseangebot auswählen
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Verfügbare Reiseangebote
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Wählen Sie ein Reiseangebot aus unserer Kollektion
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1, maxHeight: 400, overflow: 'auto' }}>
                  {travelOffers.map((offer) => (
                    <Grid item xs={12} key={offer._id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { 
                            backgroundColor: 'action.hover',
                            transform: 'translateY(-2px)',
                            boxShadow: 2
                          },
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleOfferSelection(offer)}
                      >
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={3}>
                              {offer.images?.[0] && (
                                <img 
                                  src={offer.images[0].url || offer.images[0]}
                                  alt={offer.title}
                                  style={{ 
                                    width: '100%', 
                                    height: '80px', 
                                    objectFit: 'cover',
                                    borderRadius: '4px'
                                  }}
                                />
                              )}
                            </Grid>
                            <Grid item xs={9}>
                              <Typography variant="h6">{offer.title}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {offer.destination}, {offer.country}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={2} mt={1}>
                                <Chip label={offer.category} size="small" />
                                <Typography variant="h6" color="primary">
                                  €{offer.pricePerPerson}/Person
                                </Typography>
                                {offer.stars && (
                                  <Rating value={offer.stars} precision={0.5} readOnly size="small" />
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : (
              // Schritt 2: Reisedaten eingeben
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Ausgewähltes Angebot
                </Typography>
                
                {/* Angebot Preview */}
                <Card sx={{ mb: 3, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                  <CardContent>
                    <Typography variant="h6">{selectedOffer.title}</Typography>
                    <Typography variant="body1">
                      {selectedOffer.destination}, {selectedOffer.country}
                    </Typography>
                    <Typography variant="h5">
                      €{selectedOffer.pricePerPerson}/Person
                    </Typography>
                    <Box display="flex" gap={1} mt={1}>
                      <Chip label={selectedOffer.category} size="small" color="primary" />
                      {selectedOffer.stars && (
                        <Rating value={selectedOffer.stars} readOnly size="small" />
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => setSelectedOffer(null)}
                      sx={{ color: 'primary.contrastText' }}
                    >
                      Anderes Angebot wählen
                    </Button>
                  </CardActions>
                </Card>

                {/* Reisedaten */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Abreisedatum *"
                      value={proposalData.departureDate}
                      onChange={(date) => setProposalData({...proposalData, departureDate: date})}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                      minDate={new Date()}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Rückreisedatum *"
                      value={proposalData.returnDate}
                      onChange={(date) => setProposalData({...proposalData, returnDate: date})}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                      minDate={proposalData.departureDate || new Date()}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Zusätzliche Notizen (optional)"
                      multiline
                      rows={3}
                      value={proposalData.description}
                      onChange={(e) => setProposalData({...proposalData, description: e.target.value})}
                      placeholder="Warum ist dieses Angebot perfekt für unsere Gruppe?"
                    />
                  </Grid>

                  {/* Kostenvorschau */}
                  {proposalData.departureDate && proposalData.returnDate && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          <strong>Kostenvorschau für {group?.maxParticipants} Personen:</strong><br />
                          Pro Person: €{selectedOffer.pricePerPerson}<br />
                          Gesamtkosten: €{selectedOffer.pricePerPerson * (group?.maxParticipants || 1)}<br />
                          Reisedauer: {proposalData.departureDate && proposalData.returnDate ? 
                            Math.ceil((new Date(proposalData.returnDate) - new Date(proposalData.departureDate)) / (1000 * 60 * 60 * 24)) 
                            : 0} Tage
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setCreateDialog(false);
              setSelectedOffer(null);
              setProposalData({
                travelOfferId: '',
                departureDate: null,
                returnDate: null,
                description: ''
              });
            }}>
              Abbrechen
            </Button>
            {selectedOffer && (
              <Button onClick={handleCreateProposal} variant="contained">
                Vorschlag einreichen
              </Button>
            )}
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