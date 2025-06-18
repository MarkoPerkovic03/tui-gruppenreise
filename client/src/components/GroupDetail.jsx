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
  MenuItem
} from '@mui/material';
import api from '../utils/api';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PollIcon from '@mui/icons-material/Poll';
import ProposalManager from './ProposalManager';
import VotingResults from './VotingResults';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [addPreferenceOpen, setAddPreferenceOpen] = useState(false);
  const [newPreference, setNewPreference] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addMemberError, setAddMemberError] = useState('');

  // Verfügbare Präferenzen basierend auf Ihrem Backend-Model
  const availablePreferences = [
    'all_inclusive', 'beach', 'city', 'adventure', 'culture', 'wellness', 'family', 'party'
  ];

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

  const handleLeaveGroup = async () => {
    try {
      await api.delete(`/groups/${id}/leave`);
      navigate('/groups', { replace: true });
    } catch (error) {
      console.error('Fehler beim Verlassen der Gruppe:', error);
      setError(error.response?.data?.message || 'Fehler beim Verlassen der Gruppe');
    }
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

    return tabs;
  };

  const availableTabs = getAvailableTabs();

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
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            {group.description}
          </Typography>
          
          {/* Status Badge im Header */}
          <Box sx={{ mt: 2 }}>
            <Chip 
              label={
                group.status === 'planning' ? 'Planungsphase' : 
                group.status === 'voting' ? 'Abstimmungsphase' :
                group.status === 'decided' ? 'Entschieden' : 'Unbekannt'
              }
              color={
                group.status === 'planning' ? 'primary' : 
                group.status === 'voting' ? 'warning' :
                group.status === 'decided' ? 'success' : 'default'
              }
              icon={
                group.status === 'voting' ? <PollIcon /> :
                group.status === 'decided' ? <FlightTakeoffIcon /> : undefined
              }
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
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

        <Paper>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            {availableTabs.map(tab => (
              <Tab key={tab.value} label={tab.label} />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Übersicht Tab */}
            {activeTab === 0 && (
              <Stack spacing={3}>
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
                    {!isAdmin && (
                      <Button 
                        variant="outlined" 
                        color="error"
                        onClick={handleLeaveGroup}
                      >
                        Gruppe verlassen
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
                    
                    return (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={displayName}
                          secondary={
                            <Box>
                              <Typography component="span" variant="body2">
                                {displayEmail}
                              </Typography>
                              <br />
                              <Chip 
                                label={member.role === 'admin' ? 'Administrator' : 'Mitglied'} 
                                size="small"
                                color={member.role === 'admin' ? 'primary' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

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
    </>
  );
};

export default GroupDetail;