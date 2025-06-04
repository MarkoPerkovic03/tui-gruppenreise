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
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  ListItemSecondaryAction
} from '@mui/material';
import api from '../utils/api'; // KORRIGIERT: Verwende die konfigurierte API
import TravelProposal, { TravelProposalList } from './TravelProposal';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const GroupDetail = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [editPreferencesOpen, setEditPreferencesOpen] = useState(false);
  const [editMembersOpen, setEditMembersOpen] = useState(false);
  const [newPreferences, setNewPreferences] = useState(null);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [addPreferenceOpen, setAddPreferenceOpen] = useState(false);
  const [newPreference, setNewPreference] = useState('');
  const [preferenceType, setPreferenceType] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addMemberError, setAddMemberError] = useState('');

  // Vordefinierte Listen für Präferenzen
  const travelTypes = [
    'Strandurlaub',
    'Städtereise',
    'Wanderurlaub',
    'Kulturreise',
    'Abenteuerreise'
  ];

  const activities = [
    'Sightseeing',
    'Shopping',
    'Sport',
    'Entspannung',
    'Nachtleben',
    'Kulinarik'
  ];

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        console.log('Lade Gruppendetails für ID:', id);
        setError('');
        
        // KORRIGIERT: Verwende api statt axios
        const groupResponse = await api.get(`/groups/${id}`);
        console.log('Gruppe geladen:', groupResponse.data);
        setGroup(groupResponse.data);
        
        // Prüfe, ob der aktuelle Benutzer Admin ist
        const currentUser = JSON.parse(localStorage.getItem('user'));
        setIsAdmin(groupResponse.data.members.some(
          member => member.email === currentUser.email && member.role === 'admin'
        ));
        setNewPreferences(groupResponse.data.preferences);
        
      } catch (error) {
        console.error('Fehler beim Laden der Gruppendetails:', error);
        setError('Fehler beim Laden der Gruppendetails. Bitte versuchen Sie es erneut.');
      }
    };
    
    if (id) {
      fetchGroupDetails();
    }
  }, [id]);

  const handlePreferencesSubmit = async () => {
    try {
      await api.put(`/groups/${id}/preferences`, { preferences: newPreferences });
      setGroup(prev => ({ ...prev, preferences: newPreferences }));
      setEditPreferencesOpen(false);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Präferenzen:', error);
      setError('Fehler beim Aktualisieren der Präferenzen');
    }
  };

  const handleMemberRoleChange = async (email, newRole) => {
    const updatedMembers = group.members.map(member =>
      member.email === email ? { ...member, role: newRole } : member
    );
    
    try {
      await api.put(`/groups/${id}/members`, { members: updatedMembers });
      setGroup(prev => ({ ...prev, members: updatedMembers }));
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Mitgliederrollen:', error);
      setError('Fehler beim Aktualisieren der Mitgliederrollen');
    }
  };

  const handleProposalVote = async (proposalId) => {
    try {
      const response = await api.post(`/groups/${id}/proposals/${proposalId}/vote`);
      setGroup(prev => ({
        ...prev,
        travelProposals: prev.travelProposals.map(proposal =>
          proposal.id === proposalId ? response.data : proposal
        )
      }));
    } catch (error) {
      console.error('Fehler beim Abstimmen:', error);
      setError('Fehler beim Abstimmen');
    }
  };

  const handleProposalAdded = (newProposal) => {
    setGroup(prev => ({
      ...prev,
      travelProposals: [...prev.travelProposals, newProposal]
    }));
  };

  const handleDeletePreference = async (type, value) => {
    try {
      const updatedPreferences = { ...group.preferences };
      if (type === 'budget') {
        updatedPreferences.budget = [0, 5000]; // Reset auf Standardwert
      } else {
        updatedPreferences[type] = updatedPreferences[type].filter(item => item !== value);
      }
      
      await api.put(`/groups/${id}/preferences`, { preferences: updatedPreferences });
      setGroup(prev => ({ ...prev, preferences: updatedPreferences }));
    } catch (error) {
      console.error('Fehler beim Löschen der Präferenz:', error);
      setError('Fehler beim Löschen der Präferenz');
    }
  };

  const handleAddPreference = async () => {
    if (!preferenceType) return;

    try {
      const updatedPreferences = { ...group.preferences };
      if (!updatedPreferences[preferenceType]) {
        updatedPreferences[preferenceType] = [];
      }
      
      if (preferenceType === 'budget') {
        // Für Budget-Präferenz
        updatedPreferences.budget = newPreference;
      } else if (!updatedPreferences[preferenceType].includes(newPreference)) {
        // Für andere Präferenztypen
        updatedPreferences[preferenceType] = [...updatedPreferences[preferenceType], newPreference];
      }
      
      await api.put(`/groups/${id}/preferences`, { preferences: updatedPreferences });
      setGroup(prev => ({ ...prev, preferences: updatedPreferences }));
      
      setNewPreference('');
      setPreferenceType('');
      setAddPreferenceOpen(false);
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Präferenz:', error);
      setError('Fehler beim Hinzufügen der Präferenz');
    }
  };

  const handleAddMember = async () => {
    try {
      setAddMemberError('');
      const response = await api.post(`/groups/${id}/members`, {
        email: newMemberEmail
      });
      
      setGroup(prev => ({
        ...prev,
        members: [...prev.members, response.data]
      }));
      
      setNewMemberEmail('');
      setAddMemberError('');
      setAddMemberOpen(false);
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Mitglieds:', error);
      setAddMemberError(
        error.response?.data?.message || 
        'Fehler beim Hinzufügen des Mitglieds. Bitte versuchen Sie es erneut.'
      );
    }
  };

  const handleRemoveMember = async (memberEmail) => {
    try {
      await api.delete(`/groups/${id}/members/${memberEmail}`);
      setGroup(prev => ({
        ...prev,
        members: prev.members.filter(member => member.email !== memberEmail)
      }));
    } catch (error) {
      console.error('Fehler beim Entfernen des Mitglieds:', error);
      setError('Fehler beim Entfernen des Mitglieds');
    }
  };

  if (error && !group) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Erneut versuchen
        </Button>
      </Box>
    );
  }

  if (!group) {
    return <Box sx={{ p: 3 }}><Typography>Gruppe nicht gefunden</Typography></Box>;
  }

  return (
    <>
      <Box className="page-header">
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            {group.name}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            {group.description}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        <Paper sx={{ mb: 4 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Übersicht" />
            <Tab label="Reisevorschläge" />
            <Tab label="Mitglieder" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <>
                <Typography variant="h6" gutterBottom>Gruppendetails</Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2">Reisezeitraum</Typography>
                    <Typography>
                      {new Date(group.travelPeriod.start).toLocaleDateString()} - {new Date(group.travelPeriod.end).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      Präferenzen
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => setAddPreferenceOpen(true)}
                        variant="outlined"
                        size="small"
                      >
                        Präferenz hinzufügen
                      </Button>
                    </Typography>
                    
                    {group.preferences && (
                      <Box sx={{ mt: 2 }}>
                        {group.preferences.budget && (
                          <Chip
                            label={`Budget: ${group.preferences.budget[0]}€ - ${group.preferences.budget[1]}€`}
                            onDelete={() => handleDeletePreference('budget', null)}
                            sx={{ m: 0.5 }}
                          />
                        )}
                        
                        {group.preferences.travelType?.map(type => (
                          <Chip
                            key={type}
                            label={type}
                            onDelete={() => handleDeletePreference('travelType', type)}
                            sx={{ m: 0.5 }}
                          />
                        ))}
                        
                        {group.preferences.activities?.map(activity => (
                          <Chip
                            key={activity}
                            label={activity}
                            onDelete={() => handleDeletePreference('activities', activity)}
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2">Teilnehmer</Typography>
                    <Typography>
                      {group.members.length} von maximal {group.maxParticipants} Teilnehmern
                    </Typography>
                  </Box>
                </Stack>
              </>
            )}

            {activeTab === 1 && (
              <>
                <TravelProposal
                  groupId={id}
                  isAdmin={isAdmin}
                  onProposalAdded={handleProposalAdded}
                />
                <TravelProposalList
                  proposals={group.travelProposals}
                  groupId={id}
                  isAdmin={isAdmin}
                  onVote={handleProposalVote}
                />
              </>
            )}

            {activeTab === 2 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Mitglieder
                  {isAdmin && (
                    <Button
                      startIcon={<PersonAddIcon />}
                      onClick={() => setAddMemberOpen(true)}
                      variant="outlined"
                      size="small"
                    >
                      Mitglied hinzufügen
                    </Button>
                  )}
                </Typography>
                <List>
                  {group.members.map((member) => (
                    <ListItem
                      key={member.email}
                      secondaryAction={
                        <>
                          {isAdmin && (
                            <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                              <Select
                                value={member.role}
                                onChange={(e) => handleMemberRoleChange(member.email, e.target.value)}
                              >
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="member">Mitglied</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                          {isAdmin && member.role !== 'admin' && (
                            <IconButton 
                              edge="end" 
                              aria-label="delete"
                              onClick={() => handleRemoveMember(member.email)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </>
                      }
                    >
                      <ListItemText
                        primary={member.email}
                        secondary={member.role === 'admin' ? 'Administrator' : 'Mitglied'}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Dialog zum Bearbeiten der Präferenzen */}
      <Dialog
        open={editPreferencesOpen}
        onClose={() => setEditPreferencesOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Präferenzen bearbeiten</DialogTitle>
        <DialogContent>
          {/* Hier Präferenzen-Formular einfügen, ähnlich wie in CreateGroup */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPreferencesOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handlePreferencesSubmit}>Speichern</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog zum Hinzufügen neuer Präferenzen */}
      <Dialog open={addPreferenceOpen} onClose={() => setAddPreferenceOpen(false)}>
        <DialogTitle>Neue Präferenz hinzufügen</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Präferenztyp</InputLabel>
            <Select
              value={preferenceType}
              onChange={(e) => setPreferenceType(e.target.value)}
              label="Präferenztyp"
            >
              <MenuItem value="travelType">Reiseart</MenuItem>
              <MenuItem value="activities">Aktivitäten</MenuItem>
            </Select>
          </FormControl>

          {preferenceType === 'travelType' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Reiseart</InputLabel>
              <Select
                value={newPreference}
                onChange={(e) => setNewPreference(e.target.value)}
                label="Reiseart"
              >
                {travelTypes.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {preferenceType === 'activities' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Aktivität</InputLabel>
              <Select
                value={newPreference}
                onChange={(e) => setNewPreference(e.target.value)}
                label="Aktivität"
              >
                {activities.map((activity) => (
                  <MenuItem key={activity} value={activity}>{activity}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPreferenceOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleAddPreference} 
            variant="contained"
            disabled={!preferenceType || !newPreference}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog zum Hinzufügen neuer Mitglieder */}
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
            disabled={!newMemberEmail || !!addMemberError}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GroupDetail;