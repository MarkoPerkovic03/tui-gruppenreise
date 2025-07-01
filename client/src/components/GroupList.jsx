import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Card, 
  Button, 
  Typography, 
  Box, 
  Grid, 
  Paper,
  Chip,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightIcon from '@mui/icons-material/Flight';
import BookingIcon from '@mui/icons-material/BookOnline';
import { useNavigate } from 'react-router-dom';

const GroupList = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('🔍 Lade Gruppen...');
        const response = await api.get('/groups');
        console.log('📡 API Response:', response.data);
        
        // Debug: Prüfe jede Gruppe
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach((group, index) => {
            console.log(`Gruppe ${index}:`, {
              _id: group._id,
              id: group.id,
              name: group.name,
              hasValidId: !!(group._id || group.id),
              fullObject: group
            });
            
            // Warnung bei ungültigen IDs
            if (!group._id && !group.id) {
              console.error(`❌ FEHLER: Gruppe ${index} hat keine gültige ID!`, group);
            }
          });
        }
        
        setGroups(response.data || []);
      } catch (error) {
        console.error('❌ Fehler beim Laden der Gruppen:', error);
        setError('Fehler beim Laden der Gruppen. Bitte versuchen Sie es erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, []);

  const handleCreateGroup = () => {
    navigate('/groups/create');
  };

  const handleGroupClick = (group) => {
    // KORRIGIERT: Sichere ID-Extraktion und Navigation
    const groupId = group._id || group.id;
    
    console.log('🎯 Navigiere zu Gruppe:', {
      group,
      extractedId: groupId,
      idExists: !!groupId
    });
    
    if (!groupId) {
      console.error('❌ Gruppe hat keine gültige ID:', group);
      setError('Diese Gruppe hat keine gültige ID und kann nicht geöffnet werden.');
      return;
    }
    
    // KORRIGIERT: Verwende /groups/:id Route
     navigate(`/groups/${groupId}`);
};

  const nextGroup = React.useMemo(() => {
    const upcoming = groups
      .filter(g => ['decided', 'booking', 'booked'].includes(g.status) && g.winningProposal?.departureDate)
      .sort((a, b) => new Date(a.winningProposal.departureDate) - new Date(b.winningProposal.departureDate));
    return upcoming[0];
  }, [groups]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, textAlign: 'center' }}>
        <Typography>Lade Gruppen...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box className="page-header">
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Meine Reisegruppen
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.8)' }}>
            Planen Sie Ihre Gruppenreisen und stimmen Sie über Reiseziele ab
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateGroup}
            sx={{
              backgroundColor: 'white',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }
            }}
          >
            Neue Gruppe erstellen
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
         {nextGroup && (
          <Card sx={{ mb: 3, backgroundColor: 'rgba(0,87,184,0.05)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Nächste Reise
                </Typography>
                <Typography variant="h6">
                  {nextGroup.winningProposal?.destination?.name || nextGroup.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(nextGroup.winningProposal.departureDate).toLocaleDateString('de-DE')} · {nextGroup.status === 'booked' ? 'gebucht' : 'Bezahlung offen'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<BookingIcon />}
                onClick={() => navigate(`/groups/${nextGroup._id || nextGroup.id}/booking`)}
              >
                Zur Buchung
              </Button>
            </Box>
          </Card>
        )}

        <Grid container spacing={3}>
          {groups.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                <GroupIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Noch keine Reisegruppen vorhanden
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Erstellen Sie Ihre erste Reisegruppe und laden Sie Freunde ein!
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateGroup}
                >
                  Erste Gruppe erstellen
                </Button>
              </Paper>
            </Grid>
          ) : (
            groups.map((group, index) => {
              // SICHERHEITSCHECK: Überspringen falls keine gültige ID
              const groupId = group._id || group.id;
              
              if (!groupId) {
                console.error(`⚠️ Überspringe Gruppe ${index} ohne ID:`, group);
                return (
                  <Grid item xs={12} sm={6} md={4} key={`invalid-${index}`}>
                    <Card 
                      sx={{ 
                        p: 2,
                        border: '2px solid red',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)'
                      }}
                    >
                      <Typography color="error" variant="h6">
                        ⚠️ Fehlerhafte Gruppe
                      </Typography>
                      <Typography variant="body2">
                        Diese Gruppe hat keine gültige ID: {group.name || 'Unbekannt'}
                      </Typography>
                    </Card>
                  </Grid>
                );
              }

              return (
                <Grid item xs={12} sm={6} md={4} key={groupId}>
                  <Card 
                    sx={{ 
                      p: 0,
                      cursor: 'pointer',
                      '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Box sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                        {group.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <GroupIcon sx={{ fontSize: 20, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {group.members?.length || 0} {(group.members?.length || 0) === 1 ? 'Mitglied' : 'Mitglieder'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CalendarTodayIcon sx={{ fontSize: 20, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {group.createdAt ? 
                            `Erstellt am ${new Date(group.createdAt).toLocaleDateString()}` :
                            'Erstellungsdatum unbekannt'
                          }
                        </Typography>
                      </Box>

                      {group.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {group.description}
                        </Typography>
                      )}

                      {/* Status Chip */}
                      {group.status && (
                        <Chip 
                          label={group.status}
                          color={group.status === 'planning' ? 'warning' : 'success'}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      )}

                      {/* Upcoming trip info */}
                      {group.winningProposal && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Nächste Reise: {group.winningProposal.destination?.name || 'Unbekannt'}
                          {group.winningProposal.departureDate &&
                            ` ab ${new Date(group.winningProposal.departureDate).toLocaleDateString('de-DE')}`}
                        </Typography>
                      )}
                    </Box>
                    
                    <Divider />
                    
                    <Box sx={{ p: 2, backgroundColor: 'rgba(0, 87, 184, 0.02)' }}>
                      <Button
                        fullWidth
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('🔗 Button Click - Gruppe:', group.name, 'ID:', groupId);
                          handleGroupClick(group);
                        }}
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          justifyContent: 'space-between',
                          color: 'primary.main'
                        }}
                      >
                        Gruppe öffnen
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      </Box>
    </>
  );
};

export default GroupList;