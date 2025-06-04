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
  Rating,
  Skeleton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Alert
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EuroIcon from '@mui/icons-material/Euro';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import CategoryIcon from '@mui/icons-material/Category';
import api from '../utils/api';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

const TravelOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOffers = async () => {
      if (!isAuthenticated) {
        setError('Bitte melden Sie sich an, um die Reiseangebote zu sehen.');
        setLoading(false);
        return;
      }

      try {
        console.log('Lade Reiseangebote...');
        const response = await api.get('/api/travel-offers');
        console.log('Geladene Angebote:', response.data);
        setOffers(response.data);
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

    fetchOffers();
  }, [isAuthenticated]);

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
      
      <Grid container spacing={3}>
        {loading ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : offers.length > 0 ? (
          offers.map((offer) => (
            <Grid item xs={12} sm={6} md={4} key={offer.id}>
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
                <CardMedia
                  component="img"
                  height="200"
                  image={offer.image}
                  alt={offer.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {offer.title}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Rating value={offer.rating} precision={0.5} readOnly />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {offer.location}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {offer.duration} Tage
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EuroIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      {offer.pricePerDay}€ pro Person/Tag
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        Reisearten:
                      </Typography>
                    </Box>
                    <Box sx={{ pl: 4 }}>
                      {offer.travelType.map((type) => (
                        <Chip
                          key={type}
                          label={type}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DirectionsWalkIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        Aktivitäten:
                      </Typography>
                    </Box>
                    <List dense sx={{ pl: 4 }}>
                      {offer.activities.map((activity, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemText 
                            primary={activity}
                            primaryTypographyProps={{
                              variant: 'body2',
                              color: 'text.secondary'
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {offer.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    {offer.tags?.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary">
                    Details anzeigen
                  </Button>
                  <Button size="small" color="primary">
                    Zur Gruppe hinzufügen
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography variant="h6" align="center">
              Keine Reiseangebote verfügbar
            </Typography>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default TravelOffers; 