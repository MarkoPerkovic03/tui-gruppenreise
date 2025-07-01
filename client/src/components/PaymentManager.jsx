// client/src/components/PaymentManager.jsx - ERWEITERTE ZAHLUNGSABWICKLUNG
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Euro as EuroIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Receipt as ReceiptIcon,
  Money as MoneyIcon,
  Assessment as StatsIcon
} from '@mui/icons-material';
import { useAuth } from '../App';
import api from '../utils/api';

const PaymentManager = ({ bookingSessionId, isAdmin = false, onUpdate }) => {
  const { user } = useAuth();
  
  // State Management
  const [bookingSession, setBookingSession] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Dialog States
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [reminderDialog, setReminderDialog] = useState(false);
  
  // Form States
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'stripe',
    amount: 0,
    notes: '',
    cardDetails: {
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardHolder: ''
    },
    bankDetails: {
      iban: '',
      bic: '',
      accountHolder: ''
    }
  });
  
  const [refundForm, setRefundForm] = useState({
    userId: '',
    reason: '',
    partialAmount: null,
    fullRefund: true
  });
  
  const [settingsForm, setSettingsForm] = useState({
    paymentDeadline: '',
    earlyBirdDeadline: '',
    earlyBirdDiscount: 0,
    lateFee: 25,
    allowPartialPayments: false,
    minimumDeposit: 100
  });

  useEffect(() => {
    loadBookingSession();
    loadPaymentStats();
  }, [bookingSessionId]);

  const loadBookingSession = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bookings/group/${bookingSessionId}`);
      setBookingSession(response.data.bookingSession);
      
      if (response.data.bookingSession) {
        setPaymentForm(prev => ({
          ...prev,
          amount: response.data.userPaymentStatus?.amount || prev.amount
        }));
      }
      
    } catch (error) {
      console.error('Fehler beim Laden der Booking Session:', error);
      setError('Fehler beim Laden der Zahlungsdaten');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentStats = async () => {
    try {
      const response = await api.get(`/payments/stats/${bookingSessionId}`);
      setPaymentStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Zahlungsstatistiken:', error);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError('');

      const paymentData = {
        bookingSessionId,
        paymentMethod: paymentForm.paymentMethod,
        amount: paymentForm.amount,
        notes: paymentForm.notes,
        paymentDetails: paymentForm.paymentMethod === 'stripe' 
          ? paymentForm.cardDetails 
          : paymentForm.bankDetails
      };

      console.log('Sende Zahlungsanfrage:', paymentData);

      const response = await api.post('/payments/process', paymentData);

      if (response.data.success) {
        setSuccess(`Zahlung erfolgreich! Transaktions-ID: ${response.data.transactionId}`);
        setPaymentDialog(false);
        await loadBookingSession();
        await loadPaymentStats();
        
        if (onUpdate) onUpdate();
      } else {
        setError(response.data.message || 'Zahlung fehlgeschlagen');
      }

    } catch (error) {
      console.error('Zahlungsfehler:', error);
      setError(error.response?.data?.message || 'Fehler bei der Zahlungsverarbeitung');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefund = async () => {
    try {
      setProcessing(true);
      setError('');

      const refundData = {
        bookingSessionId,
        userId: refundForm.userId,
        reason: refundForm.reason,
        partialAmount: refundForm.fullRefund ? null : refundForm.partialAmount
      };

      const response = await api.post('/payments/refund', refundData);

      if (response.data.success) {
        setSuccess('Erstattung erfolgreich verarbeitet');
        setRefundDialog(false);
        await loadBookingSession();
        await loadPaymentStats();
        
        if (onUpdate) onUpdate();
      }

    } catch (error) {
      console.error('Erstattungsfehler:', error);
      setError(error.response?.data?.message || 'Fehler bei der Erstattung');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendReminder = async (userId, reminderType = 'payment_due') => {
    try {
      setProcessing(true);
      
      const response = await api.post('/payments/send-reminder', {
        bookingSessionId,
        userId,
        reminderType
      });

      if (response.data.success) {
        setSuccess(`Erinnerung gesendet an ${response.data.sentTo}`);
        await loadBookingSession();
      }

    } catch (error) {
      console.error('Erinnerungsfehler:', error);
      setError(error.response?.data?.message || 'Fehler beim Senden der Erinnerung');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReminders = async () => {
    try {
      setProcessing(true);
      
      const response = await api.post('/payments/send-bulk-reminders', {
        bookingSessionId,
        reminderType: 'payment_due'
      });

      if (response.data.success) {
        setSuccess(`${response.data.sentCount} Erinnerungen versendet`);
        setReminderDialog(false);
        await loadBookingSession();
      }

    } catch (error) {
      console.error('Massen-Erinnerungsfehler:', error);
      setError(error.response?.data?.message || 'Fehler beim Senden der Erinnerungen');
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'reserved': return 'info';
      case 'failed': return 'error';
      case 'refunded': return 'secondary';
      default: return 'default';
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckIcon />;
      case 'pending': return <ScheduleIcon />;
      case 'reserved': return <PaymentIcon />;
      case 'failed': return <WarningIcon />;
      case 'refunded': return <MoneyIcon />;
      default: return <PaymentIcon />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const userPayment = bookingSession?.payments?.find(p => 
    p.user._id === user?.id
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography>Lade Zahlungsdaten...</Typography>
      </Box>
    );
  }

  if (!bookingSession) {
    return (
      <Alert severity="error">
        Buchungsdaten konnten nicht geladen werden
      </Alert>
    );
  }

  return (
    <Box>
      {/* Success/Error Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Zahlungsübersicht */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            Zahlungsabwicklung
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => {
                loadBookingSession();
                loadPaymentStats();
              }}
              disabled={processing}
            >
              Aktualisieren
            </Button>
            {isAdmin && (
              <>
                <Button
                  startIcon={<SendIcon />}
                  onClick={() => setReminderDialog(true)}
                  disabled={processing}
                  variant="outlined"
                >
                  Erinnerungen
                </Button>
                <Button
                  startIcon={<SettingsIcon />}
                  onClick={() => setSettingsDialog(true)}
                  disabled={processing}
                  variant="outlined"
                >
                  Einstellungen
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Gesamtstatus */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <EuroIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">
                  {formatCurrency(bookingSession.finalDetails.totalPrice)}
                </Typography>
                <Typography color="text.secondary">Gesamtbetrag</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4">
                  {bookingSession.paidParticipants}/{bookingSession.payments.length}
                </Typography>
                <Typography color="text.secondary">Bezahlt</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <StatsIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">{bookingSession.paymentProgress}%</Typography>
                <Typography color="text.secondary">Fortschritt</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4">
                  {bookingSession.daysUntilPaymentDeadline || 0}
                </Typography>
                <Typography color="text.secondary">Tage verbleibend</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Fortschrittsbalken */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">Zahlungsfortschritt</Typography>
            <Typography variant="body2">
              {formatCurrency(bookingSession.totalCollected)} von {formatCurrency(bookingSession.finalDetails.totalPrice)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={bookingSession.paymentProgress}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
      </Paper>

      {/* Benutzer-Zahlungsstatus */}
      {userPayment && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ihr Zahlungsstatus
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Chip 
              icon={getPaymentStatusIcon(userPayment.status)}
              label={userPayment.status === 'paid' ? 'Bezahlt' :
                     userPayment.status === 'pending' ? 'Ausstehend' :
                     userPayment.status === 'reserved' ? 'Reserviert' :
                     userPayment.status === 'failed' ? 'Fehlgeschlagen' : 'Erstattet'}
              color={getPaymentStatusColor(userPayment.status)}
            />
            <Typography variant="h6">
              {formatCurrency(userPayment.amount)}
            </Typography>
          </Box>

          {userPayment.status === 'pending' && (
            <Button
              variant="contained"
              size="large"
              startIcon={<PaymentIcon />}
              onClick={() => setPaymentDialog(true)}
              disabled={processing}
              sx={{ mt: 2 }}
            >
              Jetzt bezahlen
            </Button>
          )}

          {userPayment.paidAt && (
            <Typography variant="body2" color="text.secondary">
              Bezahlt am: {new Date(userPayment.paidAt).toLocaleDateString('de-DE')}
            </Typography>
          )}
        </Paper>
      )}

      {/* Zahlungsübersicht aller Teilnehmer */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Zahlungsübersicht aller Teilnehmer
        </Typography>
        
        <List>
          {bookingSession.payments.map((payment, index) => (
            <React.Fragment key={payment._id}>
              <ListItem>
                <ListItemIcon>
                  {getPaymentStatusIcon(payment.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body1">
                        {payment.user.profile?.firstName && payment.user.profile?.lastName 
                          ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
                          : payment.user.name
                        }
                      </Typography>
                      <Chip 
                        label={payment.status === 'paid' ? 'Bezahlt' :
                               payment.status === 'pending' ? 'Ausstehend' :
                               payment.status === 'reserved' ? 'Reserviert' :
                               payment.status === 'failed' ? 'Fehlgeschlagen' : 'Erstattet'}
                        color={getPaymentStatusColor(payment.status)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {formatCurrency(payment.amount)}
                      </Typography>
                      {payment.paidAt && (
                        <Typography variant="caption" color="text.secondary">
                          Bezahlt am: {new Date(payment.paidAt).toLocaleDateString('de-DE')}
                        </Typography>
                      )}
                      {payment.paymentMethod && payment.status === 'paid' && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          via {payment.paymentMethod}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                {isAdmin && (
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      {payment.status === 'pending' && (
                        <Button
                          size="small"
                          startIcon={<SendIcon />}
                          onClick={() => handleSendReminder(payment.user._id)}
                          disabled={processing}
                        >
                          Erinnerung
                        </Button>
                      )}
                      {payment.status === 'paid' && (
                        <Button
                          size="small"
                          startIcon={<MoneyIcon />}
                          onClick={() => {
                            setRefundForm({
                              ...refundForm,
                              userId: payment.user._id
                            });
                            setRefundDialog(true);
                          }}
                          disabled={processing}
                          color="secondary"
                        >
                          Erstatten
                        </Button>
                      )}
                    </Stack>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
              {index < bookingSession.payments.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Statistiken (nur für Admins) */}
      {isAdmin && paymentStats && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Detaillierte Statistiken</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Übersicht</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Teilnehmer gesamt"
                      secondary={paymentStats.overview.totalParticipants}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Bezahlte Teilnehmer"
                      secondary={paymentStats.overview.paidParticipants}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Eingegangener Betrag"
                      secondary={formatCurrency(paymentStats.overview.collectedAmount)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Ausstehender Betrag"
                      secondary={formatCurrency(paymentStats.overview.pendingAmount)}
                    />
                  </ListItem>
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Timing</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Zahlungsfrist"
                      secondary={paymentStats.timing.paymentDeadline ? 
                        new Date(paymentStats.timing.paymentDeadline).toLocaleDateString('de-DE') : 
                        'Nicht gesetzt'
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Tage bis Frist"
                      secondary={paymentStats.timing.daysUntilDeadline || 'Abgelaufen'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Durchschnittliche Zahlungszeit"
                      secondary={`${paymentStats.timing.avgPaymentTime || 0} Tage`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Status"
                      secondary={paymentStats.timing.isOverdue ? 'Überfällig' : 'Rechtzeitig'}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Zahlung durchführen</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Zu zahlender Betrag: {formatCurrency(paymentForm.amount)}
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Zahlungsart</InputLabel>
              <Select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({
                  ...paymentForm,
                  paymentMethod: e.target.value
                })}
                label="Zahlungsart"
              >
                <MenuItem value="stripe">
                  <Box display="flex" alignItems="center" gap={1}>
                    <CreditCardIcon />
                    Kreditkarte (Stripe)
                  </Box>
                </MenuItem>
                <MenuItem value="paypal">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PaymentIcon />
                    PayPal
                  </Box>
                </MenuItem>
                <MenuItem value="bank_transfer">
                  <Box display="flex" alignItems="center" gap={1}>
                    <BankIcon />
                    Banküberweisung
                  </Box>
                </MenuItem>
                <MenuItem value="sepa">
                  <Box display="flex" alignItems="center" gap={1}>
                    <EuroIcon />
                    SEPA-Lastschrift
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Kreditkarten-Details */}
            {paymentForm.paymentMethod === 'stripe' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Kreditkarten-Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Karteninhaber"
                      value={paymentForm.cardDetails.cardHolder}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        cardDetails: {
                          ...paymentForm.cardDetails,
                          cardHolder: e.target.value
                        }
                      })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Kartennummer"
                      value={paymentForm.cardDetails.cardNumber}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        cardDetails: {
                          ...paymentForm.cardDetails,
                          cardNumber: e.target.value
                        }
                      })}
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Ablaufdatum"
                      value={paymentForm.cardDetails.expiryDate}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        cardDetails: {
                          ...paymentForm.cardDetails,
                          expiryDate: e.target.value
                        }
                      })}
                      placeholder="MM/YY"
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="CVV"
                      value={paymentForm.cardDetails.cvv}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        cardDetails: {
                          ...paymentForm.cardDetails,
                          cvv: e.target.value
                        }
                      })}
                      placeholder="123"
                      required
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Bank-Details */}
            {(paymentForm.paymentMethod === 'bank_transfer' || paymentForm.paymentMethod === 'sepa') && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {paymentForm.paymentMethod === 'bank_transfer' ? 'Bankdaten für Überweisung' : 'SEPA-Lastschrift Details'}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Kontoinhaber"
                      value={paymentForm.bankDetails.accountHolder}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        bankDetails: {
                          ...paymentForm.bankDetails,
                          accountHolder: e.target.value
                        }
                      })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="IBAN"
                      value={paymentForm.bankDetails.iban}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        bankDetails: {
                          ...paymentForm.bankDetails,
                          iban: e.target.value
                        }
                      })}
                      placeholder="DE89 3704 0044 0532 0130 00"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="BIC"
                      value={paymentForm.bankDetails.bic}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        bankDetails: {
                          ...paymentForm.bankDetails,
                          bic: e.target.value
                        }
                      })}
                      placeholder="COBADEFFXXX"
                    />
                  </Grid>
                </Grid>

                {paymentForm.paymentMethod === 'bank_transfer' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Verwendungszweck:</strong> Bitte geben Sie bei der Überweisung die 
                      Referenz "{bookingSession._id.slice(-8)}" an.
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}

            {/* PayPal Info */}
            {paymentForm.paymentMethod === 'paypal' && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Sie werden zu PayPal weitergeleitet, um die Zahlung abzuschließen.
                </Typography>
              </Alert>
            )}

            {/* Notizen */}
            <TextField
              fullWidth
              label="Notizen (optional)"
              multiline
              rows={2}
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({
                ...paymentForm,
                notes: e.target.value
              })}
              placeholder="Zusätzliche Informationen zur Zahlung..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)} disabled={processing}>
            Abbrechen
          </Button>
          <Button 
            onClick={handlePayment} 
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} /> : <PaymentIcon />}
          >
            {processing ? 'Verarbeitung...' : `${formatCurrency(paymentForm.amount)} bezahlen`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onClose={() => setRefundDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Erstattung verarbeiten</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Benutzer auswählen</InputLabel>
              <Select
                value={refundForm.userId}
                onChange={(e) => setRefundForm({
                  ...refundForm,
                  userId: e.target.value
                })}
                label="Benutzer auswählen"
              >
                {bookingSession.payments
                  .filter(p => p.status === 'paid')
                  .map(payment => (
                    <MenuItem key={payment.user._id} value={payment.user._id}>
                      {payment.user.profile?.firstName && payment.user.profile?.lastName 
                        ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
                        : payment.user.name
                      } - {formatCurrency(payment.amount)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography>Erstattungsart:</Typography>
                <Button
                  variant={refundForm.fullRefund ? "contained" : "outlined"}
                  onClick={() => setRefundForm({
                    ...refundForm,
                    fullRefund: true,
                    partialAmount: null
                  })}
                  size="small"
                >
                  Vollständig
                </Button>
                <Button
                  variant={!refundForm.fullRefund ? "contained" : "outlined"}
                  onClick={() => setRefundForm({
                    ...refundForm,
                    fullRefund: false
                  })}
                  size="small"
                >
                  Teilweise
                </Button>
              </Box>
            </FormControl>

            {!refundForm.fullRefund && (
              <TextField
                fullWidth
                label="Erstattungsbetrag (€)"
                type="number"
                value={refundForm.partialAmount || ''}
                onChange={(e) => setRefundForm({
                  ...refundForm,
                  partialAmount: parseFloat(e.target.value)
                })}
                sx={{ mb: 3 }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            )}

            <TextField
              fullWidth
              label="Grund für Erstattung"
              multiline
              rows={3}
              value={refundForm.reason}
              onChange={(e) => setRefundForm({
                ...refundForm,
                reason: e.target.value
              })}
              placeholder="Bitte geben Sie den Grund für die Erstattung an..."
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog(false)} disabled={processing}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleRefund} 
            variant="contained"
            color="secondary"
            disabled={processing || !refundForm.userId || !refundForm.reason}
            startIcon={processing ? <CircularProgress size={16} /> : <MoneyIcon />}
          >
            {processing ? 'Verarbeitung...' : 'Erstattung verarbeiten'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Zahlungseinstellungen</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Zahlungsfrist"
                  type="datetime-local"
                  value={settingsForm.paymentDeadline}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    paymentDeadline: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frühbucher-Frist"
                  type="datetime-local"
                  value={settingsForm.earlyBirdDeadline}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    earlyBirdDeadline: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frühbucher-Rabatt (%)"
                  type="number"
                  value={settingsForm.earlyBirdDiscount}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    earlyBirdDiscount: parseFloat(e.target.value)
                  })}
                  inputProps={{ min: 0, max: 50, step: 1 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Verspätungsgebühr (€)"
                  type="number"
                  value={settingsForm.lateFee}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    lateFee: parseFloat(e.target.value)
                  })}
                  inputProps={{ min: 0, step: 5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mindestanzahlung (€)"
                  type="number"
                  value={settingsForm.minimumDeposit}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    minimumDeposit: parseFloat(e.target.value)
                  })}
                  inputProps={{ min: 0, step: 10 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)} disabled={processing}>
            Abbrechen
          </Button>
          <Button 
            onClick={() => {
              // Hier würde die Aktualisierung der Einstellungen erfolgen
              console.log('Update settings:', settingsForm);
              setSettingsDialog(false);
              setSuccess('Einstellungen aktualisiert');
            }}
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} /> : <SettingsIcon />}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialog} onClose={() => setReminderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Zahlungserinnerungen senden</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Möchten Sie Zahlungserinnerungen an alle Teilnehmer mit ausstehenden Zahlungen senden?
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Erinnerungen werden nur an Teilnehmer gesendet, die:
              <br />• Noch nicht bezahlt haben
              <br />• Seit mindestens 2 Tagen keine Erinnerung erhalten haben
            </Typography>
          </Alert>
          
          {bookingSession.payments && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Betroffene Teilnehmer ({bookingSession.payments.filter(p => p.status === 'pending').length}):
              </Typography>
              <List dense>
                {bookingSession.payments
                  .filter(p => p.status === 'pending')
                  .map(payment => (
                    <ListItem key={payment._id}>
                      <ListItemText
                        primary={payment.user.profile?.firstName && payment.user.profile?.lastName 
                          ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
                          : payment.user.name
                        }
                        secondary={`${formatCurrency(payment.amount)} • ${payment.user.email}`}
                      />
                    </ListItem>
                  ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialog(false)} disabled={processing}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleBulkReminders}
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {processing ? 'Sende...' : 'Erinnerungen senden'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentManager;