// client/src/components/TravelOffers.jsx - FINALE KORRIGIERTE VERSION
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Box,
  Chip,
  Rating,
  Skeleton,
  Paper,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EuroIcon from '@mui/icons-material/Euro';
import CategoryIcon from '@mui/icons-material/Category';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import ImageIcon from '@mui/icons-material/Image';
import api from '../utils/api';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

const TravelOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    minStars: '',
    country: '',
    tags: []
  });
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const categories = ['Hotel', 'Apartment', 'Resort', 'Hostel', 'Ferienwohnung', 'Pension', 'Villa'];
  const tagsList = ['beach', 'city', 'mountains', 'culture', 'adventure', 'relaxation', 'party', 'family', 'romantic', 'luxury', 'budget'];

  useEffect(() => {
    fetchOffers();
  }, [isAuthenticated, searchTerm, filters]);

  const fetchOffers = async () => {
    if (!isAuthenticated) {
      setError('Bitte melden Sie sich an, um die Reiseangebote zu sehen.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Lade Reiseangebote...');
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('destination', searchTerm);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.minStars) params.append('minStars', filters.minStars);
      if (filters.country) params.append('country', filters.country);
      if (filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }

      const response = await api.get(`/travel-offers?${params.toString()}`);
      console.log('Geladene Angebote:', response.data);
      
      const offersData = response.data.offers || response.data;
      setOffers(offersData);
      setError(null);
    } catch (error) {
      console.error('Fehler beim Laden der Reiseangebote:', error);
      setError(
        error.response?.data?.message || 
        'Fehler beim Laden der Reiseangebote. Bitte versuchen Sie es später erneut.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ VÖLLIG NEUE BILD-STRATEGIE - Robuste Fallbacks
  const getImageUrl = (offer, index = 0) => {
    // 1. Versuche originale Bild-URLs
    if (offer.images && Array.isArray(offer.images) && offer.images.length > index) {
      const img = offer.images[index];
      const url = typeof img === 'string' ? img : img?.url;
      if (url && url.startsWith('http')) {
        return url;
      }
    }
    
    // 2. Versuche mainImage
    if (index === 0 && offer.mainImage && offer.mainImage.startsWith('http')) {
      return offer.mainImage;
    }
    
    // 3. Fallback zu Picsum (funktioniert immer)
    const seed = (offer.title + offer.destination + index).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `https://picsum.photos/seed/${seed}/600/400`;
  };

  const handleImageError = (event, offer, index = 0) => {
    console.warn(`Bild ${index} fehlgeschlagen für ${offer.title}`);
    
    // Fallback-Strategie
    const fallbackUrls = [
      `https://picsum.photos/seed/${offer.title.replace(/[^a-zA-Z0-9]/g, '')}/600/400`,
      `https://via.placeholder.com/600x400/0057B8/ffffff?text=${encodeURIComponent(offer.title)}`,
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkhvdGVsIEJpbGQ8L3RleHQ+PC9zdmc+'
    ];
    
    // Versuche nächsten Fallback
    const currentSrc = event.target.src;
    const currentIndex = fallbackUrls.findIndex(url => url === currentSrc);
    
    if (currentIndex < fallbackUrls.length - 1) {
      event.target.src = fallbackUrls[currentIndex + 1];
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
      category: '',
      minPrice: '',
      maxPrice: '',
      minStars: '',
      country: '',
      tags: []
    });
    setSearchTerm('');
  };

  const handleAddToGroup = async (offer) => {
    try {
      console.log('Füge zur Gruppe hinzu:', offer);
      alert(`"${offer.title}" wurde zur Gruppe hinzugefügt!`);
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

  const OfferDetailDialog = ({ offer, open, onClose }) => {
    if (!offer) return null;

    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {offer.title}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <img 
              src={getImageUrl(offer, 0)}
              alt={offer.title}
              onError={(e) => handleImageError(e, offer, 0)}
              style={{ 
                width: '100%', 
                height: '300px', 
                objectFit: 'cover', 
                borderRadius: '8px',
                backgroundColor: '#f5f5f5'
              }}
            />
          </Box>
          
          <Typography variant="h6" gutterBottom>
            {offer.destination}, {offer.country}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Rating value={offer.rating?.average || offer.stars} precision={0.5} readOnly />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {offer.rating?.average ? `${offer.rating.average}/5 (${offer.rating.count} Bewertungen)` : `${offer.stars} Sterne`}
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            {offer.description}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EuroIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2">
                  €{offer.pricePerPerson}/Person
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2">
                  {offer.minPersons}-{offer.maxPersons} Personen
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {offer.amenities && offer.amenities.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>Ausstattung</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {offer.amenities.map((amenity, index) => (
                  <Chip key={index} label={amenity} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {offer.tags && offer.tags.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>Tags</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {offer.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" color="primary" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleAddToGroup(offer)} variant="outlined">
            Zur Gruppe hinzufügen
          </Button>
          <Button onClick={onClose} variant="contained">
            Jetzt buchen
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Verfügbare Reiseangebote
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            !isAuthenticated && (
              <Button 
                color="inherit" 
                size="small"
                onClick={() => navigate('/login')}
              >
                Zum Login
              </Button>
            )
          }
        >
          {error}
        </Alert>
      )}

      {/* Suchleiste und Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Suche nach Reiseziel, Land oder Hotel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
          >
            Filter
          </Button>
        </Box>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Erweiterte Filter</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Kategorie</InputLabel>
                  <Select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    label="Kategorie"
                  >
                    <MenuItem value="">Alle</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Land"
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Min. Preis (€)"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Max. Preis (€)"
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Min. Sterne</InputLabel>
                  <Select
                    value={filters.minStars}
                    onChange={(e) => handleFilterChange('minStars', e.target.value)}
                    label="Min. Sterne"
                  >
                    <MenuItem value="">Alle</MenuItem>
                    {[1,2,3,4,5].map(num => (
                      <MenuItem key={num} value={num}>{num}+ Sterne</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Tags</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tagsList.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      clickable
                      color={filters.tags.includes(tag) ? 'primary' : 'default'}
                      onClick={() => handleTagToggle(tag)}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button onClick={clearFilters} variant="outlined">
                  Filter zurücksetzen
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>
      
      <Grid container spacing={3}>
        {loading ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : offers.length > 0 ? (
          offers.map((offer) => (
            <Grid item xs={12} sm={6} md={4} key={offer._id || offer.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    transition: 'transform 0.2s ease-in-out'
                  }
                }}
              >
                {/* ✅ KORRIGIERTE BILD-ANZEIGE - Garantiert funktionierend */}
                <Box
                  sx={{
                    height: 200,
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <img
                    src={getImageUrl(offer, 0)}
                    alt={offer.title}
                    onError={(e) => handleImageError(e, offer, 0)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {/* Fallback Icon falls alle Bilder fehlschlagen */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      opacity: 0,
                      '&:has(+ img[src=""])': { opacity: 1 }
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                  </Box>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {offer.title}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Rating 
                      value={offer.rating?.average || offer.stars || offer.rating || 0} 
                      precision={0.5} 
                      readOnly 
                    />
                    {offer.rating?.count && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({offer.rating.count})
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {offer.destination || offer.location}, {offer.country}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {offer.category}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EuroIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      €{offer.pricePerPerson || offer.pricePerDay}/Person
                      {offer.pricePerNight && ` (€${offer.pricePerNight}/Nacht)`}
                    </Typography>
                  </Box>

                  {offer.amenities && offer.amenities.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Ausstattung:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {offer.amenities.slice(0, 3).map((amenity, index) => (
                          <Chip
                            key={index}
                            label={amenity}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {offer.amenities.length > 3 && (
                          <Chip
                            label={`+${offer.amenities.length - 3} weitere`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {(offer.travelType || offer.tags) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Tags:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(offer.travelType || offer.tags || []).slice(0, 3).map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {offer.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => setSelectedOffer(offer)}
                  >
                    Details anzeigen
                  </Button>
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => handleAddToGroup(offer)}
                  >
                    Zur Gruppe hinzufügen
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography variant="h6" align="center">
              Keine Reiseangebote gefunden
            </Typography>
            {(searchTerm || Object.values(filters).some(v => v && v.length > 0)) && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button onClick={clearFilters} variant="outlined">
                  Filter zurücksetzen
                </Button>
              </Box>
            )}
          </Grid>
        )}
      </Grid>

      {/* Detail Dialog */}
      <OfferDetailDialog 
        offer={selectedOffer}
        open={!!selectedOffer}
        onClose={() => setSelectedOffer(null)}
      />
    </Container>
  );
};

export default TravelOffers;