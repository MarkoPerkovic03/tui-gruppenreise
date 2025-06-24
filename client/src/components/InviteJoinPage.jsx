// client/src/components/InviteJoinPage.jsx - KOMPLETTE VERSION mit Login-Redirect Fix
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  Grid,
  CircularProgress,
  Container,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Euro as EuroIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  FlightTakeoff as FlightIcon
} from '@mui/icons-material';
import { useAuth } from '../App';
import api from '../utils/api';

const InviteJoinPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginDialog, setLoginDialog] = useState(false);

  useEffect(() => {
    console.log('🔍 InviteJoinPage loaded:', {
      token,
      isAuthenticated,
      currentUrl: window.location.href,
      user: user?.email
    });
    
    loadInviteDetails();
  }, [token]);

  // Kein automatisches Beitreten - User soll bewusst entscheiden

  const loadInviteDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Lade Einladungsdetails für Token:', token);
      
      const data = await api.getInviteDetails(token);
      
      setInviteData(data);
      console.log('✅ Einladungsdetails geladen:', data);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Einladungsdetails:', error);
      setError(error.message || 'Diese Einladung ist ungültig oder abgelaufen.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!isAuthenticated) {
      setLoginDialog(true);
      return;
    }

    try {
      setJoining(true);
      setError('');
      
      console.log('👥 Trete Gruppe bei via Token:', token);
      
      const response = await api.joinGroupViaInvite(token);
      
      console.log('✅ Erfolgreich Gruppe beigetreten:', response);
      
      setSuccess(`Willkommen in der Gruppe "${inviteData.group.name}"! 🎉`);
      
      // Nach 4 Sekunden zur Gruppe weiterleiten (mehr Zeit zum Lesen)
      setTimeout(() => {
        navigate(`/groups/${inviteData.group._id}`);
      }, 4000);
      
    } catch (error) {
      console.error('❌ Fehler beim Beitreten:', error);
      setError(error.response?.data?.message || 'Fehler beim Beitreten der Gruppe');
    } finally {
      setJoining(false);
    }
  };

  const handleLogin = () => {
    // Speichere komplette URL für Redirect nach Login
    const currentUrl = window.location.href;
    localStorage.setItem('inviteReturnUrl', currentUrl);
    console.log('🔄 Speichere Invite URL für Redirect:', currentUrl);
    
    navigate('/login');
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return 'Abgelaufen';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} Tag${days !== 1 ? 'e' : ''} ${hours}h`;
    } else {
      return `${hours}h`;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress sx={{ mr: 2 }} />
          <Typography>Lade Einladungsdetails...</Typography>
        </Box>
      </Container>
    );
  }

  if (error && !inviteData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Einladung nicht verfügbar
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              onClick={() => navigate('/groups')}
            >
              Zu den Gruppen
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              Neu laden
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const group = inviteData?.group;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center', backgroundColor: 'primary.main', color: 'white' }}>
        <GroupIcon sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Einladung zur Reisegruppe
        </Typography>
        <Typography variant="h5">
          "{group?.name}"
        </Typography>
      </Paper>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center">
            <CheckIcon sx={{ mr: 1 }} />
            {success}
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Sie werden in 4 Sekunden zur Gruppe weitergeleitet...
          </Typography>
        </Alert>
      )}

      {/* Error Message */}
      {error && !success && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Gruppendetails */}
      <Grid container spacing={3}>
        {/* Hauptinformationen */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reisedetails
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <CalendarIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Reisezeitraum"
                    secondary={
                      group?.travelDateFrom && group?.travelDateTo
                        ? `${new Date(group.travelDateFrom).toLocaleDateString('de-DE')} - ${new Date(group.travelDateTo).toLocaleDateString('de-DE')}`
                        : 'Noch nicht festgelegt'
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <EuroIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Budget pro Person"
                    secondary={`€${group?.budgetMin || 0} - €${group?.budgetMax || 0}`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <GroupIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Teilnehmer"
                    secondary={`${group?.memberCount || 0}/${group?.maxParticipants || 0} Mitglieder`}
                  />
                </ListItem>
              </List>

              {group?.description && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {group.description}
                  </Typography>
                </>
              )}

              {/* Reisevorlieben */}
              {group?.preferences && group.preferences.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Reisevorlieben
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {group.preferences.map((pref, index) => (
                      <Chip key={index} label={pref} size="small" />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ersteller Info */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Erstellt von
              </Typography>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ mr: 2 }}>
                  {group?.creator?.name?.[0] || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">
                    {group?.creator?.name || 'Unbekannt'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gruppenleitung
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Beitritts-Panel */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Gruppe beitreten
              </Typography>

              {/* Status Chips */}
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Chip
                  icon={<TimeIcon />}
                  label={`Einladung läuft ab in ${formatTimeRemaining(inviteData?.expiresAt)}`}
                  color="warning"
                  size="small"
                />
                
                {inviteData?.canJoin ? (
                  <Chip
                    icon={<CheckIcon />}
                    label="Beitritt möglich"
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    icon={<ErrorIcon />}
                    label="Gruppe ist voll"
                    color="error"
                    size="small"
                  />
                )}

                <Chip
                  icon={<FlightIcon />}
                  label={group?.status === 'planning' ? 'Planungsphase' : 
                         group?.status === 'voting' ? 'Abstimmungsphase' :
                         group?.status === 'decided' ? 'Entschieden' : 'Status unbekannt'}
                  color={group?.status === 'planning' ? 'primary' : 
                         group?.status === 'voting' ? 'warning' :
                         group?.status === 'decided' ? 'success' : 'default'}
                  size="small"
                />
              </Stack>

              {/* Anmeldestatus anzeigen */}
              {isAuthenticated && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    ✅ Angemeldet als: <strong>{user?.email}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Sie können jetzt der Gruppe beitreten!
                  </Typography>
                </Alert>
              )}

              {/* Beitritts-Button */}
              {inviteData?.canJoin ? (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleJoinGroup}
                  disabled={joining || success}
                  startIcon={joining ? <CircularProgress size={20} /> : <GroupIcon />}
                  sx={{ mb: 2 }}
                >
                  {joining ? 'Trete bei...' : 
                   success ? 'Beigetreten!' : 
                   isAuthenticated ? 'Jetzt der Gruppe beitreten' : 'Anmelden & Beitreten'}
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  disabled
                  sx={{ mb: 2 }}
                >
                  Gruppe ist voll
                </Button>
              )}

              {!isAuthenticated && !success && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Sie müssen sich zuerst anmelden oder registrieren.
                  </Typography>
                </Alert>
              )}

              {/* Zusätzliche Aktionen */}
              <Box>
                {isAuthenticated ? (
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => navigate('/groups')}
                    size="small"
                  >
                    Meine Gruppen ansehen
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => navigate('/groups')}
                    size="small"
                  >
                    Andere Gruppen ansehen
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Gruppenmitglieder Preview */}
          {group?.memberCount > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Bereits dabei ({group.memberCount})
                </Typography>
                <Stack direction="row" spacing={-0.5}>
                  {group.members?.slice(0, 5).map((member, index) => (
                    <Avatar
                      key={index}
                      sx={{ 
                        width: 32, 
                        height: 32,
                        border: 2,
                        borderColor: 'background.paper'
                      }}
                    >
                      {member.user?.name?.[0] || index + 1}
                    </Avatar>
                  )) || Array.from({ length: Math.min(group.memberCount, 5) }).map((_, index) => (
                    <Avatar
                      key={index}
                      sx={{ 
                        width: 32, 
                        height: 32,
                        border: 2,
                        borderColor: 'background.paper'
                      }}
                    >
                      {index + 1}
                    </Avatar>
                  ))}
                  {group.memberCount > 5 && (
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}>
                      <Typography variant="caption">
                        +{group.memberCount - 5}
                      </Typography>
                    </Avatar>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Login Dialog */}
      <Dialog open={loginDialog} onClose={() => setLoginDialog(false)}>
        <DialogTitle>Anmeldung erforderlich</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Um der Gruppe beizutreten, müssen Sie sich anmelden oder ein neues Konto erstellen.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Nach der Anmeldung werden Sie automatisch zurück zu dieser Einladung geleitet.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleLogin} variant="contained" startIcon={<LoginIcon />}>
            Zur Anmeldung
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InviteJoinPage;