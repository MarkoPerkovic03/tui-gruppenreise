import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Stack,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Euro as EuroIcon
} from '@mui/icons-material';
import api from '../utils/api';

const AdminDestinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    description: '',
    images: [],
    avgPricePerPerson: '',
    tags: [],
    coordinates: { lat: '', lng: '' }
  });

  const availableTags = [
    'beach', 'city', 'mountains', 'culture', 'adventure', 
    'relaxation', 'party', 'family', 'romantic', 'luxury', 'budget'
  ];

  const [newImage, setNewImage] = useState('');

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/destinations');
      setDestinations(response.data.destinations || response.data);
      setError('');
    } catch (error) {
      console.error('Fehler beim Laden der Reiseziele:', error);
      setError('Fehler beim Laden der Reiseziele');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (destination = null) => {
    if (destination) {
      setEditingDestination(destination);
      setFormData({
        name: destination.name || '',
        country: destination.country || '',
        city: destination.city || '',
        description: destination.description || '',
        images: destination.images || [],
        avgPricePerPerson: destination.avgPricePerPerson || '',
        tags: destination.tags || [],
        coordinates: destination.coordinates || { lat: '', lng: '' }
      });
    } else {
      setEditingDestination(null);
      setFormData({
        name: '',
        country: '',
        city: '',
        description: '',
        images: [],
        avgPricePerPerson: '',
        tags: [],
        coordinates: { lat: '', lng: '' }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDestination(null);
    setNewImage('');
    setError('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCoordinateChange = (coord, value) => {
    setFormData(prev => ({
      ...prev,
      coordinates: {
        ...prev.coordinates,
        [coord]: value
      }
    }));
  };

  const handleAddImage = () => {
    if (newImage.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, newImage.trim()]
      }));
      setNewImage('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!formData.name || !formData.country) {
        setError('Name und Land sind Pflichtfelder');
        return;
      }

      const submitData = {
        ...formData,
        avgPricePerPerson: formData.avgPricePerPerson ? Number(formData.avgPricePerPerson) : 0,
        coordinates: {
          lat: formData.coordinates.lat ? Number(formData.coordinates.lat) : null,
          lng: formData.coordinates.lng ? Number(formData.coordinates.lng) : null
        }
      };

      if (editingDestination) {
        await api.put(`/destinations/${editingDestination._id}`, submitData);
      } else {
        await api.post('/destinations', submitData);
      }

      await loadDestinations();
      handleCloseDialog();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError(error.response?.data?.message || 'Fehler beim Speichern des Reiseziels');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Reiseziel löschen möchten?')) {
      try {
        await api.delete(`/destinations/${id}`);
        await loadDestinations();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        setError('Fehler beim Löschen des Reiseziels');
      }
    }
  };

  return (
    <>
      <Box className="page-header">
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Reiseziele verwalten
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Erstellen und bearbeiten Sie Reiseziele für Ihre Benutzer
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ width: '100%', mb: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Land</TableCell>
                  <TableCell>Stadt</TableCell>
                  <TableCell>Durchschnittspreis</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Popularität</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {destinations.map((destination) => (
                  <TableRow key={destination._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                        {destination.name}
                      </Box>
                    </TableCell>
                    <TableCell>{destination.country}</TableCell>
                    <TableCell>{destination.city || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EuroIcon sx={{ mr: 1, fontSize: 16 }} />
                        {destination.avgPricePerPerson || 0}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {destination.tags?.slice(0, 2).map((tag, index) => (
                          <Chip key={index} label={tag} size="small" />
                        ))}
                        {destination.tags?.length > 2 && (
                          <Chip 
                            label={`+${destination.tags.length - 2}`} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{destination.popularityScore || 0}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleOpenDialog(destination)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(destination._id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {destinations.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1" color="text.secondary">
                        Noch keine Reiseziele vorhanden
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Fab
          color="primary"
          onClick={() => handleOpenDialog()}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Dialog für Erstellen/Bearbeiten */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDestination ? 'Reiseziel bearbeiten' : 'Neues Reiseziel erstellen'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Land *"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stadt"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Durchschnittspreis pro Person (€)"
                type="number"
                value={formData.avgPricePerPerson}
                onChange={(e) => handleInputChange('avgPricePerPerson', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Breitengrad"
                type="number"
                value={formData.coordinates.lat}
                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                placeholder="z.B. 52.5200"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Längengrad"
                type="number"
                value={formData.coordinates.lng}
                onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                placeholder="z.B. 13.4050"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  input={<OutlinedInput label="Tags" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      {tag}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Bilder
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Bild-URL hinzufügen"
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button onClick={handleAddImage} variant="outlined">
                  Hinzufügen
                </Button>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.images.map((image, index) => (
                  <Chip
                    key={index}
                    label={`Bild ${index + 1}`}
                    onDelete={() => handleRemoveImage(index)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingDestination ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdminDestinations;