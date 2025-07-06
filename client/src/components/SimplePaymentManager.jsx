// client/src/components/SimplePaymentManager.jsx - Vereinfachte Zahlungsabwicklung
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Euro as EuroIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useAuth } from '../App';
import api from '../services/api';

const SimplePaymentManager = ({ bookingSession, isAdmin, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [paymentNote, setPaymentNote] = useState('');

  // Finde die Zahlung des aktuellen Users
  const userPayment = bookingSession?.payments?.find(p => {
    const userId = p.user._id || p.user;
    return userId === user?.id || userId?.toString() === user?.id;
  });

  // Zahlung als bezahlt markieren (für Admins)
  const handleMarkAsPaid = async (payment) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.post(`/bookings/${bookingSession._id}/pay`, {
        userId: payment.user._id || payment.user,
        paymentMethod: 'bank_transfer',
        notes: paymentNote || 'Manuell als bezahlt markiert'
      });

      setSuccess('Zahlung erfolgreich markiert!');
      setPaymentDialog(false);
      setSelectedUser(null);
      setPaymentNote('');
      
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Fehler:', error);
      setError(error.response?.data?.message || 'Fehler beim Aktualisieren');
    } finally {
      setLoading(false);
    }
  };

  // Eigene Zahlung bestätigen
  const handleConfirmOwnPayment = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.post(`/bookings/${bookingSession._id}/pay`, {
        paymentMethod: 'bank_transfer',
        notes: 'Zahlung getätigt - wartet auf Bestätigung'
      });

      setSuccess('Ihre Zahlung wurde registriert. Ein Admin wird sie bestätigen.');
      
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Fehler:', error);
      setError(error.response?.data?.message || 'Fehler beim Aktualisieren');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (!bookingSession) {
    return null;
  }

  const paidCount = bookingSession.payments.filter(p => p.status === 'paid').length;
  const totalCount = bookingSession.payments.length;
  const totalPaid = bookingSession.payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Box>
      {/* Nachrichten */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Übersicht */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {paidCount}/{totalCount}
              </Typography>
              <Typography color="text.secondary">
                Teilnehmer bezahlt
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {formatCurrency(totalPaid)}
              </Typography>
              <Typography color="text.secondary">
                Eingegangen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {formatCurrency(bookingSession.finalDetails.totalPrice - totalPaid)}
              </Typography>
              <Typography color="text.secondary">
                Ausstehend
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Eigener Zahlungsstatus */}
      {userPayment && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ihr Zahlungsstatus
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            {userPayment.status === 'paid' ? (
              <Chip 
                icon={<CheckIcon />}
                label="Bezahlt"
                color="success"
              />
            ) : (
              <Chip 
                icon={<PendingIcon />}
                label="Ausstehend"
                color="warning"
              />
            )}
            
            <Typography variant="h6">
              {formatCurrency(userPayment.amount)}
            </Typography>
          </Box>

          {userPayment.status === 'pending' && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Bankverbindung für Überweisung:</strong><br />
                  IBAN: DE89 3704 0044 0532 0130 00<br />
                  Verwendungszweck: {bookingSession._id.slice(-8)}<br />
                  Betrag: {formatCurrency(userPayment.amount)}
                </Typography>
              </Alert>
              
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={handleConfirmOwnPayment}
                disabled={loading}
              >
                Ich habe überwiesen
              </Button>
            </Box>
          )}
          
          {userPayment.status === 'paid' && userPayment.paidAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bezahlt am: {new Date(userPayment.paidAt).toLocaleDateString('de-DE')}
            </Typography>
          )}
        </Paper>
      )}

      {/* Teilnehmerliste */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Zahlungsübersicht
        </Typography>
        
        <List>
          {bookingSession.payments.map((payment, index) => {
            const userName = payment.user.profile?.firstName && payment.user.profile?.lastName 
              ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
              : payment.user.name;
              
            return (
              <React.Fragment key={payment._id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography>{userName}</Typography>
                        <Chip 
                          size="small"
                          label={payment.status === 'paid' ? 'Bezahlt' : 'Ausstehend'}
                          color={payment.status === 'paid' ? 'success' : 'warning'}
                          icon={payment.status === 'paid' ? <CheckIcon /> : <PendingIcon />}
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
                        {payment.notes && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Notiz: {payment.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  
                  {isAdmin && payment.status === 'pending' && (
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedUser(payment);
                          setPaymentDialog(true);
                        }}
                      >
                        Als bezahlt markieren
                      </Button>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
                {index < bookingSession.payments.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      </Paper>

      {/* Admin Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)}>
        <DialogTitle>Zahlung bestätigen</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Zahlung für <strong>{selectedUser?.user.name}</strong> als bezahlt markieren?
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Betrag: {selectedUser && formatCurrency(selectedUser.amount)}
          </Typography>
          
          <TextField
            fullWidth
            label="Notiz (optional)"
            multiline
            rows={2}
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="z.B. Überweisung erhalten am..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPaymentDialog(false);
            setSelectedUser(null);
            setPaymentNote('');
          }}>
            Abbrechen
          </Button>
          <Button 
            variant="contained"
            onClick={() => handleMarkAsPaid(selectedUser)}
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} />}
          >
            Bestätigen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// WICHTIG: Default Export!
export default SimplePaymentManager;
