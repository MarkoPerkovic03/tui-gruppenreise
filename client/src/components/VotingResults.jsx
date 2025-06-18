// client/src/components/VotingResults.jsx - Fixed Version mit eigenem Data Loading
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
  CircularProgress
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Poll as PollIcon,
  Person as PersonIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Remove as NeutralIcon
} from '@mui/icons-material';
import api from '../utils/api';

const VotingResults = ({ groupId, group }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    loadProposals();
  }, [groupId]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/proposals/group/${groupId}`);
      setProposals(response.data);
      setError('');
    } catch (error) {
      console.error('Fehler beim Laden der Vorschläge:', error);
      setError('Fehler beim Laden der Abstimmungsergebnisse');
    } finally {
      setLoading(false);
    }
  };

  const loadVoteDetails = async (proposalId) => {
    try {
      const response = await api.get(`/proposals/${proposalId}/votes`);
      setVotes(response.data);
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

  // Sortiere Vorschläge nach gewichteter Punktzahl
  const sortedProposals = [...proposals].sort((a, b) => {
    if (b.weightedScore !== a.weightedScore) {
      return (b.weightedScore || 0) - (a.weightedScore || 0);
    }
    return (b.voteCount || 0) - (a.voteCount || 0);
  });

  const totalVotes = proposals.reduce((sum, proposal) => sum + (proposal.voteCount || 0), 0);
  const maxVotes = Math.max(...proposals.map(p => p.voteCount || 0), 1);

  return (
    <Box>
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
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PollIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{proposals.length}</Typography>
                <Typography color="text.secondary">Vorschläge</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">{totalVotes}</Typography>
                <Typography color="text.secondary">Stimmen gesamt</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrophyIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4">
                  {group?.status === 'decided' ? '1' : '?'}
                </Typography>
                <Typography color="text.secondary">
                  {group?.status === 'decided' ? 'Gewinner' : 'Noch offen'}
                </Typography>
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
                  <TableCell align="center">Beliebtheit</TableCell>
                  <TableCell align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedProposals.map((proposal, index) => {
                  const isWinner = group?.winningProposal === proposal._id;
                  const votePercentage = maxVotes > 0 ? ((proposal.voteCount || 0) / maxVotes) * 100 : 0;
                  
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
              <Typography>
                <strong>{winner.destination?.name}, {winner.destination?.country}</strong> 
                {winner.hotelName && ` im ${winner.hotelName}`} 
                für €{winner.pricePerPerson} pro Person wurde als Reiseziel gewählt.
              </Typography>
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
              
              {/* Vote Distribution */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Verteilung:
              </Typography>
              
              {(() => {
                const distribution = { 1: 0, 2: 0, 3: 0 };
                votes.forEach(vote => {
                  distribution[vote.rank] = (distribution[vote.rank] || 0) + 1;
                });
                
                return (
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <ThumbUpIcon color="success" />
                        <Typography variant="h6">{distribution[1]}</Typography>
                        <Typography variant="caption">Super</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <NeutralIcon color="warning" />
                        <Typography variant="h6">{distribution[2]}</Typography>
                        <Typography variant="caption">OK</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <ThumbDownIcon color="error" />
                        <Typography variant="h6">{distribution[3]}</Typography>
                        <Typography variant="caption">Nein</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                );
              })()}
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