import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Chip,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Stack,
  Fab,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Slider,
  FormGroup,
  FormControlLabel,
  Switch,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoIcon,
  Lock as LockIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
  TrendingUp as StatsIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  BeachAccess as BeachIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  Poll as PollIcon,
  CheckCircle as CheckIcon,
  BookOnline as BookingIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  NotificationImportant as UrgentIcon
} from '@mui/icons-material';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const UserProfile = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [upcomingGroups, setUpcomingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState({ open: false, section: '' });
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);

  const [editData, setEditData] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    loadProfile();
    loadStats();
    loadRecommendations();
    loadUpcomingGroups();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/profile');
      setProfile(response.data);
      setError('');
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error);
      setError('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/profile/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await api.get('/profile/recommendations');
      setRecommendations(response.data.offers || []);
    } catch (error) {
      console.error('Fehler beim Laden der Empfehlungen:', error);
    }
  };

  const loadUpcomingGroups = async () => {
    try {
      const response = await api.get('/groups');
      const upcoming = response.data
        .filter((g) =>
          ['decided', 'booking', 'booked'].includes((g.status || '').toLowerCase()) &&
          g.winningProposal
        )
        .sort(
          (a, b) =>
            new Date(a.winningProposal.departureDate) -
            new Date(b.winningProposal.departureDate)
        );
      setUpcomingGroups(upcoming);
    } catch (error) {
      console.error('Fehler beim Laden der kommenden Reisen:', error);
    }
  };

  // ERWEITERT: Hilfsfunktionen für Buchungsstatus
  const getBookingStatusInfo = (group) => {
    switch (group.status) {
      case 'decided':
        return {
          label: 'Bezahlung offen',
          color: 'warning',
          icon: <PaymentIcon />,
          actionLabel: 'Jetzt buchen!',
          urgent: true,
          description: 'Zahlung erforderlich'
        };
      case 'booking':
        return {
          label: 'Buchung läuft',
          color: 'info',
          icon: <ScheduleIcon />,
          actionLabel: 'Zur Buchung',
          urgent: false,
          description: 'Buchung in Bearbeitung'
        };
      case 'booked':
        return {
          label: 'Gebucht',
          color: 'success',
          icon: <CheckIcon />,
          actionLabel: 'Buchung verwalten',
          urgent: false,
          description: 'Erfolgreich gebucht'
        };
      default:
        return {
          label: 'Unbekannt',
          color: 'default',
          icon: <GroupIcon />,
          actionLabel: 'Öffnen',
          urgent: false,
          description: ''
        };
    }
  };

  const getDaysUntilDeparture = (departureDate) => {
    const today = new Date();
    const departure = new Date(departureDate);
    const diffTime = departure - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // ERWEITERT: Berechne wichtige Statistiken
  const urgentBookings = upcomingGroups.filter(g => g.status === 'decided').length;
  const nextTrip = upcomingGroups[0];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const openEditDialog = (section) => {
    setEditData(getEditDataForSection(section));
    setEditDialog({ open: true, section });
  };

  const getEditDataForSection = (section) => {
    if (!profile) return {};
    
    switch (section) {
      case 'personal':
        return {
          firstName: profile.profile?.firstName || '',
          lastName: profile.profile?.lastName || '',
          phone: profile.profile?.phone || '',
          dateOfBirth: profile.profile?.dateOfBirth || '',
          bio: profile.profile?.bio || ''
        };
      case 'address':
        return {
          street: profile.profile?.address?.street || '',
          city: profile.profile?.address?.city || '',
          postalCode: profile.profile?.address?.postalCode || '',
          country: profile.profile?.address?.country || ''
        };
      case 'preferences':
        return {
          favoriteDestinations: profile.profile?.travelPreferences?.favoriteDestinations || [],
          travelStyle: profile.profile?.travelPreferences?.travelStyle || [],
          budgetRange: profile.profile?.travelPreferences?.budgetRange || { min: 0, max: 5000 },
          preferredDuration: profile.profile?.travelPreferences?.preferredDuration || { min: 1, max: 30 },
          accommodationType: profile.profile?.travelPreferences?.accommodationType || [],
          activities: profile.profile?.travelPreferences?.activities || [],
          transportation: profile.profile?.travelPreferences?.transportation || []
        };
      case 'emergency':
        return {
          name: profile.profile?.emergencyContact?.name || '',
          phone: profile.profile?.emergencyContact?.phone || '',
          relationship: profile.profile?.emergencyContact?.relationship || ''
        };
      case 'notifications':
        return profile.profile?.notifications || {};
      default:
        return {};
    }
  };

  const handleSaveEdit = async () => {
    try {
      let updateData = { profile: {} };
      
      switch (editDialog.section) {
        case 'personal':
          updateData.profile = {
            firstName: editData.firstName,
            lastName: editData.lastName,
            phone: editData.phone,
            dateOfBirth: editData.dateOfBirth,
            bio: editData.bio
          };
          break;
        case 'address':
          updateData.profile = { address: editData };
          break;
        case 'preferences':
          updateData.profile = { travelPreferences: editData };
          break;
        case 'emergency':
          updateData.profile = { emergencyContact: editData };
          break;
        case 'notifications':
          updateData.profile = { notifications: editData };
          break;
      }

      await api.put('/profile', updateData);
      await loadProfile();
      setEditDialog({ open: false, section: '' });
      setError('');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError('Fehler beim Speichern der Änderungen');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Neue Passwörter stimmen nicht überein');
      return;
    }

    try {
      await api.put('/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setError('');
      alert('Passwort erfolgreich geändert');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Ändern des Passworts');
    }
  };

  const handleImageUpload = async () => {
    try {
      await api.post('/profile/upload-image', { imageUrl: newImageUrl });
      await loadProfile();
      setImageDialog(false);
      setNewImageUrl('');
      setError('');
    } catch (error) {
      setError('Fehler beim Hochladen des Bildes');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography>Lädt Profil...</Typography>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        <Alert severity="error">Profil konnte nicht geladen werden</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
      {/* Header */}
      <Box className="page-header" sx={{ background: 'linear-gradient(135deg, #0057B8 0%, #004494 100%)', color: 'white', p: 4, mb: 3, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Mein Profil
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          Verwalten Sie Ihre persönlichen Daten und Reisevorlieben
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ERWEITERT: Urgent Buchungs-Alert */}
      {urgentBookings > 0 && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3,
            border: '2px solid #FF6B35',
            '& .MuiAlert-icon': {
              fontSize: '2rem'
            }
          }}
          icon={<UrgentIcon />}
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<BookingIcon />}
              onClick={() => navigate('/groups')}
              sx={{
                background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
                color: 'white',
                ml: 2
              }}
            >
              Alle Buchungen
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            ⚡ {urgentBookings} {urgentBookings === 1 ? 'Buchung benötigt' : 'Buchungen benötigen'} Ihre Aufmerksamkeit!
          </Typography>
          <Typography variant="body2">
            Sie haben offene Zahlungen für Ihre Gruppenreisen. Buchen Sie jetzt, um Ihren Platz zu sichern.
          </Typography>
        </Alert>
      )}

      {/* Profil-Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Box position="relative">
              <Avatar
                src={profile.profile?.profileImage || profile.avatar}
                sx={{ width: 120, height: 120 }}
              >
                {(profile.profile?.firstName?.[0] || profile.name?.[0] || 'U')}
                {(profile.profile?.lastName?.[0] || '')}
              </Avatar>
              <IconButton
                onClick={() => setImageDialog(true)}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
                size="small"
              >
                <PhotoIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="h5" gutterBottom>
              {profile.profile?.firstName && profile.profile?.lastName 
                ? `${profile.profile.firstName} ${profile.profile.lastName}`
                : profile.name || 'Unbekannter Benutzer'
              }
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {profile.email}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {profile.profile?.bio || 'Noch keine Bio vorhanden'}
            </Typography>
            
            {/* Profil-Vollständigkeit */}
            {stats && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Profil-Vollständigkeit: {stats.profileCompletion || 0}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.profileCompletion || 0} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={2}>
              {urgentBookings > 0 && (
                <Tooltip title={`${urgentBookings} offene Buchung${urgentBookings !== 1 ? 'en' : ''}`}>
                  <Button
                    variant="contained"
                    startIcon={
                      <Badge badgeContent={urgentBookings} color="error">
                        <BookingIcon />
                      </Badge>
                    }
                    onClick={() => navigate('/groups')}
                    sx={{
                      background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': {
                          boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)'
                        },
                        '50%': {
                          boxShadow: '0 6px 20px rgba(255, 107, 53, 0.6)'
                        },
                        '100%': {
                          boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)'
                        }
                      }
                    }}
                  >
                    Buchungen
                  </Button>
                </Tooltip>
              )}
              <Button
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialog(true)}
              >
                Passwort ändern
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* ERWEITERT: Nächste Reise Highlight */}
      {nextTrip && (
        <Card sx={{ 
          mb: 3, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <CardContent>
            <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold' }}>
              🚀 Nächste Reise
            </Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {nextTrip.winningProposal?.destination?.name || nextTrip.name}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarIcon fontSize="small" />
                    <Typography variant="body1">
                      {new Date(nextTrip.winningProposal.departureDate).toLocaleDateString('de-DE')}
                    </Typography>
                  </Box>
                  
                  {(() => {
                    const daysUntil = getDaysUntilDeparture(nextTrip.winningProposal.departureDate);
                    if (daysUntil > 0) {
                      return (
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {daysUntil === 1 ? 'Morgen!' : 
                           daysUntil <= 7 ? `${daysUntil} Tage` :
                           `${daysUntil} Tage`}
                        </Typography>
                      );
                    }
                    return null;
                  })()}
                  
                  {nextTrip.winningProposal.pricePerPerson && (
                    <Typography variant="body1">
                      €{nextTrip.winningProposal.pricePerPerson} p.P.
                    </Typography>
                  )}
                </Box>

                {(() => {
                  const statusInfo = getBookingStatusInfo(nextTrip);
                  return (
                    <Chip
                      icon={statusInfo.icon}
                      label={statusInfo.label}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 'bold',
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  );
                })()}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  {(() => {
                    const statusInfo = getBookingStatusInfo(nextTrip);
                    return (
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<BookingIcon />}
                        onClick={() => navigate(`/groups/${nextTrip._id || nextTrip.id}/booking`)}
                        sx={{
                          backgroundColor: 'white',
                          color: 'primary.main',
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          py: 1.5,
                          px: 3,
                          width: { xs: '100%', md: 'auto' },
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        {statusInfo.actionLabel}
                      </Button>
                    );
                  })()}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<PersonIcon />} label="Persönliche Daten" />
          <Tab icon={<FavoriteIcon />} label="Reisevorlieben" />
          <Tab icon={<StatsIcon />} label="Statistiken" />
          <Tab icon={<FlightIcon />} label="Empfehlungen" />
          <Tab icon={<SettingsIcon />} label="Einstellungen" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Persönliche Informationen */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Persönliche Informationen</Typography>
                  <IconButton onClick={() => openEditDialog('personal')}>
                    <EditIcon />
                  </IconButton>
                </Box>
                <List>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Name" 
                      secondary={`${profile.profile?.firstName || ''} ${profile.profile?.lastName || ''}`.trim() || 'Nicht angegeben'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PhoneIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Telefon" 
                      secondary={profile.profile?.phone || 'Nicht angegeben'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CalendarIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Geburtsdatum" 
                      secondary={profile.profile?.dateOfBirth ? new Date(profile.profile.dateOfBirth).toLocaleDateString('de-DE') : 'Nicht angegeben'} 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Adresse */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Adresse</Typography>
                  <IconButton onClick={() => openEditDialog('address')}>
                    <EditIcon />
                  </IconButton>
                </Box>
                <List>
                  <ListItem>
                    <ListItemIcon><LocationIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Adresse" 
                      secondary={
                        profile.profile?.address ? 
                        `${profile.profile.address.street || ''}, ${profile.profile.address.postalCode || ''} ${profile.profile.address.city || ''}`.trim() :
                        'Nicht angegeben'
                      } 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Notfallkontakt */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Notfallkontakt</Typography>
                  <IconButton onClick={() => openEditDialog('emergency')}>
                    <EditIcon />
                  </IconButton>
                </Box>
                {profile.profile?.emergencyContact ? (
                  <Typography>
                    {profile.profile.emergencyContact.name} ({profile.profile.emergencyContact.relationship}) - {profile.profile.emergencyContact.phone}
                  </Typography>
                ) : (
                  <Typography color="text.secondary">Nicht angegeben</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Reisevorlieben</Typography>
              <IconButton onClick={() => openEditDialog('preferences')}>
                <EditIcon />
              </IconButton>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Lieblingsziele</Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  {profile.profile?.travelPreferences?.favoriteDestinations?.map((dest, index) => (
                    <Chip key={index} label={dest} />
                  )) || <Typography color="text.secondary">Keine angegeben</Typography>}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Reisestil</Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  {profile.profile?.travelPreferences?.travelStyle?.map((style, index) => (
                    <Chip key={index} label={style} color="primary" />
                  )) || <Typography color="text.secondary">Keine angegeben</Typography>}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Budget</Typography>
                <Typography>
                  {profile.profile?.travelPreferences?.budgetRange ? 
                    `€${profile.profile.travelPreferences.budgetRange.min} - €${profile.profile.travelPreferences.budgetRange.max}` :
                    'Nicht angegeben'
                  }
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Bevorzugte Reisedauer</Typography>
                <Typography>
                  {profile.profile?.travelPreferences?.preferredDuration ? 
                    `${profile.profile.travelPreferences.preferredDuration.min} - ${profile.profile.travelPreferences.preferredDuration.max} Tage` :
                    'Nicht angegeben'
                  }
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Lieblings-Aktivitäten</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {profile.profile?.travelPreferences?.activities?.map((activity, index) => (
                    <Chip key={index} label={activity} variant="outlined" />
                  )) || <Typography color="text.secondary">Keine angegeben</Typography>}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <GroupIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{stats.totalGroups}</Typography>
                <Typography color="text.secondary">Gruppen gesamt</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <FlightIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4">{stats.activeGroups}</Typography>
                <Typography color="text.secondary">Aktive Reisen</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4">{stats.completedTrips}</Typography>
                <Typography color="text.secondary">Abgeschlossene Reisen</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PollIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">{stats.totalVotes}</Typography>
                <Typography color="text.secondary">Abstimmungen</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Mitgliedschaft</Typography>
                <Typography>
                  Mitglied seit: {stats.memberSince ? new Date(stats.memberSince).toLocaleDateString('de-DE') : '—'}
                </Typography>
                <Typography>
                  Letzte Aktivität: {stats.lastActive ? new Date(stats.lastActive).toLocaleDateString('de-DE') : '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* ERWEITERT: Kommende Reisen mit direkten Buchungslinks */}
          {upcomingGroups.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">
                      Kommende Reisen ({upcomingGroups.length})
                    </Typography>
                    {urgentBookings > 0 && (
                      <Chip
                        icon={<UrgentIcon />}
                        label={`${urgentBookings} ${urgentBookings === 1 ? 'Buchung offen' : 'Buchungen offen'}`}
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Grid container spacing={2}>
                    {upcomingGroups.map(group => {
                      const statusInfo = getBookingStatusInfo(group);
                      const daysUntil = getDaysUntilDeparture(group.winningProposal?.departureDate);
                      
                      return (
                        <Grid item xs={12} key={group._id}>
                          <Card 
                            variant="outlined" 
                            sx={{ 
                              p: 2,
                              border: statusInfo.urgent ? '2px solid #FF6B35' : '1px solid',
                              borderColor: statusInfo.urgent ? '#FF6B35' : 'divider',
                              '&:hover': {
                                boxShadow: 2,
                                transform: 'translateY(-2px)'
                              },
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={6} md={4}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <FlightIcon color="primary" />
                                  <Typography variant="h6" fontWeight="bold">
                                    {group.name}
                                  </Typography>
                                  {statusInfo.urgent && (
                                    <Tooltip title="Dringende Aktion erforderlich">
                                      <UrgentIcon color="warning" fontSize="small" />
                                    </Tooltip>
                                  )}
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {group.winningProposal?.destination?.name || 'Unbekannt'}
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={6} md={3}>
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Abreise
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold">
                                    {new Date(group.winningProposal?.departureDate).toLocaleDateString('de-DE')}
                                  </Typography>
                                  {daysUntil > 0 && (
                                    <Typography variant="caption" color={daysUntil <= 7 ? 'error.main' : 'text.secondary'}>
                                      {daysUntil === 1 ? 'Morgen!' : 
                                       daysUntil <= 7 ? `In ${daysUntil} Tagen` :
                                       `In ${daysUntil} Tagen`}
                                    </Typography>
                                  )}
                                </Box>
                              </Grid>
                              
                              <Grid item xs={6} sm={3} md={2}>
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Preis p.P.
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold">
                                    €{group.winningProposal?.pricePerPerson || '—'}
                                  </Typography>
                                </Box>
                              </Grid>
                              
                              <Grid item xs={6} sm={3} md={2}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Chip
                                    icon={statusInfo.icon}
                                    label={statusInfo.label}
                                    color={statusInfo.color}
                                    size="small"
                                    sx={{ mb: 1, width: '100%' }}
                                  />
                                </Box>
                              </Grid>
                              
                              <Grid item xs={12} md={1}>
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                  <Tooltip title={statusInfo.description}>
                                    <Button
                                      variant={statusInfo.urgent ? "contained" : "outlined"}
                                      size="small"
                                      startIcon={<BookingIcon />}
                                      onClick={() => navigate(`/groups/${group._id || group.id}/booking`)}
                                      sx={{
                                        minWidth: 'auto',
                                        ...(statusInfo.urgent && {
                                          background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
                                          color: 'white',
                                          '&:hover': {
                                            background: 'linear-gradient(45deg, #E55A2B, #E8851E)'
                                          }
                                        })
                                      }}
                                    >
                                      {statusInfo.urgent ? 'Buchen!' : 'Buchung'}
                                    </Button>
                                  </Tooltip>
                                </Box>
                              </Grid>
                            </Grid>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {/* Schnellzugriff für alle Buchungen */}
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<BookingIcon />}
                      onClick={() => navigate('/groups')}
                      size="large"
                    >
                      Alle Buchungen verwalten
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Empfohlene Reiseangebote für Sie
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Basierend auf Ihren Reisevorlieben und Ihrem Budget
          </Typography>
          
          <Grid container spacing={3}>
            {recommendations.map((offer) => (
              <Grid item xs={12} sm={6} md={4} key={offer.id}>
                <Card>
                  <Box
                    sx={{
                      height: 200,
                      backgroundImage: `url(${offer.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{offer.title}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {offer.location}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                      <Typography variant="h6" color="primary">
                        €{offer.price}
                      </Typography>
                      <Typography variant="body2">
                        {offer.duration} Tage
                      </Typography>
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                      {offer.tags?.slice(0, 2).map((tag, index) => (
                        <Chip key={index} label={tag} size="small" />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {recommendations.length === 0 && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <BeachIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Noch keine Empfehlungen verfügbar
                </Typography>
                <Typography color="text.secondary">
                  Vervollständigen Sie Ihre Reisevorlieben, um personalisierte Empfehlungen zu erhalten.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Benachrichtigungseinstellungen</Typography>
              <IconButton onClick={() => openEditDialog('notifications')}>
                <EditIcon />
              </IconButton>
            </Box>
            
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={profile.profile?.notifications?.email || false} />}
                label="E-Mail Benachrichtigungen"
                disabled
              />
              <FormControlLabel
                control={<Switch checked={profile.profile?.notifications?.sms || false} />}
                label="SMS Benachrichtigungen"
                disabled
              />
              <FormControlLabel
                control={<Switch checked={profile.profile?.notifications?.newOffers || false} />}
                label="Neue Angebote"
                disabled
              />
              <FormControlLabel
                control={<Switch checked={profile.profile?.notifications?.groupUpdates || false} />}
                label="Gruppen-Updates"
                disabled
              />
              <FormControlLabel
                control={<Switch checked={profile.profile?.notifications?.reminders || false} />}
                label="Erinnerungen"
                disabled
              />
              <FormControlLabel
                control={<Switch checked={profile.profile?.notifications?.bookingAlerts || false} />}
                label="Buchungsbenachrichtigungen"
                disabled
              />
            </FormGroup>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Buchungseinstellungen
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={true} />}
                label="Zahlungserinnerungen aktiviert"
                disabled
              />
              <FormControlLabel
                control={<Switch checked={true} />}
                label="Buchungsbestätigungen per E-Mail"
                disabled
              />
              <FormControlLabel
                control={<Switch checked={false} />}
                label="Automatische Buchungen (für Admins)"
                disabled
              />
            </FormGroup>
          </CardContent>
        </Card>
      )}

      {/* ERWEITERT: Floating Action Button für dringende Buchungen */}
      {urgentBookings > 0 && (
        <Fab
          color="warning"
          sx={{ 
            position: 'fixed', 
            bottom: 24, 
            right: 24,
            background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
            color: 'white',
            animation: 'bounce 2s infinite',
            '@keyframes bounce': {
              '0%, 20%, 50%, 80%, 100%': {
                transform: 'translateY(0)'
              },
              '40%': {
                transform: 'translateY(-10px)'
              },
              '60%': {
                transform: 'translateY(-5px)'
              }
            },
            '&:hover': {
              background: 'linear-gradient(45deg, #E55A2B, #E8851E)',
              transform: 'scale(1.1)'
            }
          }}
          onClick={() => navigate('/groups')}
        >
          <Badge badgeContent={urgentBookings} color="error">
            <BookingIcon />
          </Badge>
        </Fab>
      )}

      {/* Edit Dialogs */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, section: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          {editDialog.section === 'personal' && 'Persönliche Daten bearbeiten'}
          {editDialog.section === 'address' && 'Adresse bearbeiten'}
          {editDialog.section === 'preferences' && 'Reisevorlieben bearbeiten'}
          {editDialog.section === 'emergency' && 'Notfallkontakt bearbeiten'}
          {editDialog.section === 'notifications' && 'Benachrichtigungen bearbeiten'}
        </DialogTitle>
        <DialogContent>
          {editDialog.section === 'personal' && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Vorname"
                  value={editData.firstName || ''}
                  onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nachname"
                  value={editData.lastName || ''}
                  onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Geburtsdatum"
                  type="date"
                  value={editData.dateOfBirth || ''}
                  onChange={(e) => setEditData({...editData, dateOfBirth: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  multiline
                  rows={3}
                  value={editData.bio || ''}
                  onChange={(e) => setEditData({...editData, bio: e.target.value})}
                />
              </Grid>
            </Grid>
          )}

          {editDialog.section === 'address' && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Straße"
                  value={editData.street || ''}
                  onChange={(e) => setEditData({...editData, street: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="PLZ"
                  value={editData.postalCode || ''}
                  onChange={(e) => setEditData({...editData, postalCode: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Stadt"
                  value={editData.city || ''}
                  onChange={(e) => setEditData({...editData, city: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Land"
                  value={editData.country || ''}
                  onChange={(e) => setEditData({...editData, country: e.target.value})}
                />
              </Grid>
            </Grid>
          )}

          {editDialog.section === 'emergency' && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Beziehung"
                  value={editData.relationship || ''}
                  onChange={(e) => setEditData({...editData, relationship: e.target.value})}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, section: '' })}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Passwort ändern</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Aktuelles Passwort"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Neues Passwort"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Neues Passwort bestätigen"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Abbrechen</Button>
          <Button onClick={handlePasswordChange} variant="contained">Ändern</Button>
        </DialogActions>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialog} onClose={() => setImageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Profilbild ändern</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Bild-URL"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="https://example.com/mein-bild.jpg"
            sx={{ mt: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Geben Sie die URL eines Bildes ein oder lassen Sie das Feld leer für ein zufälliges Avatar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialog(false)}>Abbrechen</Button>
          <Button onClick={handleImageUpload} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserProfile;
