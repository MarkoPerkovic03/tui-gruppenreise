// client/src/components/BookingOverview.jsx
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  FlightTakeoff as FlightIcon,
  Hotel as HotelIcon,
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
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';

const BookingOverview = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [bookingSession, setBookingSession] = useState(null);
  const [userPaymentStatus, setUserPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  
  // Dialogs
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  
  // Form states
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'bank_transfer',
    notes: ''
  });
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

  const handleReserveSpot = async () => {
    try {
      setActionLoading('reserving');
      
      await api.post(`/bookings/${bookingSession._id}/reserve`, {
        notes: 'Platz via Web-Interface reserviert'
      });
      
      await loadBookingSession();
      
    } catch (error) {
      console.error('❌ Fehler beim Reservieren:', error);
      setError(error.response?.data?.message || 'Fehler beim Reservieren des Platzes');
    } finally {
      setActionLoading('');
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      setActionLoading('paying');
      
      await api.post(`/bookings/${bookingSession._id}/pay`, paymentData);
      
      await loadBookingSession();
      setPaymentDialog(false);
      setPaymentData({ paymentMethod: 'bank_transfer', notes: '' });
      
    } catch (error) {
      console.error('❌ Fehler beim Markieren der Zahlung:', error);
      setError(error.response?.data?.message || 'Fehler beim Verarbeiten der Zahlung');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancelParticipation = async () => {
    try {
      setActionLoading('cancelling');
      
      await api.post(`/bookings/${bookingSession._id}/cancel-participation`);
      
      await loadBookingSession();
      setCancelDialog(false);
      
    } catch (error) {
      console.error('❌ Fehler beim Stornieren:', error);
      setError(error.response?.data?.message || 'Fehler beim Stornieren der Teilnahme');
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

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'reserved': return 'info';
      case 'paid': return 'success';
      case 'refunded': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'reserved': return 'Reserviert';
      case 'paid': return 'Bezahlt';
      case 'refunded': return 'Erstattet';
      default: return status;
    }
  };

  const isAdmin = bookingSession?.group?.members?.some(member => 
    member.user === user?.id && member.role === 'admin'
  );

  const canInitializeBooking = !bookingSession && isAdmin;
  const canReserve = userPaymentStatus?.status === 'pending';
  const canPay = userPaymentStatus?.status === 'pending' || userPaymentStatus?.status === 'reserved';
  const canCancel = userPaymentStatus && bookingSession?.status !== 'booked';
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
            Verwalten Sie die Buchung Ihrer Gruppenreise
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
          <Grid container spacing={3}>
            {/* Status Overview */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
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
                    
                    {isAdmin && bookingSession.status === 'collecting_payments' && (
                      <Button
                        startIcon={<SendIcon />}
                        onClick={handleSendReminders}
                        disabled={actionLoading === 'sending'}
                        variant="outlined"
                      >
                        Erinnerungen senden
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2">
                      Zahlungsfortschritt
                    </Typography>
                    <Typography variant="body2">
                      {bookingSession.paidParticipants}/{bookingSession.finalDetails.totalParticipants} Teilnehmer
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={bookingSession.paymentProgress || 0}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {bookingSession.paymentProgress || 0}% der Zahlungen eingegangen
                  </Typography>
                </Box>

                {/* Key Info Cards */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <EuroIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                        <Typography variant="h6">
                          €{bookingSession.finalDetails.pricePerPerson}
                        </Typography>
                        <Typography variant="caption">
                          pro Person
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <GroupIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h6">
                          {bookingSession.finalDetails.totalParticipants}
                        </Typography>
                        <Typography variant="caption">
                          Teilnehmer
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <CalendarIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                        <Typography variant="h6">
                          {Math.ceil((new Date(bookingSession.paymentDeadline) - new Date()) / (1000 * 60 * 60 * 24))}
                        </Typography>
                        <Typography variant="caption">
                          Tage bis Deadline
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <FlightIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                        <Typography variant="h6">
                          {Math.ceil((new Date(bookingSession.finalDetails.departureDate) - new Date()) / (1000 * 60 * 60 * 24))}
                        </Typography>
                        <Typography variant="caption">
                          Tage bis Abreise
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Travel Details */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Reisedetails
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Reiseziel"
                      secondary={`${bookingSession.finalDetails.destination}${bookingSession.finalDetails.hotelName ? ` - ${bookingSession.finalDetails.hotelName}` : ''}`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Reisezeitraum"
                      secondary={`${new Date(bookingSession.finalDetails.departureDate).toLocaleDateString('de-DE')} - ${new Date(bookingSession.finalDetails.returnDate).toLocaleDateString('de-DE')}`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <EuroIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Gesamtkosten"
                      secondary={`€${bookingSession.finalDetails.totalPrice} (€${bookingSession.finalDetails.pricePerPerson} × ${bookingSession.finalDetails.totalParticipants})`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Zahlungsfrist"
                      secondary={new Date(bookingSession.paymentDeadline).toLocaleDateString('de-DE')}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            {/* User Payment Status */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Ihr Zahlungsstatus
                </Typography>
                
                {userPaymentStatus ? (
                  <Box>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Chip 
                        label={getPaymentStatusLabel(userPaymentStatus.status)}
                        color={getPaymentStatusColor(userPaymentStatus.status)}
                        icon={userPaymentStatus.status === 'paid' ? <CheckIcon /> : <ScheduleIcon />}
                      />
                      <Typography variant="h6">
                        €{userPaymentStatus.amount}
                      </Typography>
                    </Box>
                    
                    {userPaymentStatus.paidAt && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Bezahlt am: {new Date(userPaymentStatus.paidAt).toLocaleDateString('de-DE')}
                      </Typography>
                    )}
                    
                    {userPaymentStatus.paymentMethod && userPaymentStatus.status === 'paid' && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Zahlungsart: {userPaymentStatus.paymentMethod}
                      </Typography>
                    )}
                    
                    {userPaymentStatus.notes && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Notiz: {userPaymentStatus.notes}
                      </Typography>
                    )}

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                      {canReserve && (
                        <Button
                          variant="outlined"
                          startIcon={<CheckIcon />}
                          onClick={handleReserveSpot}
                          disabled={actionLoading === 'reserving'}
                        >
                          {actionLoading === 'reserving' ? 'Reserviere...' : 'Platz reservieren'}
                        </Button>
                      )}
                      
                      {canPay && (
                        <Button
                          variant="contained"
                          startIcon={<PaymentIcon />}
                          onClick={() => setPaymentDialog(true)}
                          disabled={actionLoading === 'paying'}
                        >
                          Als bezahlt markieren
                        </Button>
                      )}
                      
                      {canCancel && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => setCancelDialog(true)}
                          disabled={actionLoading === 'cancelling'}
                        >
                          Teilnahme stornieren
                        </Button>
                      )}
                    </Stack>
                  </Box>
                ) : (
                  <Alert severity="info">
                    Sie sind nicht Teil dieser Buchung.
                  </Alert>
                )}
              </Paper>
            </Grid>

            {/* Payment Status Table */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Zahlungsübersicht aller Teilnehmer
                </Typography>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Teilnehmer</TableCell>
                        <TableCell>Betrag</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Bezahlt am</TableCell>
                        <TableCell>Zahlungsart</TableCell>
                        {isAdmin && <TableCell>Aktionen</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bookingSession.payments?.map((payment) => (
                        <TableRow key={payment.user._id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {payment.user.name?.[0] || '?'}
                              </Avatar>
                              <Box>
                                <Typography variant="body2">
                                  {payment.user.profile?.firstName && payment.user.profile?.lastName 
                                    ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
                                    : payment.user.name
                                  }
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {payment.user.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>€{payment.amount}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getPaymentStatusLabel(payment.status)}
                              color={getPaymentStatusColor(payment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {payment.paidAt 
                              ? new Date(payment.paidAt).toLocaleDateString('de-DE')
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {payment.paymentMethod || '-'}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              {payment.status === 'pending' && (
                                <Button
                                  size="small"
                                  onClick={() => {
                                    // Admin can mark others as paid
                                    setPaymentData({
                                      ...paymentData,
                                      userId: payment.user._id
                                    });
                                    setPaymentDialog(true);
                                  }}
                                >
                                  Als bezahlt markieren
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Admin Actions */}
            {isAdmin && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Administrator-Aktionen
                  </Typography>
                  
                  <Stack direction="row" spacing={2}>
                    {canFinalize && (
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
                    
                    {bookingSession.status === 'booked' && (
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => {
                          // Download booking confirmation
                          alert('Buchungsbestätigung wird heruntergeladen...');
                        }}
                      >
                        Buchungsbestätigung
                      </Button>
                    )}
                  </Stack>
                  
                  {bookingSession.status === 'booked' && bookingSession.finalBooking && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">
                        Buchung erfolgreich abgeschlossen!
                      </Typography>
                      <Typography variant="body2">
                        Buchungsreferenz: <strong>{bookingSession.finalBooking.bookingReference}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Gebucht am: {new Date(bookingSession.finalBooking.bookedAt).toLocaleDateString('de-DE')}
                      </Typography>
                    </Alert>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* Payment Dialog */}
        <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Zahlung bestätigen</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Markieren Sie die Zahlung als eingegangen.
            </Typography>
            
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>Zahlungsart</InputLabel>
              <Select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                label="Zahlungsart"
              >
                <MenuItem value="bank_transfer">Banküberweisung</MenuItem>
                <MenuItem value="paypal">PayPal</MenuItem>
                <MenuItem value="credit_card">Kreditkarte</MenuItem>
                <MenuItem value="cash">Bargeld</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Notizen (optional)"
              multiline
              rows={2}
              value={paymentData.notes}
              onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialog(false)}>Abbrechen</Button>
            <Button onClick={handleMarkAsPaid} variant="contained">
              Als bezahlt markieren
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Teilnahme stornieren</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>Achtung:</strong> Wenn Sie Ihre Teilnahme stornieren, können Sie nicht mehr an dieser Reise teilnehmen.
              </Typography>
            </Alert>
            <Typography variant="body1">
              Sind Sie sicher, dass Sie Ihre Teilnahme an dieser Gruppenreise stornieren möchten?
            </Typography>
            {userPaymentStatus?.status === 'paid' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Ihre Zahlung wird entsprechend der Stornierungsbedingungen behandelt.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialog(false)}>Abbrechen</Button>
            <Button 
              onClick={handleCancelParticipation} 
              color="error" 
              variant="contained"
              disabled={actionLoading === 'cancelling'}
            >
              {actionLoading === 'cancelling' ? 'Storniere...' : 'Teilnahme stornieren'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Finalize Dialog */}
        <Dialog open={finalizeDialog} onClose={() => setFinalizeDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Buchung abschließen</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1">
                Alle Zahlungen sind eingegangen. Sie können die Buchung jetzt abschließen.
              </Typography>
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              Buchungsübersicht
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Reiseziel:</Typography>
                <Typography variant="body1">{bookingSession?.finalDetails.destination}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Hotel:</Typography>
                <Typography variant="body1">{bookingSession?.finalDetails.hotelName || 'Nicht angegeben'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Teilnehmer:</Typography>
                <Typography variant="body1">{bookingSession?.finalDetails.totalParticipants}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Gesamtpreis:</Typography>
                <Typography variant="body1">€{bookingSession?.finalDetails.totalPrice}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Reisezeitraum:</Typography>
                <Typography variant="body1">
                  {bookingSession?.finalDetails.departureDate && bookingSession?.finalDetails.returnDate
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