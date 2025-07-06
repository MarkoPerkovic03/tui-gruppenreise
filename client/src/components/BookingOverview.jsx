// client/src/components/BookingOverview.jsx - ERWEITERT mit PaymentManager Integration
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  FlightTakeoff as FlightIcon,
  Euro as EuroIcon,
  Group as GroupIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as StatsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import SimplePaymentManager from './SimplePaymentManager'; // Import der vereinfachten Zahlungskomponente

const BookingOverview = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [bookingSession, setBookingSession] = useState(null);
  const [userPaymentStatus, setUserPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog States
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  
  // Form States
  const [finalizeData, setFinalizeData] = useState({
    confirmationData: '',
    notes: ''
  });

  useEffect(() => {
    loadBookingSession();
  }, [groupId]);

  const loadBookingSession = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/bookings/group/${groupId}`);
      setBookingSession(response.data.bookingSession);
      setUserPaymentStatus(response.data.userPaymentStatus);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Buchung:', error);
      
      if (error.response?.status === 404) {
        setError('Noch keine Buchung für diese Gruppe gestartet.');
      } else {
        setError(error.response?.data?.message || 'Fehler beim Laden der Buchungsdaten');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeBooking = async () => {
    try {
      setActionLoading('initializing');
      
      const response = await api.post(`/bookings/initialize/${groupId}`);
      setBookingSession(response.data.bookingSession);
      
      // Reload to get user payment status
      await loadBookingSession();
      
    } catch (error) {
      console.error('❌ Fehler beim Initialisieren der Buchung:', error);
      setError(error.response?.data?.message || 'Fehler beim Starten der Buchung');
    } finally {
      setActionLoading('');
    }
  };

  const handleFinalizeBooking = async () => {
    try {
      setActionLoading('finalizing');
      
      await api.post(`/bookings/${bookingSession._id}/finalize`, finalizeData);
      
      await loadBookingSession();
      setFinalizeDialog(false);
      setFinalizeData({ confirmationData: '', notes: '' });
      
    } catch (error) {
      console.error('❌ Fehler beim Finalisieren:', error);
      setError(error.response?.data?.message || 'Fehler beim Abschließen der Buchung');
    } finally {
      setActionLoading('');
    }
  };

  const handleSendReminders = async () => {
    try {
      setActionLoading('sending');
      
      await api.post(`/bookings/${bookingSession._id}/send-reminders`);
      alert('Erinnerungen wurden versendet!');
      
    } catch (error) {
      console.error('❌ Fehler beim Senden der Erinnerungen:', error);
      setError(error.response?.data?.message || 'Fehler beim Senden der Erinnerungen');
    } finally {
      setActionLoading('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'initialized': return 'info';
      case 'collecting_payments': return 'warning';
      case 'ready_to_book': return 'success';
      case 'booking_in_progress': return 'primary';
      case 'booked': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'initialized': return 'Initialisiert';
      case 'collecting_payments': return 'Zahlungssammlung';
      case 'ready_to_book': return 'Bereit zur Buchung';
      case 'booking_in_progress': return 'Buchung läuft';
      case 'booked': return 'Gebucht';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  // Check if user is admin
  const isAdmin = bookingSession?.group?.members?.some(member => 
    member.user === user?.id && member.role === 'admin'
  );

  const canInitializeBooking = !bookingSession && isAdmin;
  const canFinalize = isAdmin && bookingSession?.isReadyToBook && bookingSession?.status === 'ready_to_book';

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>Lade Buchungsdaten...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box className="page-header">
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/groups/${groupId}`)}
            sx={{ mb: 2, color: 'white' }}
          >
            Zurück zur Gruppe
          </Button>
          <Typography variant="h4" sx={{ mb: 2, color: 'white' }}>
            Buchungsübersicht
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Verwalten Sie die Buchung und Zahlungen Ihrer Gruppenreise
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* No Booking Session - Initialization */}
        {!bookingSession && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <FlightIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Buchung noch nicht gestartet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Die Buchungsphase für diese Gruppe wurde noch nicht eingeleitet.
            </Typography>
            
            {canInitializeBooking && (
              <Button
                variant="contained"
                size="large"
                startIcon={<FlightIcon />}
                onClick={handleInitializeBooking}
                disabled={actionLoading === 'initializing'}
              >
                {actionLoading === 'initializing' ? 'Starte Buchung...' : 'Buchung starten'}
              </Button>
            )}
            
            {!isAdmin && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Nur Gruppen-Administratoren können die Buchung starten.
              </Typography>
            )}
          </Paper>
        )}

        {/* Booking Session Exists */}
        {bookingSession && (
          <Box>
            {/* Status Overview */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    Buchungsstatus
                  </Typography>
                  <Chip 
                    label={getStatusLabel(bookingSession.status)} 
                    color={getStatusColor(bookingSession.status)}
                    size="large"
                  />
                </Box>
                
                <Box display="flex" gap={2}>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={loadBookingSession}
                    disabled={loading}
                  >
                    Aktualisieren
                  </Button>
                  
                  {isAdmin && canFinalize && (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<FlightIcon />}
                      onClick={() => setFinalizeDialog(true)}
                      disabled={actionLoading === 'finalizing'}
                    >
                      {actionLoading === 'finalizing' ? 'Finalisiere...' : 'Buchung abschließen'}
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Quick Stats */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <EuroIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h6">
                        €{bookingSession.finalDetails?.pricePerPerson || 0}
                      </Typography>
                      <Typography variant="caption">pro Person</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <GroupIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">
                        {bookingSession.finalDetails?.totalParticipants || 0}
                      </Typography>
                      <Typography variant="caption">Teilnehmer</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <CheckIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h6">
                        {bookingSession.paidParticipants || 0}
                      </Typography>
                      <Typography variant="caption">Bezahlt</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <StatsIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography variant="h6">
                        {bookingSession.paymentProgress || 0}%
                      </Typography>
                      <Typography variant="caption">Fortschritt</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Progress Bar */}
              <Box sx={{ mt: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">Zahlungsfortschritt</Typography>
                  <Typography variant="body2">
                    {bookingSession.paidParticipants || 0}/{bookingSession.finalDetails?.totalParticipants || 0} Teilnehmer
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={bookingSession.paymentProgress || 0}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </Paper>

            {/* Tabs für verschiedene Bereiche */}
            <Paper sx={{ mb: 3 }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab icon={<PaymentIcon />} label="Zahlungen" />
                <Tab icon={<FlightIcon />} label="Reisedetails" />
                {isAdmin && <Tab icon={<SettingsIcon />} label="Verwaltung" />}
              </Tabs>

              <Box sx={{ p: 3 }}>
                {/* Zahlungs-Tab */}
               {activeTab === 0 && (
                  <SimplePaymentManager
                    bookingSession={bookingSession}
                    isAdmin={isAdmin}
                    onUpdate={loadBookingSession}
                  />
                )}

                {/* Reisedetails-Tab */}
                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Reisedetails
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Reiseziel
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                              {bookingSession.finalDetails?.destination || 'Nicht angegeben'}
                            </Typography>
                            {bookingSession.finalDetails?.hotelName && (
                              <Typography variant="body2" color="text.secondary">
                                Hotel: {bookingSession.finalDetails.hotelName}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Reisezeitraum
                            </Typography>
                            <Typography variant="body1">
                              {bookingSession.finalDetails?.departureDate && bookingSession.finalDetails?.returnDate ? (
                                <>
                                  <strong>Abreise:</strong> {new Date(bookingSession.finalDetails.departureDate).toLocaleDateString('de-DE')}<br />
                                  <strong>Rückkehr:</strong> {new Date(bookingSession.finalDetails.returnDate).toLocaleDateString('de-DE')}
                                </>
                              ) : (
                                'Noch nicht festgelegt'
                              )}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <EuroIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Kosten
                            </Typography>
                            <Typography variant="body1">
                              <strong>Pro Person:</strong> €{bookingSession.finalDetails?.pricePerPerson || 0}<br />
                              <strong>Gesamtkosten:</strong> €{bookingSession.finalDetails?.totalPrice || 0}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Teilnehmer
                            </Typography>
                            <Typography variant="body1">
                              <strong>Teilnehmer:</strong> {bookingSession.finalDetails?.totalParticipants || 0}<br />
                              <strong>Bezahlt:</strong> {bookingSession.paidParticipants || 0}<br />
                              <strong>Ausstehend:</strong> {(bookingSession.finalDetails?.totalParticipants || 0) - (bookingSession.paidParticipants || 0)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Zahlungsfrist Information */}
                    {bookingSession.paymentSettings?.paymentDeadline && (
                      <Alert 
                        severity={bookingSession.isPaymentOverdue ? 'error' : 'info'} 
                        sx={{ mt: 3 }}
                        icon={bookingSession.isPaymentOverdue ? <WarningIcon /> : <ScheduleIcon />}
                      >
                        <Typography variant="body2">
                          <strong>Zahlungsfrist:</strong> {new Date(bookingSession.paymentSettings.paymentDeadline).toLocaleDateString('de-DE')}
                          {bookingSession.daysUntilPaymentDeadline !== null && (
                            bookingSession.daysUntilPaymentDeadline > 0 ? 
                              ` (noch ${bookingSession.daysUntilPaymentDeadline} Tage)` :
                              ` (${Math.abs(bookingSession.daysUntilPaymentDeadline)} Tage überfällig)`
                          )}
                        </Typography>
                      </Alert>
                    )}

                    {/* Buchungsbestätigung falls vorhanden */}
                    {bookingSession.finalBooking && (
                      <Card sx={{ mt: 3 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="success.main">
                            <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Buchung bestätigt
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            <strong>Buchungsreferenz:</strong> {bookingSession.finalBooking.bookingReference}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Gebucht am: {new Date(bookingSession.finalBooking.bookedAt).toLocaleDateString('de-DE')}
                          </Typography>
                          {bookingSession.finalBooking.bookingConfirmation && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {bookingSession.finalBooking.bookingConfirmation}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                )}

                {/* Admin-Verwaltungs-Tab */}
                {activeTab === 2 && isAdmin && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Administrator-Funktionen
                    </Typography>
                    
                    <Grid container spacing={3}>
                      {/* Buchungsstatus Management */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Buchungsstatus
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Aktueller Status: <strong>{getStatusLabel(bookingSession.status)}</strong>
                            </Typography>
                            
                            <Stack spacing={2} sx={{ mt: 2 }}>
                              {bookingSession.status === 'collecting_payments' && (
                                <Button
                                  startIcon={<SendIcon />}
                                  onClick={handleSendReminders}
                                  disabled={actionLoading === 'sending'}
                                  variant="outlined"
                                  fullWidth
                                >
                                  {actionLoading === 'sending' ? 'Sende...' : 'Zahlungserinnerungen senden'}
                                </Button>
                              )}
                              
                              {canFinalize && (
                                <Button
                                  variant="contained"
                                  startIcon={<FlightIcon />}
                                  onClick={() => setFinalizeDialog(true)}
                                  disabled={actionLoading === 'finalizing'}
                                  fullWidth
                                >
                                  {actionLoading === 'finalizing' ? 'Finalisiere...' : 'Buchung abschließen'}
                                </Button>
                              )}
                              
                              {bookingSession.status === 'booked' && (
                                <Button
                                  variant="outlined"
                                  startIcon={<DownloadIcon />}
                                  onClick={() => {
                                    // Download booking confirmation
                                    alert('Buchungsbestätigung wird heruntergeladen...');
                                  }}
                                  fullWidth
                                >
                                  Buchungsbestätigung herunterladen
                                </Button>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Zahlungsstatistiken */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Zahlungsstatistiken
                            </Typography>
                            
                            <Box sx={{ mt: 2 }}>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2">Eingegangen:</Typography>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  €{bookingSession.totalCollected || 0}
                                </Typography>
                              </Box>
                              
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2">Ausstehend:</Typography>
                                <Typography variant="body2" fontWeight="bold" color="warning.main">
                                  €{(bookingSession.finalDetails?.totalPrice || 0) - (bookingSession.totalCollected || 0)}
                                </Typography>
                              </Box>
                              
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2">Teilnehmer bezahlt:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {bookingSession.paidParticipants || 0}/{bookingSession.finalDetails?.totalParticipants || 0}
                                </Typography>
                              </Box>
                              
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2">Erfolgsrate:</Typography>
                                <Typography variant="body2" fontWeight="bold" color="info.main">
                                  {bookingSession.paymentProgress || 0}%
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Automatisierung */}
                      <Grid item xs={12}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Erweiterte Funktionen</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  onClick={() => {
                                    // Export payment data
                                    alert('Zahlungsdaten werden exportiert...');
                                  }}
                                >
                                  Zahlungsdaten exportieren
                                </Button>
                              </Grid>
                              
                              <Grid item xs={12} sm={6}>
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  onClick={() => {
                                    // Generate invoice
                                    alert('Rechnung wird erstellt...');
                                  }}
                                >
                                  Rechnung erstellen
                                </Button>
                              </Grid>
                              
                              <Grid item xs={12} sm={6}>
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  onClick={() => {
                                    // Send booking confirmation
                                    alert('Buchungsbestätigungen werden versendet...');
                                  }}
                                >
                                  Bestätigungen versenden
                                </Button>
                              </Grid>
                              
                              <Grid item xs={12} sm={6}>
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  color="error"
                                  onClick={() => {
                                    if (window.confirm('Sind Sie sicher, dass Sie die Buchung stornieren möchten?')) {
                                      alert('Stornierung wird verarbeitet...');
                                    }
                                  }}
                                >
                                  Buchung stornieren
                                </Button>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Finalize Booking Dialog */}
        <Dialog open={finalizeDialog} onClose={() => setFinalizeDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Buchung abschließen</DialogTitle>
          <DialogContent>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body1">
                🎉 Alle Zahlungen sind eingegangen! Sie können die Buchung jetzt abschließen.
              </Typography>
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              Buchungsübersicht
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Reiseziel:</Typography>
                <Typography variant="body1">{bookingSession?.finalDetails?.destination}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Hotel:</Typography>
                <Typography variant="body1">{bookingSession?.finalDetails?.hotelName || 'Nicht angegeben'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Teilnehmer:</Typography>
                <Typography variant="body1">{bookingSession?.finalDetails?.totalParticipants}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Gesamtpreis:</Typography>
                <Typography variant="body1">€{bookingSession?.finalDetails?.totalPrice}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Reisezeitraum:</Typography>
                <Typography variant="body1">
                  {bookingSession?.finalDetails?.departureDate && bookingSession?.finalDetails?.returnDate
                    ? `${new Date(bookingSession.finalDetails.departureDate).toLocaleDateString('de-DE')} - ${new Date(bookingSession.finalDetails.returnDate).toLocaleDateString('de-DE')}`
                    : 'Nicht angegeben'
                  }
                </Typography>
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              label="Buchungsbestätigung / Referenz"
              multiline
              rows={3}
              value={finalizeData.confirmationData}
              onChange={(e) => setFinalizeData({...finalizeData, confirmationData: e.target.value})}
              placeholder="Geben Sie hier die Buchungsbestätigung oder Referenznummer ein..."
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Zusätzliche Notizen (optional)"
              multiline
              rows={2}
              value={finalizeData.notes}
              onChange={(e) => setFinalizeData({...finalizeData, notes: e.target.value})}
              placeholder="Weitere Informationen zur Buchung..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFinalizeDialog(false)}>Abbrechen</Button>
            <Button 
              onClick={handleFinalizeBooking} 
              variant="contained"
              disabled={actionLoading === 'finalizing'}
              startIcon={<FlightIcon />}
            >
              {actionLoading === 'finalizing' ? 'Buchung wird abgeschlossen...' : 'Buchung abschließen'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default BookingOverview;
