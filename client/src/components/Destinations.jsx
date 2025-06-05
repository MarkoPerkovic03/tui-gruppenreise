import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActions,
  Button,
  Box,
  Chip,
  Skeleton,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Euro as EuroIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  AddCircleOutline as AddToGroupIcon
} from '@mui/icons-material';
import api from '../utils/api';

const Destinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [filters, setFilters] = useState({
    country: '',
    minPrice: '',
    maxPrice: '',
    tags: []
  });

  const availableTags = [
    'beach', 'city', 'mountains', 'culture', 'adventure', 
    'relaxation', 'party', 'family', 'romantic', 'luxury', 'budget'
  ];

  useEffect(() => {
    fetchDestinations();
  }, [searchTerm, filters]);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.country) params.append('country', filters.country);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }

      const response = await api.get(`/destinations?${params.toString()}`);
      const destinationsData = response.data.destinations || response.data;
      setDestinations(destinationsData);
      setError('');
    } catch (error) {
      console.error('Fehler beim Laden der Reiseziele:', error);
      setError('Fehler beim Laden der Reiseziele. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleTagToggle = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearFilters = () => {
    setFilters({
      country: '',
      minPrice: '',
      maxPrice: '',
      tags: []
    });
    setSearchTerm('');
  };

  const handleAddToGroup = async (destination) => {
    try {
      // Hier würde die Logik zum Hinzufügen zu einer Gruppe implementiert
      // Für jetzt erhöhen wir nur die Popularität
      await api.post(`/destinations/${destination._id}/popularity`);
      
      // Aktualisiere die Destination in der Liste
      setDestinations(prev => 
        prev.map(dest => 
          dest._id === destination._id 
            ? { ...dest, popularityScore: (dest.popularityScore || 0) + 1 }
            : dest
        )
      );
      
      alert(`"${destination.name}" wurde zu Ihrer Gruppe hinzugefügt!`);
    } catch (error) {
      console.error('Fehler beim Hinzufügen zur Gruppe:', error);
      alert('Fehler beim Hinzufügen zur Gruppe');
    }
  };

  const LoadingSkeleton = () => (
    <Grid item xs={12} sm={6} md={4}>
      <Card>
        <Skeleton variant="rectangular" height={200} />
        <CardContent>
          <Skeleton variant="text" height={40} />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="60%" />
        </CardContent>
      </Card>
    </Grid>
  );

  const DestinationDetailDialog = ({ destination, open, onClose }) => {
    if (!destination) return null;

    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {destination.name}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {destination.images && destination.images.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <img 
                src={destination.images[0]} 
                alt={destination.name}
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '8px' }}
              />
            </Box>
          )}
          
          <Typography variant="h6" gutterBottom>
            {destination.name}, {destination.country}
          </Typography>
          
          {destination.city && (
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {destination.city}
            </Typography>
          )}

          <Typography variant="body1" paragraph>
            {destination.description || 'Keine Beschreibung verfügbar.'}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            {destination.avgPricePerPerson > 0 && (
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EuroIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    €{destination.avgPricePerPerson}/Person (Durchschnitt)
                  </Typography>
                </Box>
              </Grid>
            )}
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2">
                  Popularität: {destination.popularityScore || 0}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {destination.coordinates && (destination.coordinates.lat || destination.coordinates.lng) && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Koordinaten: {destination.coordinates.lat}, {destination.coordinates.lng}
            </Typography>
          )}

          {destination.tags && destination.tags.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Tags</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {destination.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" color="primary" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleAddToGroup(destination)} variant="outlined">
            Zur Gruppe hinzufügen
          </Button>
          <Button onClick={onClose} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Filter und Suche */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Reiseziele finden
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Nach Reisezielen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Land</InputLabel>
              <Select
                value={filters.country}
                label="Land"
                onChange={(e) => handleFilterChange('country', e.target.value)}
              >
                <MenuItem value="">Alle Länder</MenuItem>
                <MenuItem value="Deutschland">Deutschland</MenuItem>
                <MenuItem value="Österreich">Österreich</MenuItem>
                <MenuItem value="Schweiz">Schweiz</MenuItem>
                <MenuItem value="Italien">Italien</MenuItem>
                <MenuItem value="Frankreich">Frankreich</MenuItem>
                <MenuItem value="Spanien">Spanien</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={clearFilters}
              startIcon={<FilterListIcon />}
              sx={{ height: '56px' }}
            >
              Filter zurücksetzen
            </Button>
          </Grid>
        </Grid>

        {/* Preis Filter */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Min. Preis (€)"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Max. Preis (€)"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Tags */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Tags auswählen:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                clickable
                color={filters.tags.includes(tag) ? 'primary' : 'default'}
                onClick={() => handleTagToggle(tag)}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Fehleranzeige */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Reiseziele Grid */}
      <Grid container spacing={3}>
        {loading ? (
          // Loading Skeletons
          Array.from(new Array(6)).map((_, index) => (
            <LoadingSkeleton key={index} />
          ))
        ) : destinations.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Keine Reiseziele gefunden
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Versuchen Sie andere Suchkriterien oder Filter.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          destinations.map((destination) => (
            <Grid item xs={12} sm={6} md={4} key={destination._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {destination.images && destination.images.length > 0 && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={destination.images[0]}
                    alt={destination.name}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {destination.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon sx={{ fontSize: 'small', mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {destination.city ? `${destination.city}, ` : ''}{destination.country}
                    </Typography>
                  </Box>

                  {destination.avgPricePerPerson > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EuroIcon sx={{ fontSize: 'small', mr: 0.5, color: 'primary.main' }} />
                      <Typography variant="body2" color="primary.main" fontWeight="medium">
                        €{destination.avgPricePerPerson}/Person
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {destination.description 
                      ? destination.description.length > 100
                        ? `${destination.description.substring(0, 100)}...`
                        : destination.description
                      : 'Keine Beschreibung verfügbar.'
                    }
                  </Typography>

                  {destination.tags && destination.tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {destination.tags.slice(0, 3).map((tag, index) => (
                        <Chip key={index} label={tag} size="small" />
                      ))}
                      {destination.tags.length > 3 && (
                        <Chip 
                          label={`+${destination.tags.length - 3}`} 
                          size="small" 
                          variant="outlined" 
                        />
                      )}
                    </Box>
                  )}

                  {destination.popularityScore > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon sx={{ fontSize: 'small', mr: 0.5, color: 'success.main' }} />
                      <Typography variant="caption" color="success.main">
                        Popularität: {destination.popularityScore}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button 
                    size="small"
                    onClick={() => setSelectedDestination(destination)}
                  >
                    Details anzeigen
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<AddToGroupIcon />}
                    onClick={() => handleAddToGroup(destination)}
                  >
                    Hinzufügen
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Detail Dialog */}
      <DestinationDetailDialog
        destination={selectedDestination}
        open={!!selectedDestination}
        onClose={() => setSelectedDestination(null)}
      />
    </Container>
  );
};

export default Destinations;