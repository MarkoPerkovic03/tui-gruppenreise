import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
  Alert,
  LinearProgress,
  Badge,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightIcon from '@mui/icons-material/Flight';
import BookingIcon from '@mui/icons-material/BookOnline';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EuroIcon from '@mui/icons-material/Euro';
import PeopleIcon from '@mui/icons-material/People';
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

  // ERWEITERT: Bessere Logik für nächste Reisen
  const upcomingTrips = React.useMemo(() => {
    return groups
      .filter(g => ['decided', 'booking', 'booked'].includes(g.status) && g.winningProposal?.departureDate)
      .sort((a, b) => new Date(a.winningProposal.departureDate) - new Date(b.winningProposal.departureDate));
  }, [groups]);

  const nextTrip = upcomingTrips[0];

  // ERWEITERT: Statistiken für Dashboard
  const stats = React.useMemo(() => {
    const activeBookings = groups.filter(g => ['decided', 'booking'].includes(g.status)).length;
    const completedTrips = groups.filter(g => g.status === 'booked').length;
    const totalGroups = groups.length;
    
    return { activeBookings, completedTrips, totalGroups };
  }, [groups]);

  // Hilfsfunktion für Zeitberechnung
  const getDaysUntilDeparture = (departureDate) => {
    const today = new Date();
    const departure = new Date(departureDate);
    const diffTime = departure - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Hilfsfunktion für Status-Darstellung
  const getBookingStatusInfo = (group) => {
    switch (group.status) {
      case 'decided':
        return {
          label: 'Bezahlung offen',
          color: 'warning',
          icon: <PaymentIcon />,
          actionLabel: 'Jetzt buchen!'
        };
      case 'booking':
        return {
          label: 'Buchung läuft',
          color: 'info',
          icon: <ScheduleIcon />,
          actionLabel: 'Zur Buchung'
        };
      case 'booked':
        return {
          label: 'Gebucht',
          color: 'success',
          icon: <CheckCircleIcon />,
          actionLabel: 'Buchung ansehen'
        };
      default:
        return {
          label: 'Planung',
          color: 'default',
          icon: <GroupIcon />,
          actionLabel: 'Öffnen'
        };
    }
  };

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
          
          {/* ERWEITERT: Statistiken im Header */}
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ color: 'white', textAlign: 'center' }}>
              <Typography variant="h6">{stats.totalGroups}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Gruppen gesamt</Typography>
            </Box>
            <Box sx={{ color: 'white', textAlign: 'center' }}>
              <Typography variant="h6">{stats.activeBookings}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Aktive Buchungen</Typography>
            </Box>
            <Box sx={{ color: 'white', textAlign: 'center' }}>
              <Typography variant="h6">{stats.completedTrips}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Gebuchte Reisen</Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateGroup}
            size="large"
            sx={{
              backgroundColor: 'white',
              color: 'primary.main',
              py: 1.5,
              px: 3,
              fontSize: '1.1rem',
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

        {/* ERWEITERT: Nächste Reise Sektion mit mehr Details */}
        {nextTrip && (
          <Card sx={{ 
            mb: 4, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              position: 'absolute', 
              top: -50, 
              right: -50, 
              width: 100, 
              height: 100, 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '50%' 
            }} />
            <Box sx={{ p: 3, position: 'relative', zIndex: 1 }}>
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold' }}>
                🚀 Nächste Reise
              </Typography>
              
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {nextTrip.winningProposal?.destination?.name || nextTrip.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarTodayIcon fontSize="small" />
                      <Typography variant="body1">
                        {new Date(nextTrip.winningProposal.departureDate).toLocaleDateString('de-DE')}
                      </Typography>
                    </Box>
                    
                    {nextTrip.winningProposal.returnDate && (
                      <Typography variant="body1">
                        bis {new Date(nextTrip.winningProposal.returnDate).toLocaleDateString('de-DE')}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleIcon fontSize="small" />
                      <Typography variant="body1">
                        {nextTrip.members?.length || 0} Teilnehmer
                      </Typography>
                    </Box>
                    
                    {nextTrip.winningProposal.pricePerPerson && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EuroIcon fontSize="small" />
                        <Typography variant="body1">
                          {nextTrip.winningProposal.pricePerPerson}€ p.P.
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Countdown */}
                  {(() => {
                    const daysUntil = getDaysUntilDeparture(nextTrip.winningProposal.departureDate);
                    if (daysUntil > 0) {
                      return (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" sx={{ opacity: 0.9 }}>
                            {daysUntil === 1 ? 'Morgen geht es los!' : 
                             daysUntil <= 7 ? `Noch ${daysUntil} Tage!` :
                             `Noch ${daysUntil} Tage`}
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  })()}

                  {/* Status Badge */}
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
                            backgroundColor: nextTrip.status === 'decided' ? '#FF6B35' : 
                                           nextTrip.status === 'booking' ? '#2196F3' : '#4CAF50',
                            background: nextTrip.status === 'decided' ? 
                              'linear-gradient(45deg, #FF6B35, #F7931E)' : undefined,
                            boxShadow: nextTrip.status === 'decided' ? 
                              '0 4px 12px rgba(255, 107, 53, 0.4)' : undefined,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            py: 1.5,
                            px: 3,
                            width: { xs: '100%', md: 'auto' },
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
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
            </Box>
          </Card>
        )}

        {/* ERWEITERT: Weitere kommende Reisen */}
        {upcomingTrips.length > 1 && (
          <Card sx={{ mb: 3, backgroundColor: 'rgba(0,87,184,0.02)' }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Weitere kommende Reisen ({upcomingTrips.length - 1})
              </Typography>
              <Grid container spacing={2}>
                {upcomingTrips.slice(1, 4).map((trip) => {
                  const statusInfo = getBookingStatusInfo(trip);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={trip._id || trip.id}>
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          {trip.winningProposal?.destination?.name || trip.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {new Date(trip.winningProposal.departureDate).toLocaleDateString('de-DE')}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Chip 
                            label={statusInfo.label} 
                            color={statusInfo.color} 
                            size="small"
                            icon={statusInfo.icon}
                          />
                          <Button
                            size="small"
                            startIcon={<BookingIcon />}
                            onClick={() => navigate(`/groups/${trip._id || trip.id}/booking`)}
                          >
                            Buchung
                          </Button>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
              {upcomingTrips.length > 4 && (
                <Button sx={{ mt: 2 }} onClick={() => {/* Zeige alle */}}>
                  Alle {upcomingTrips.length - 1} kommenden Reisen anzeigen
                </Button>
              )}
            </Box>
          </Card>
        )}

        {/* Gruppen Grid */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Alle Gruppen
        </Typography>

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

              const statusInfo = getBookingStatusInfo(group);
              const hasBookingAccess = ['decided', 'booking', 'booked'].includes(group.status);

              return (
                <Grid item xs={12} sm={6} md={4} key={groupId}>
                  <Card 
                    sx={{ 
                      p: 0,
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: hasBookingAccess ? '2px solid' : '1px solid',
                      borderColor: hasBookingAccess ? 
                        (group.status === 'decided' ? '#FF6B35' : 
                         group.status === 'booking' ? '#2196F3' : '#4CAF50') : 
                        'divider',
                      '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Box sx={{ p: 2, flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: 'primary.main', flexGrow: 1 }}>
                          {group.name}
                        </Typography>
                        {hasBookingAccess && (
                          <Tooltip title="Buchung verfügbar">
                            <Badge color="error" variant="dot">
                              <BookingIcon color="action" />
                            </Badge>
                          </Tooltip>
                        )}
                      </Box>
                      
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
                      <Chip 
                        icon={statusInfo.icon}
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        sx={{ mb: 1 }}
                      />

                      {/* Upcoming trip info */}
                      {group.winningProposal && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          <strong>Nächste Reise:</strong> {group.winningProposal.destination?.name || 'Unbekannt'}
                          {group.winningProposal.departureDate &&
                            ` ab ${new Date(group.winningProposal.departureDate).toLocaleDateString('de-DE')}`}
                        </Typography>
                      )}
                    </Box>
                    
                    <Divider />
                    
                    <Box sx={{ p: 2, backgroundColor: 'rgba(0, 87, 184, 0.02)' }}>
                      {hasBookingAccess ? (
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Button
                              fullWidth
                              onClick={(e) => {
                                e.preventDefault();
                                handleGroupClick(group);
                              }}
                              endIcon={<ArrowForwardIcon />}
                              sx={{ color: 'text.secondary' }}
                            >
                              Details
                            </Button>
                          </Grid>
                          <Grid item xs={6}>
                            <Button
                              fullWidth
                              variant="contained"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/groups/${groupId}/booking`);
                              }}
                              startIcon={<BookingIcon />}
                              sx={{
                                backgroundColor: group.status === 'decided' ? '#FF6B35' : 
                                               group.status === 'booking' ? '#2196F3' : '#4CAF50',
                                fontSize: '0.875rem',
                                '&:hover': {
                                  backgroundColor: group.status === 'decided' ? '#E55A2B' : 
                                                 group.status === 'booking' ? '#1976D2' : '#45A049'
                                }
                              }}
                            >
                              Buchung
                            </Button>
                          </Grid>
                        </Grid>
                      ) : (
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
                      )}
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
