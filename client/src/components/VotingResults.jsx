// client/src/components/VotingResults.jsx - ENHANCED VERSION mit Tie-Breaking Info
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Poll as PollIcon,
  Person as PersonIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Remove as NeutralIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Balance as BalanceIcon,
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import api from '../utils/api';

const VotingResults = ({ groupId, group }) => {
  const [proposals, setProposals] = useState([]);
  const [tieInfo, setTieInfo] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    loadResults();
  }, [groupId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      // Verwende die enhanced results endpoint
      const response = await api.get(`/proposals/group/${groupId}/results`);
      
      setProposals(response.data.proposals);
      setTieInfo(response.data.tieInfo);
      setStatistics(response.data.statistics);
      setError('');
    } catch (error) {
      console.error('Fehler beim Laden der Abstimmungsergebnisse:', error);
      setError('Fehler beim Laden der Abstimmungsergebnisse');
    } finally {
      setLoading(false);
    }
  };

  const loadVoteDetails = async (proposalId) => {
    try {
      const response = await api.get(`/proposals/${proposalId}/votes`);
      setVotes(response.data.votes || []);
      setSelectedProposal(proposals.find(p => p._id === proposalId));
      setDetailDialog(true);
    } catch (error) {
      console.error('Fehler beim Laden der Abstimmungsdetails:', error);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <ThumbUpIcon color="success" fontSize="small" />;
      case 2: return <NeutralIcon color="warning" fontSize="small" />;
      case 3: return <ThumbDownIcon color="error" fontSize="small" />;
      default: return null;
    }
  };

  const getRankLabel = (rank) => {
    switch (rank) {
      case 1: return 'Super';
      case 2: return 'OK';
      case 3: return 'Nein';
      default: return 'Unbekannt';
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'success';
      case 2: return 'warning';
      case 3: return 'error';
      default: return 'default';
    }
  };

  // Tie-Breaking Info Component
  const TieBreakingInfo = () => {
    if (!tieInfo || !tieInfo.hasTie) return null;

    const tieBreakingMessages = {
      vote_count: 'Gleichstand durch Anzahl der Stimmen entschieden',
      super_votes: 'Gleichstand durch mehr "Super"-Bewertungen entschieden', 
      fewer_no_votes: 'Gleichstand durch weniger "Nein"-Bewertungen entschieden',
      price_performance: 'Gleichstand durch besseres Preis-Leistungs-Verhältnis entschieden',
      creation_time: 'Gleichstand durch Reihenfolge der Einreichung entschieden'
    };

    const tieBreakingIcons = {
      vote_count: <PollIcon />,
      super_votes: <ThumbUpIcon />,
      fewer_no_votes: <ThumbDownIcon />,
      price_performance: <MoneyIcon />,
      creation_time: <TimeIcon />
    };

    return (
      <Alert 
        severity="info" 
        sx={{ mb: 3 }}
        icon={<BalanceIcon />}
      >
        <Typography variant="subtitle2" gutterBottom>
          ⚖️ Gleichstand erkannt
        </Typography>
        <Typography variant="body2" gutterBottom>
          {tieInfo.tiedProposals.length} Vorschläge hatten die gleiche Bewertung 
          ({tieInfo.topScore.toFixed(1)} Punkte).
        </Typography>
        {tieInfo.tieBreakingMethod && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
            {tieBreakingIcons[tieInfo.tieBreakingMethod]}
            <Typography variant="body2">
              <strong>Entscheidung:</strong> {tieBreakingMessages[tieInfo.tieBreakingMethod]}
            </Typography>
          </Box>
        )}
        
        {/* Details zu den gleichstehenden Vorschlägen */}
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Details zu gleichstehenden Vorschlägen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {tieInfo.tiedProposals.map((proposal, index) => (
                <Box key={proposal._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    {index + 1}. {proposal.destination?.name} 
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label={`${proposal.weightedScore.toFixed(1)} Pkt`} size="small" />
                    <Chip label={`${proposal.voteCount} Stimmen`} size="small" variant="outlined" />
                    <Chip label={`€${proposal.pricePerPerson}`} size="small" color="primary" />
                  </Box>
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Alert>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Lade Abstimmungsergebnisse...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  const maxVotes = Math.max(...proposals.map(p => p.voteCount || 0), 1);

  return (
    <Box>
      {/* Tie-Breaking Info anzeigen */}
      <TieBreakingInfo />

      {/* Zusammenfassung */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Abstimmungsergebnisse
        </Typography>
        
        {group?.votingDeadline && group?.status === 'voting' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Abstimmung läuft bis: {new Date(group.votingDeadline).toLocaleDateString('de-DE')}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PollIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{statistics?.totalProposals || 0}</Typography>
                <Typography color="text.secondary">Vorschläge</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">{statistics?.totalVotes || 0}</Typography>
                <Typography color="text.secondary">Stimmen gesamt</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrophyIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4">
                  {statistics?.hasDecision ? '1' : '?'}
                </Typography>
                <Typography color="text.secondary">
                  {statistics?.hasDecision ? 'Gewinner' : 'Noch offen'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <BalanceIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h4">
                  {statistics?.avgScore?.toFixed(1) || '0.0'}
                </Typography>
                <Typography color="text.secondary">Ø Bewertung</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Ranking Tabelle */}
      {proposals.length > 0 ? (
        <Paper sx={{ mb: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rang</TableCell>
                  <TableCell>Reiseziel</TableCell>
                  <TableCell>Preis</TableCell>
                  <TableCell align="center">Bewertung</TableCell>
                  <TableCell align="center">Stimmen</TableCell>
                  <TableCell align="center">Super/Nein</TableCell>
                  <TableCell align="center">Beliebtheit</TableCell>
                  <TableCell align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proposals.map((proposal, index) => {
                  const isWinner = group?.winningProposal === proposal._id;
                  const votePercentage = maxVotes > 0 ? ((proposal.voteCount || 0) / maxVotes) * 100 : 0;
                  const superVotes = proposal.voteDistribution ? proposal.voteDistribution[1] : 0;
                  const noVotes = proposal.voteDistribution ? proposal.voteDistribution[3] : 0;
                  
                  return (
                    <TableRow 
                      key={proposal._id}
                      sx={{ 
                        backgroundColor: isWinner ? 'success.light' : 'transparent',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {isWinner ? (
                            <TrophyIcon color="warning" sx={{ mr: 1 }} />
                          ) : (
                            <Typography variant="h6" sx={{ mr: 1, minWidth: 24 }}>
                              #{index + 1}
                            </Typography>
                          )}
                          {isWinner && (
                            <Chip label="Gewinner" color="success" size="small" />
                          )}
                          {tieInfo?.tiedProposals?.some(tp => tp._id === proposal._id) && !isWinner && (
                            <Chip label="Gleichstand" color="warning" size="small" />
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {proposal.destination?.name || 'Unbekannt'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {proposal.destination?.country || 'Unbekannt'}
                            {proposal.hotelName && ` • ${proposal.hotelName}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          €{proposal.pricePerPerson || 0}/Person
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box display="flex" flexDirection="column" alignItems="center">
                          <Typography variant="h6">
                            {(proposal.weightedScore || 0).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            von 3.0
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="h6">
                          {proposal.voteCount || 0}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box display="flex" gap={0.5} justifyContent="center">
                          <Chip 
                            label={`👍 ${superVotes}`} 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                          <Chip 
                            label={`👎 ${noVotes}`} 
                            size="small" 
                            color="error"
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ width: 60 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={votePercentage}
                            color={isWinner ? 'success' : 'primary'}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {votePercentage.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Button
                          size="small"
                          onClick={() => loadVoteDetails(proposal._id)}
                          disabled={!(proposal.voteCount > 0)}
                        >
                          Anzeigen
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PollIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Noch keine Abstimmungsergebnisse
          </Typography>
          <Typography color="text.secondary">
            Es wurden noch keine Vorschläge zur Abstimmung eingereicht.
          </Typography>
        </Paper>
      )}

      {/* Gewinner Highlight */}
      {group?.status === 'decided' && group?.winningProposal && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🎉 Die Gruppe hat sich entschieden!
          </Typography>
          {(() => {
            const winner = proposals.find(p => p._id === group.winningProposal);
            return winner ? (
              <Box>
                <Typography gutterBottom>
                  <strong>{winner.destination?.name}, {winner.destination?.country}</strong> 
                  {winner.hotelName && ` im ${winner.hotelName}`} 
                  für €{winner.pricePerPerson} pro Person wurde als Reiseziel gewählt.
                </Typography>
                {tieInfo?.hasTie && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Entschieden durch: {tieInfo.tieBreakingMethod === 'vote_count' ? 'mehr Stimmen' :
                                      tieInfo.tieBreakingMethod === 'super_votes' ? 'mehr "Super"-Bewertungen' :
                                      tieInfo.tieBreakingMethod === 'fewer_no_votes' ? 'weniger "Nein"-Bewertungen' :
                                      tieInfo.tieBreakingMethod === 'price_performance' ? 'besseres Preis-Leistungs-Verhältnis' :
                                      'Reihenfolge der Einreichung'}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography>Das gewählte Reiseziel konnte nicht geladen werden.</Typography>
            );
          })()}
        </Alert>
      )}

      {/* Vote Details Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Abstimmungsdetails: {selectedProposal?.destination?.name}
        </DialogTitle>
        <DialogContent>
          {selectedProposal && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Gesamtbewertung: {(selectedProposal.weightedScore || 0).toFixed(1)}/3.0
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedProposal.voteCount || 0} Stimme{(selectedProposal.voteCount || 0) !== 1 ? 'n' : ''} abgegeben
              </Typography>
              
              {/* Enhanced Vote Statistics */}
              {selectedProposal.voteDistribution && (
                <Box sx={{ my: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Bewertungsverteilung:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <ThumbUpIcon color="success" />
                        <Typography variant="h6">{selectedProposal.voteDistribution[1] || 0}</Typography>
                        <Typography variant="caption">Super</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <NeutralIcon color="warning" />
                        <Typography variant="h6">{selectedProposal.voteDistribution[2] || 0}</Typography>
                        <Typography variant="caption">OK</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <ThumbDownIcon color="error" />
                        <Typography variant="h6">{selectedProposal.voteDistribution[3] || 0}</Typography>
                        <Typography variant="caption">Nein</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Einzelne Bewertungen:
              </Typography>
              
              {votes.length > 0 ? (
                <List>
                  {votes.map((vote) => (
                    <ListItem key={vote._id}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {vote.user?.name?.[0] || '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={vote.user?.name || 'Unbekannt'}
                        secondary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {getRankIcon(vote.rank)}
                            <Chip 
                              label={getRankLabel(vote.rank)} 
                              size="small" 
                              color={getRankColor(vote.rank)}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Noch keine Bewertungen abgegeben.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VotingResults;