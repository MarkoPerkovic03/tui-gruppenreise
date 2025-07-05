// client/src/components/GroupDetail.jsx - ERWEITERT mit InviteLinkManager und Admin-Beförderung
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Stack,
  IconButton,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  ArrowBack as ArrowBackIcon,
  FlightTakeoff as FlightTakeoffIcon,
  Poll as PollIcon,
  Link as LinkIcon,
  MoreVert as MoreVertIcon,
  PersonRemove as PersonRemoveIcon,
  Warning as WarningIcon,
  AdminPanelSettings as AdminIcon,
  BookOnline as BookingIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Euro as EuroIcon,
  People as PeopleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../utils/api';
import ProposalManager from './ProposalManager';
import VotingResults from './VotingResults';
import InviteLinkManager from './InviteLinkManager';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Dialog States
  const [addPreferenceOpen, setAddPreferenceOpen] = useState(false);
  const [newPreference, setNewPreference] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addMemberError, setAddMemberError] = useState('');
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [removeMemberOpen, setRemoveMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  
  // NEU: Admin-Beförderungs-Dialog
  const [promoteAdminOpen, setPromoteAdminOpen] = useState(false);
  
  // Menu State
  const [memberMenuAnchor, setMemberMenuAnchor] = useState(null);

  // Verfügbare Präferenzen basierend auf Ihrem Backend-Model
  const availablePreferences = [
    'all_inclusive', 'beach', 'city', 'adventure', 'culture', 'wellness', 'family', 'party'
  ];

  // Hilfsfunktion für Buchungsstatus
  const getBookingStatusInfo = (status) => {
    switch (status) {
      case 'decided':
        return {
          label: 'Bereit zur Buchung',
          color: 'warning',
          icon: <PaymentIcon />,
          actionLabel: 'Jetzt buchen!',
          description: 'Die Gruppe hat sich entschieden - jetzt kann gebucht werden!',
          buttonColor: 'linear-gradient(45deg, #FF6B35, #F7931E)',
          urgent: true
        };
      case 'booking':
        return {
          label: 'Buchung läuft',
          color: 'info',
          icon: <ScheduleIcon />,
          actionLabel: 'Zur Buchung',
          description: 'Die Buchung ist bereits in Bearbeitung',
          buttonColor: '#2196F3',
          urgent: false
        };
      case 'booked':
        return {
          label: 'Gebucht',
          color: 'success',
          icon: <CheckIcon />,
          actionLabel: 'Buchung verwalten',
          description: 'Die Reise ist erfolgreich gebucht!',
          buttonColor: '#4CAF50',
          urgent: false
        };
      default:
        return null;
    }
  };

  // SOFORTIGE KORREKTUR: Validiere und korrigiere ungültige IDs
  useEffect(() => {
    console.log('🔍 GroupDetail - ID Check:', { id, type: typeof id });
    
    // Behandle alle ungültigen ID-Fälle
    if (!id || id === 'undefined' || id === 'null' || id.length < 10) {
      console.error('❌ Ungültige Gruppen-ID:', id);
      setError(`Ungültige Gruppen-ID: "${id}". Sie werden zur Gruppenübersicht weitergeleitet.`);
      setLoading(false);
      
      // Automatische Weiterleitung nach 3 Sekunden
      const timer = setTimeout(() => {
        navigate('/groups', { replace: true });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [id, navigate]);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      // Früher Exit wenn ID ungültig
      if (!id || id === 'undefined' || id === 'null' || id.length < 10) {
        return;
      }

      try {
        console.log('📡 Lade Gruppendetails für ID:', id);
        setError('');
        setLoading(true);
        
        const response = await api.get(`/groups/${id}`);
        console.log('✅ Gruppe geladen:', response.data);
        
        const groupData = response.data;
        setGroup(groupData);
        
        // Prüfe Admin-Status
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userIsAdmin = groupData.members?.some(member => {
          const memberId = member.user?._id || member.user?.id || member.user;
          const currentUserId = currentUser.id || currentUser._id;
          return memberId === currentUserId && member.role === 'admin';
        }) || groupData.creator?._id === currentUser.id || groupData.creator === currentUser.id;
        
        setIsAdmin(userIsAdmin);
        
      } catch (error) {
        console.error('❌ Fehler beim Laden der Gruppendetails:', error);
        
        let errorMessage = 'Fehler beim Laden der Gruppendetails.';
        
        if (error.response?.status === 404) {
          errorMessage = 'Gruppe nicht gefunden.';
        } else if (error.response?.status === 403) {
          errorMessage = 'Sie haben keine Berechtigung, diese Gruppe zu sehen.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Ungültige Gruppen-ID Format.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [id]);

  const handleGroupUpdate = async () => {
    try {
      const response = await api.get(`/groups/${id}`);
      setGroup(response.data);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Gruppe:', error);
    }
  };

  const handleAddPreference = async () => {
    if (!newPreference) return;

    try {
      const updatedPreferences = [...(group.preferences || [])];
      if (!updatedPreferences.includes(newPreference)) {
        updatedPreferences.push(newPreference);
        
        await api.put(`/groups/${id}`, { preferences: updatedPreferences });
        setGroup(prev => ({ ...prev, preferences: updatedPreferences }));
        
        setNewPreference('');
        setAddPreferenceOpen(false);
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Präferenz:', error);
      setError('Fehler beim Hinzufügen der Präferenz');
    }
  };

  const handleDeletePreference = async (preference) => {
    try {
      const updatedPreferences = (group.preferences || []).filter(p => p !== preference);
      await api.put(`/groups/${id}`, { preferences: updatedPreferences });
      setGroup(prev => ({ ...prev, preferences: updatedPreferences }));
    } catch (error) {
      console.error('Fehler beim Löschen der Präferenz:', error);
      setError('Fehler beim Löschen der Präferenz');
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    try {
      setAddMemberError('');
      
      const response = await api.post(`/groups/${id}/members`, {
        userEmail: newMemberEmail.trim()
      });
      
      // Gruppe neu laden für aktuelle Daten
      const groupResponse = await api.get(`/groups/${id}`);
      setGroup(groupResponse.data);
      
      setNewMemberEmail('');
      setAddMemberOpen(false);
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen des Mitglieds:', error);
      setAddMemberError(
        error.response?.data?.message || 
        'Fehler beim Hinzufügen des Mitglieds. Prüfen Sie die E-Mail-Adresse.'
      );
    }
  };

  // Mitglied entfernen
  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      await api.delete(`/groups/${id}/members/${selectedMember.user._id}`);
      await handleGroupUpdate();
      setRemoveMemberOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('❌ Fehler beim Entfernen des Mitglieds:', error);
      setError(error.response?.data?.message || 'Fehler beim Entfernen des Mitglieds');
    }
  };

  // NEU: Admin-Beförderung/Degradierung
  const handlePromoteToAdmin = async () => {
    if (!selectedMember) return;

    try {
      const newRole = selectedMember.role === 'admin' ? 'member' : 'admin';
      const memberName = selectedMember.user?.name || selectedMember.user?.email || 'Mitglied';
      
      console.log(`🔄 Ändere Rolle von ${memberName} zu ${newRole}`);

      await api.put(`/groups/${id}/members/${selectedMember.user._id}/role`, {
        role: newRole
      });

      // Gruppe neu laden
      await handleGroupUpdate();
      
      // Dialog schließen
      setPromoteAdminOpen(false);
      setSelectedMember(null);
      
      // Erfolg anzeigen (optional)
      console.log(`✅ ${memberName} wurde erfolgreich zum ${newRole === 'admin' ? 'Admin' : 'Mitglied'} gemacht`);
      
    } catch (error) {
      console.error('❌ Fehler beim Ändern der Rolle:', error);
      setError(error.response?.data?.message || 'Fehler beim Ändern der Rolle');
      setPromoteAdminOpen(false);
    }
  };

  // Gruppe löschen
  const handleDeleteGroup = async () => {
    try {
      await api.delete(`/groups/${id}`);
      navigate('/groups', { replace: true });
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Gruppe:', error);
      setError(error.response?.data?.message || 'Fehler beim Löschen der Gruppe');
      setDeleteGroupOpen(false);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await api.delete(`/groups/${id}/leave`);
      navigate('/groups', { replace: true });
    } catch (error) {
      console.error('Fehler beim Verlassen der Gruppe:', error);
      setError(error.response?.data?.message || 'Fehler beim Verlassen der Gruppe');
    }
  };

  // Menü-Handler für Mitgliederverwaltung
  const handleMemberMenuOpen = (event, member) => {
    setMemberMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMemberMenuClose = () => {
    setMemberMenuAnchor(null);
    // selectedMember NICHT hier auf null setzen - wird erst beim Dialog-Close gemacht
  };

  // Loading State
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Lade Gruppendetails...</Typography>
      </Box>
    );
  }

  // Error State - mit automatischer Weiterleitung
  if (error && !group) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button 
            variant="contained" 
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/groups', { replace: true })}
          >
            Zur Gruppenübersicht
          </Button>
          <Button 
            variant="outlined"
            onClick={() => window.location.reload()}
          >
            Seite neu laden
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Sie werden automatisch in 3 Sekunden weitergeleitet...
        </Typography>
      </Box>
    );
  }

  // No Group State
  if (!group) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Gruppe nicht gefunden
        </Typography>
        <Button 
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/groups', { replace: true })}
        >
          Zurück zur Übersicht
        </Button>
      </Box>
    );
  }

  // Bestimme welche Tabs angezeigt werden sollen
  const getAvailableTabs = () => {
    const tabs = [
      { label: 'Übersicht', value: 0 },
      { label: 'Reisevorschläge', value: 1 },
      { label: 'Mitglieder', value: 2 }
    ];

    // Füge Ergebnisse-Tab hinzu wenn Abstimmung läuft oder beendet
    if (group.status === 'voting' || group.status === 'decided') {
      tabs.splice(2, 0, { label: 'Abstimmungsergebnisse', value: 2 });
      // Verschiebe Mitglieder-Tab
      tabs[3].value = 3;
    }

    // Füge Einladungs-Tab hinzu für Admins
    if (isAdmin) {
      tabs.push({ 
        label: 'Einladungen', 
        value: group.status === 'voting' || group.status === 'decided' ? 4 : 3 
      });
    }

    return tabs;
  };

  const availableTabs = getAvailableTabs();
  const bookingStatus = getBookingStatusInfo(group.status);
  const hasBookingAccess = ['decided', 'booking', 'booked'].includes(group.status);

  return (
    <>
      {/* Header */}
      <Box className="page-header">
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/groups')}
            sx={{ mb: 2, color: 'white' }}
          >
            Zurück zur Übersicht
          </Button>
          <Typography variant="h4" sx={{ mb: 2, color: 'white' }}>
            {group.name}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
            {group.description}
          </Typography>
          
          {/* Status und Buchungsbutton im Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={
                group.status === 'planning' ? 'Planungsphase' : 
                group.status === 'voting' ? 'Abstimmungsphase' :
                group.status === 'decided' ? 'Entschieden' : 
                group.status === 'booking' ? 'Buchung läuft' :
                group.status === 'booked' ? 'Gebucht' : 'Unbekannt'
              }
              color={
                group.status === 'planning' ? 'primary' : 
                group.status === 'voting' ? 'warning' :
                group.status === 'decided' ? 'success' : 
                group.status === 'booking' ? 'info' :
                group.status === 'booked' ? 'success' : 'default'
              }
              icon={
                group.status === 'voting' ? <PollIcon /> :
                group.status === 'decided' ? <FlightTakeoffIcon /> :
                bookingStatus?.icon || undefined
              }
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' },
                fontSize: '1rem',
                height: 40
              }}
            />

            {/* ERWEITERT: Prominenter Buchungsbutton im Header */}
            {hasBookingAccess && bookingStatus && (
              <Tooltip title={bookingStatus.description}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<BookingIcon />}
                  onClick={() => navigate(`/groups/${id}/booking`)}
                  sx={{
                    background: bookingStatus.buttonColor,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    py: 1.5,
                    px: 3,
                    boxShadow: bookingStatus.urgent ? '0 4px 12px rgba(255, 107, 53, 0.4)' : undefined,
                    animation: bookingStatus.urgent ? 'pulse 2s infinite' : undefined,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.3)'
                    },
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
                  {bookingStatus.actionLabel}
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* ERWEITERT: Buchungs-Alert für bessere Sichtbarkeit */}
        {hasBookingAccess && bookingStatus && (
          <Alert 
            severity={bookingStatus.color} 
            sx={{ 
              mb: 3,
              border: bookingStatus.urgent ? '2px solid #FF6B35' : undefined,
              '& .MuiAlert-icon': {
                fontSize: '2rem'
              }
            }}
            icon={bookingStatus.icon}
            action={
              <Button
                variant="contained"
                size="small"
                startIcon={<BookingIcon />}
                onClick={() => navigate(`/groups/${id}/booking`)}
                sx={{
                  background: bookingStatus.buttonColor,
                  color: 'white',
                  ml: 2
                }}
              >
                {bookingStatus.actionLabel}
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              {bookingStatus.description}
            </Typography>
            {group.winningProposal && (
              <Typography variant="body2">
                <strong>Reiseziel:</strong> {group.winningProposal.destination?.name || 'Unbekannt'} | 
                <strong> Abreise:</strong> {group.winningProposal.departureDate ? 
                  new Date(group.winningProposal.departureDate).toLocaleDateString('de-DE') : 
                  'Nicht festgelegt'} |
                <strong> Teilnehmer:</strong> {group.members?.length || 0}
              </Typography>
            )}
          </Alert>
        )}

        <Paper>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            {availableTabs.map(tab => (
              <Tab 
                key={tab.value} 
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {tab.label === 'Einladungen' && <LinkIcon fontSize="small" />}
                    {tab.label}
                  </Box>
                } 
              />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Übersicht Tab */}
            {activeTab === 0 && (
              <Stack spacing={3}>
                {/* ERWEITERT: Buchungsübersicht Card wenn verfügbar */}
                {hasBookingAccess && group.winningProposal && (
                  <Card 
                    sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      mb: 3
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FlightTakeoffIcon />
                        Ihre gebuchte Reise
                      </Typography>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                          <Typography variant="h5" gutterBottom>
                            {group.winningProposal.destination?.name || 'Unbekannt'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
                            {group.winningProposal.departureDate && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarIcon fontSize="small" />
                                <Typography>
                                  {new Date(group.winningProposal.departureDate).toLocaleDateString('de-DE')}
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PeopleIcon fontSize="small" />
                              <Typography>{group.members?.length || 0} Teilnehmer</Typography>
                            </Box>
                            {group.winningProposal.pricePerPerson && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EuroIcon fontSize="small" />
                                <Typography>{group.winningProposal.pricePerPerson}€ p.P.</Typography>
                              </Box>
                            )}
                          </Box>
                          <Chip
                            icon={bookingStatus.icon}
                            label={bookingStatus.label}
                            sx={{
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            startIcon={<BookingIcon />}
                            onClick={() => navigate(`/groups/${id}/booking`)}
                            sx={{
                              backgroundColor: 'white',
                              color: 'primary.main',
                              fontWeight: 'bold',
                              '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.9)'
                              }
                            }}
                          >
                            {bookingStatus.actionLabel}
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                <Typography variant="h6">Gruppendetails</Typography>
                
                {/* Reisezeitraum */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Reisezeitraum
                  </Typography>
                  <Typography>
                    {group.travelDateFrom && group.travelDateTo ? (
                      `${new Date(group.travelDateFrom).toLocaleDateString()} - ${new Date(group.travelDateTo).toLocaleDateString()}`
                    ) : (
                      'Noch nicht festgelegt'
                    )}
                  </Typography>
                </Box>

                {/* Budget */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Budget pro Person
                  </Typography>
                  <Typography>
                    {group.budgetMin}€ - {group.budgetMax}€
                  </Typography>
                </Box>

                {/* Präferenzen */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2">
                      Reisepräferenzen
                    </Typography>
                    {isAdmin && (
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => setAddPreferenceOpen(true)}
                        size="small"
                        variant="outlined"
                      >
                        Hinzufügen
                      </Button>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.preferences?.length > 0 ? (
                      group.preferences.map(preference => (
                        <Chip
                          key={preference}
                          label={preference}
                          onDelete={isAdmin ? () => handleDeletePreference(preference) : undefined}
                          color="primary"
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography color="text.secondary">
                        Noch keine Präferenzen festgelegt
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Status und Teilnehmer */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Status
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Chip 
                      label={group.status || 'planning'} 
                      color={group.status === 'planning' ? 'warning' : 'success'}
                    />
                    <Typography variant="body2">
                      {group.members?.length || 0} / {group.maxParticipants} Teilnehmer
                    </Typography>
                  </Box>
                </Box>

                {/* Aktionen */}
                <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Stack direction="row" spacing={2}>
                    {hasBookingAccess && (
                      <Button
                        variant="contained"
                        startIcon={<BookingIcon />}
                        onClick={() => navigate(`/groups/${id}/booking`)}
                        sx={{
                          background: bookingStatus.buttonColor,
                          '&:hover': {
                            opacity: 0.9
                          }
                        }}
                      >
                        {bookingStatus.actionLabel}
                      </Button>
                    )}

                    {!isAdmin && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleLeaveGroup}
                      >
                        Gruppe verlassen
                      </Button>
                    )}

                    {isAdmin && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteGroupOpen(true)}
                      >
                        Gruppe löschen
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* Reisevorschläge Tab */}
            {activeTab === 1 && (
              <ProposalManager 
                groupId={id} 
                group={group} 
                onGroupUpdate={handleGroupUpdate}
              />
            )}

            {/* Abstimmungsergebnisse Tab (nur wenn voting oder decided) */}
            {(group.status === 'voting' || group.status === 'decided') && activeTab === 2 && (
              <VotingResults 
                groupId={id} 
                group={group}
              />
            )}

            {/* Mitglieder Tab */}
            {activeTab === (group.status === 'voting' || group.status === 'decided' ? 3 : 2) && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Mitglieder ({group.members?.length || 0})
                  </Typography>
                  {isAdmin && (
                    <Button
                      startIcon={<PersonAddIcon />}
                      onClick={() => setAddMemberOpen(true)}
                      variant="outlined"
                    >
                      Mitglied hinzufügen
                    </Button>
                  )}
                </Box>

                <List>
                  {group.members?.map((member, index) => {
                    const memberUser = member.user;
                    const displayName = memberUser?.name || memberUser?.email || `Mitglied ${index + 1}`;
                    const displayEmail = memberUser?.email || 'Keine E-Mail';
                    const isGroupCreator = (memberUser?._id || memberUser?.id) === (group.creator?._id || group.creator);
                    
                    return (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                              <Typography variant="body1">
                                {displayName}
                              </Typography>
                              
                              {isGroupCreator && (
                                <Chip 
                                  label="Ersteller" 
                                  size="small" 
                                  color="primary"
                                  variant="filled"
                                />
                              )}
                              
                              {member.role === 'admin' && (
                                <Chip 
                                  label="Administrator" 
                                  size="small" 
                                  color="warning"
                                  icon={<AdminIcon />}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography component="span" variant="body2">
                                {displayEmail}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                Beigetreten: {new Date(member.joinedAt || Date.now()).toLocaleDateString('de-DE')}
                              </Typography>
                              {member.role === 'member' && (
                                <>
                                  <br />
                                  <Typography variant="caption" color="text.secondary">
                                    Status: Normales Mitglied
                                  </Typography>
                                </>
                              )}
                            </Box>
                          }
                        />
                        {/* Admin-Aktionen für Mitglieder */}
                        {isAdmin && !isGroupCreator && (
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={(e) => handleMemberMenuOpen(e, member)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}

            {/* Einladungen Tab (nur für Admins) */}
            {isAdmin && activeTab === (group.status === 'voting' || group.status === 'decided' ? 4 : 3) && (
              <InviteLinkManager 
                groupId={id}
                group={group}
                onUpdate={handleGroupUpdate}
              />
            )}
          </Box>
        </Paper>
      </Box>

      {/* ERWEITERT: Mitglieder-Aktionen Menü mit Admin-Beförderung */}
      <Menu
        anchorEl={memberMenuAnchor}
        open={Boolean(memberMenuAnchor)}
        onClose={handleMemberMenuClose}
      >
        {/* Bestehende Option: Mitglied entfernen */}
        <MenuItem onClick={() => {
          handleMemberMenuClose();
          setRemoveMemberOpen(true);
        }}>
          <ListItemIcon>
            <PersonRemoveIcon fontSize="small" />
          </ListItemIcon>
          Mitglied entfernen
        </MenuItem>

        {/* NEU: Zu Admin machen (nur für normale Mitglieder) */}
        {selectedMember?.role === 'member' && (
          <MenuItem onClick={() => {
            handleMemberMenuClose();
            setPromoteAdminOpen(true);
          }}>
            <ListItemIcon>
              <AdminIcon fontSize="small" color="warning" />
            </ListItemIcon>
            Zu Admin machen
          </MenuItem>
        )}

        {/* NEU: Admin-Rechte entziehen (nur für Admins, aber nicht für Ersteller) */}
        {selectedMember?.role === 'admin' && 
         (selectedMember?.user?._id || selectedMember?.user?.id) !== (group.creator?._id || group.creator) && (
          <MenuItem onClick={() => {
            handleMemberMenuClose();
            setPromoteAdminOpen(true);
          }}>
            <ListItemIcon>
              <PersonIcon fontSize="small" color="action" />
            </ListItemIcon>
            Admin-Rechte entziehen
          </MenuItem>
        )}
      </Menu>

      {/* Dialog: Präferenz hinzufügen */}
      <Dialog open={addPreferenceOpen} onClose={() => setAddPreferenceOpen(false)}>
        <DialogTitle>Neue Präferenz hinzufügen</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Präferenz auswählen</InputLabel>
            <Select
              value={newPreference}
              onChange={(e) => setNewPreference(e.target.value)}
              label="Präferenz auswählen"
            >
              {availablePreferences
                .filter(pref => !group.preferences?.includes(pref))
                .map((pref) => (
                  <MenuItem key={pref} value={pref}>
                    {pref}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddPreferenceOpen(false);
            setNewPreference('');
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddPreference} 
            variant="contained"
            disabled={!newPreference}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Mitglied hinzufügen */}
      <Dialog open={addMemberOpen} onClose={() => {
        setAddMemberOpen(false);
        setAddMemberError('');
        setNewMemberEmail('');
      }}>
        <DialogTitle>Neues Mitglied hinzufügen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="E-Mail-Adresse"
            type="email"
            fullWidth
            variant="outlined"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            error={!!addMemberError}
            helperText={addMemberError}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddMemberOpen(false);
            setAddMemberError('');
            setNewMemberEmail('');
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddMember}
            variant="contained"
            disabled={!newMemberEmail.trim()}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Mitglied entfernen */}
      <Dialog open={removeMemberOpen} onClose={() => {
        setRemoveMemberOpen(false);
        setSelectedMember(null);
      }}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Mitglied entfernen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie <strong>{selectedMember?.user?.name || selectedMember?.user?.email}</strong> aus der Gruppe entfernen möchten?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRemoveMemberOpen(false);
            setSelectedMember(null);
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleRemoveMember}
            variant="contained"
            color="error"
          >
            Entfernen
          </Button>
        </DialogActions>
      </Dialog>

      {/* NEU: Dialog für Admin-Beförderung/Degradierung */}
      <Dialog open={promoteAdminOpen} onClose={() => {
        setPromoteAdminOpen(false);
        setSelectedMember(null);
      }}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AdminIcon color="warning" />
            {selectedMember?.role === 'admin' ? 'Admin-Rechte entziehen' : 'Zu Admin machen'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {selectedMember?.role === 'admin' ? (
              <>
                Möchten Sie <strong>{selectedMember?.user?.name || selectedMember?.user?.email}</strong> die 
                Admin-Rechte entziehen?
              </>
            ) : (
              <>
                Möchten Sie <strong>{selectedMember?.user?.name || selectedMember?.user?.email}</strong> zum 
                Administrator dieser Gruppe machen?
              </>
            )}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {selectedMember?.role === 'admin' ? (
              <>
                <strong>Als normales Mitglied kann diese Person:</strong><br/>
                • Reisevorschläge einreichen und abstimmen<br/>
                • An Gruppendiskussionen teilnehmen<br/>
                <br/>
                <strong>Verliert diese Berechtigungen:</strong><br/>
                • Neue Mitglieder einladen<br/>
                • Gruppeneinstellungen bearbeiten<br/>
                • Andere Mitglieder verwalten
              </>
            ) : (
              <>
                <strong>Als Admin kann diese Person:</strong><br/>
                • Neue Mitglieder einladen und entfernen<br/>
                • Gruppeneinstellungen bearbeiten<br/>
                • Reisevorschläge verwalten<br/>
                • Abstimmungen starten und beenden<br/>
                • Andere Mitglieder zu Admins machen
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPromoteAdminOpen(false);
            setSelectedMember(null);
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handlePromoteToAdmin}
            variant="contained"
            color={selectedMember?.role === 'admin' ? 'warning' : 'primary'}
            startIcon={selectedMember?.role === 'admin' ? <PersonIcon /> : <AdminIcon />}
          >
            {selectedMember?.role === 'admin' ? 'Rechte entziehen' : 'Zu Admin machen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Gruppe löschen */}
      <Dialog open={deleteGroupOpen} onClose={() => setDeleteGroupOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="error" />
            Gruppe löschen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Sind Sie sicher, dass Sie die Gruppe <strong>"{group?.name}"</strong> dauerhaft löschen möchten?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten, Reisevorschläge und Abstimmungen werden unwiderruflich gelöscht.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGroupOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleDeleteGroup}
            variant="contained"
            color="error"
          >
            Gruppe löschen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GroupDetail;