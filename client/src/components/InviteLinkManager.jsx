// client/src/components/InviteLinkManager.jsx - Vollständige Einladungslink-Verwaltung
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  InputAdornment,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Share as ShareIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';
import api from '../utils/api';

const InviteLinkManager = ({ groupId, group, onUpdate }) => {
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState(false);
  
  const [newInviteSettings, setNewInviteSettings] = useState({
    expiresInDays: 7,
    description: ''
  });

  useEffect(() => {
    loadCurrentInvite();
  }, [groupId]);

  const loadCurrentInvite = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.getCurrentInviteLink(groupId);
      setInviteData(response);
      
    } catch (error) {
      console.error('Fehler beim Laden des Einladungslinks:', error);
      setError('Fehler beim Laden des Einladungslinks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      setCreating(true);
      setError('');
      
      const response = await api.generateInviteLink(groupId, newInviteSettings.expiresInDays);
      
      setInviteData(response);
      setCreateDialog(false);
      setSuccess('Einladungslink erfolgreich erstellt!');
      
      // Reset form
      setNewInviteSettings({
        expiresInDays: 7,
        description: ''
      });
      
      // Update parent component
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error) {
      console.error('Fehler beim Erstellen des Einladungslinks:', error);
      setError(error.response?.data?.message || 'Fehler beim Erstellen des Einladungslinks');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeInvite = async () => {
    try {
      setError('');
      
      await api.revokeInviteLink(groupId);
      
      setInviteData({ hasActiveInvite: false });
      setDeleteDialog(false);
      setSuccess('Einladungslink wurde widerrufen');
      
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error) {
      console.error('Fehler beim Widerrufen des Einladungslinks:', error);
      setError(error.response?.data?.message || 'Fehler beim Widerrufen des Einladungslinks');
    }
  };

  const handleCopyLink = async () => {
    if (!inviteData?.inviteUrl) return;
    
    try {
      await navigator.clipboard.writeText(inviteData.inviteUrl);
      setSuccess('Link in die Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      setError('Fehler beim Kopieren des Links');
    }
  };

  const handleShare = async () => {
    if (!inviteData?.inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Einladung zur Reisegruppe "${group?.name}"`,
          text: `Du bist eingeladen, der Reisegruppe "${group?.name}" beizutreten!`,
          url: inviteData.inviteUrl
        });
        setSuccess('Einladung geteilt!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Fehler beim Teilen:', error);
          setError('Fehler beim Teilen der Einladung');
        }
      }
    } else {
      // Fallback: Zeige Share Dialog
      setShareDialog(true);
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'Unbekannt';
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return 'Abgelaufen';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} Tag${days !== 1 ? 'e' : ''} ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const isExpired = (expiresAt) => {
    return expiresAt && new Date(expiresAt) <= new Date();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography>Lade Einladungslinks...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Einladungslinks verwalten
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Erstellen Sie Einladungslinks, damit neue Mitglieder Ihrer Gruppe beitreten können.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Aktueller Einladungslink */}
      {inviteData?.hasActiveInvite ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" color="primary">
                Aktiver Einladungslink
              </Typography>
              <Chip
                icon={isExpired(inviteData.expiresAt) ? <WarningIcon /> : <CheckIcon />}
                label={isExpired(inviteData.expiresAt) ? 'Abgelaufen' : 'Aktiv'}
                color={isExpired(inviteData.expiresAt) ? 'error' : 'success'}
                size="small"
              />
            </Box>

            {/* Link URL */}
            <TextField
              fullWidth
              label="Einladungslink"
              value={inviteData.inviteUrl || ''}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Link kopieren">
                      <IconButton onClick={handleCopyLink} size="small">
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            {/* Link Informationen */}
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <TimeIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Ablaufzeit"
                  secondary={
                    inviteData.expiresAt
                      ? `${new Date(inviteData.expiresAt).toLocaleString('de-DE')} (${formatTimeRemaining(inviteData.expiresAt)})`
                      : 'Unbekannt'
                  }
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Token"
                  secondary={inviteData.inviteToken || 'Unbekannt'}
                />
              </ListItem>
            </List>

            {/* Link-Status Informationen */}
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0, 87, 184, 0.05)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Hinweis:</strong> Jeder mit diesem Link kann der Gruppe beitreten, 
                solange noch Plätze frei sind und der Link nicht abgelaufen ist.
              </Typography>
            </Box>
          </CardContent>

          <CardActions>
            <Button
              startIcon={<ShareIcon />}
              onClick={handleShare}
              variant="outlined"
              disabled={isExpired(inviteData.expiresAt)}
            >
              Teilen
            </Button>
            <Button
              startIcon={<CopyIcon />}
              onClick={handleCopyLink}
              variant="outlined"
              disabled={isExpired(inviteData.expiresAt)}
            >
              Kopieren
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadCurrentInvite}
              variant="outlined"
              size="small"
            >
              Aktualisieren
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialog(true)}
              color="error"
              variant="outlined"
            >
              Widerrufen
            </Button>
          </CardActions>
        </Card>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <LinkIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Kein aktiver Einladungslink
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Erstellen Sie einen Einladungslink, damit neue Mitglieder Ihrer Gruppe beitreten können.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
              size="large"
            >
              Einladungslink erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gruppenstatus Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Gruppenstatus:</strong> {group?.status || 'Unbekannt'} | 
          <strong> Mitglieder:</strong> {group?.members?.length || 0}/{group?.maxParticipants || 0} | 
          <strong> Freie Plätze:</strong> {(group?.maxParticipants || 0) - (group?.members?.length || 0)}
        </Typography>
      </Alert>

      {/* Quick Actions */}
      <Box display="flex" gap={2} flexWrap="wrap">
        {!inviteData?.hasActiveInvite && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            Neuen Link erstellen
          </Button>
        )}
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadCurrentInvite}
        >
          Status aktualisieren
        </Button>
      </Box>

      {/* Create Invite Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuen Einladungslink erstellen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Erstellen Sie einen neuen Einladungslink für diese Gruppe.
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Gültigkeit</InputLabel>
            <Select
              value={newInviteSettings.expiresInDays}
              onChange={(e) => setNewInviteSettings(prev => ({ ...prev, expiresInDays: e.target.value }))}
              label="Gültigkeit"
            >
              <MenuItem value={1}>1 Tag</MenuItem>
              <MenuItem value={3}>3 Tage</MenuItem>
              <MenuItem value={7}>1 Woche</MenuItem>
              <MenuItem value={14}>2 Wochen</MenuItem>
              <MenuItem value={30}>1 Monat</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Beschreibung (optional)"
            value={newInviteSettings.description}
            onChange={(e) => setNewInviteSettings(prev => ({ ...prev, description: e.target.value }))}
            multiline
            rows={2}
            placeholder="Z.B. 'Einladung für Freunde aus dem Sportverein'"
            sx={{ mb: 2 }}
          />

          <Alert severity="info">
            <Typography variant="body2">
              Der neue Link wird nach {newInviteSettings.expiresInDays} Tag{newInviteSettings.expiresInDays !== 1 ? 'en' : ''} automatisch ablaufen.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleCreateInvite}
            variant="contained"
            disabled={creating}
            startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {creating ? 'Erstelle...' : 'Link erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Einladungslink widerrufen?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Achtung:</strong> Wenn Sie den Einladungslink widerrufen, können keine neuen Mitglieder mehr über diesen Link beitreten.
            </Typography>
          </Alert>
          <Typography variant="body1">
            Möchten Sie den aktuellen Einladungslink wirklich widerrufen?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Sie können jederzeit einen neuen Link erstellen.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleRevokeInvite}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Link widerrufen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog (Fallback for devices without native share) */}
      <Dialog open={shareDialog} onClose={() => setShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Einladung teilen</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Teilen Sie diese Einladung mit neuen Gruppenmitgliedern:
          </Typography>
          
          <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Du bist eingeladen!</strong>
            </Typography>
            <Typography variant="body2" gutterBottom>
              Tritt der Reisegruppe "{group?.name}" bei:
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {inviteData?.inviteUrl}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => {
                const text = `Du bist eingeladen!\n\nTritt der Reisegruppe "${group?.name}" bei:\n${inviteData?.inviteUrl}`;
                navigator.clipboard.writeText(text);
                setSuccess('Einladungstext kopiert!');
                setShareDialog(false);
              }}
              fullWidth
            >
              Text kopieren
            </Button>
            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => {
                navigator.clipboard.writeText(inviteData?.inviteUrl);
                setSuccess('Link kopiert!');
                setShareDialog(false);
              }}
              fullWidth
            >
              Link kopieren
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InviteLinkManager;