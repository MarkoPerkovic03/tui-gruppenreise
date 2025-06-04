import React, { useState, useEffect } from 'react';
import api from '../utils/api'; // KORRIGIERT: Verwende die konfigurierte API
import { 
  Card, 
  Button, 
  Typography, 
  Box, 
  Grid, 
  Paper,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

const GroupList = () => {
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // KORRIGIERT: Verwende api statt axios und /groups statt /api/groups
        const response = await api.get('/groups');
        setGroups(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Gruppen:', error);
      }
    };
    fetchGroups();
  }, []);

  const handleCreateGroup = () => {
    navigate('/groups/create');
  };

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
            groups.map((group) => (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
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
                        {group.members.length} {group.members.length === 1 ? 'Mitglied' : 'Mitglieder'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarTodayIcon sx={{ fontSize: 20, color: 'text.secondary', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Erstellt am {new Date(group.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider />
                  
                  <Box sx={{ p: 2, backgroundColor: 'rgba(0, 87, 184, 0.02)' }}>
                    <Button
                      fullWidth
                      onClick={() => navigate(`/group/${group.id}`)}
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
            ))
          )}
        </Grid>
      </Box>
    </>
  );
};

export default GroupList;