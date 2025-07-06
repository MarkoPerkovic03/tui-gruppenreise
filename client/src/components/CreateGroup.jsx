import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper,
  Chip,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  CircularProgress
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import deLocale from 'date-fns/locale/de';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [travelPeriod, setTravelPeriod] = useState({
    start: null,
    end: null
  });
  const [preferences, setPreferences] = useState({
    budget: [500, 2000],
    travelType: [],
    activities: []
  });
  const [inviteEmails, setInviteEmails] = useState('');
  const [emailList, setEmailList] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = ['Gruppendetails', 'Präferenzen', 'Mitglieder einladen'];

  const travelTypes = [
    'beach',
    'city',
    'adventure', 
    'culture',
    'wellness',
    'family',
    'party',
    'all_inclusive'
  ];

  const activities = [
    'Sightseeing',
    'Shopping',
    'Sport',
    'Entspannung',
    'Nachtleben',
    'Kulinarik'
  ];

  const handleAddEmail = () => {
    const email = inviteEmails.trim();
    if (email && !emailList.includes(email)) {
      if (isValidEmail(email)) {
        setEmailList([...emailList, email]);
        setInviteEmails('');
        setError('');
      } else {
        setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      }
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRemoveEmail = (emailToRemove) => {
    setEmailList(emailList.filter(email => email !== emailToRemove));
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!groupName.trim()) {
        setError('Bitte geben Sie einen Gruppennamen ein');
        return;
      }
      if (!travelPeriod.start || !travelPeriod.end) {
        setError('Bitte geben Sie einen Reisezeitraum ein');
        return;
      }
      if (new Date(travelPeriod.end) <= new Date(travelPeriod.start)) {
        setError('Das Enddatum muss nach dem Startdatum liegen');
        return;
      }
    }
    setError('');
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      setError('Bitte geben Sie einen Gruppennamen ein');
      return;
    }
    
    if (!travelPeriod.start || !travelPeriod.end) {
      setError('Bitte geben Sie einen gültigen Reisezeitraum ein');
      return;
    }
    
    setLoading(true);
    try {
      console.log('🆕 Erstelle Gruppe...');
      
      const groupData = {
        name: groupName.trim(),
        description: description.trim(),
        maxParticipants: Number(maxParticipants),
        travelDateFrom: travelPeriod.start,
        travelDateTo: travelPeriod.end,
        preferences: preferences.travelType,
        budgetMin: preferences.budget[0],
        budgetMax: preferences.budget[1]
      };
      
      console.log('📤 Sende Gruppendaten:', groupData);
      
      const response = await api.post('/groups', groupData);
      console.log('✅ Gruppe erstellt:', response.data);
      
      // Navigation zur erstellten Gruppe
      const groupId = response.data._id || response.data.id;
      if (groupId) {
        navigate(`/groups/${groupId}`);
      } else {
        console.error('❌ Keine Gruppen-ID in Response:', response.data);
        navigate('/groups');
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Gruppe:', error);
      setError(
        error.response?.data?.message || 
        'Es ist ein Fehler beim Erstellen der Gruppe aufgetreten. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={deLocale}>
      <Box className="page-header">
        <Box sx={{ maxWidth: 800, mx: 'auto', px: 3 }}>
          <Typography variant="h4" sx={{ mb: 2, color: 'white' }}>
            Neue Reisegruppe erstellen
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Erstellen Sie eine neue Gruppe und planen Sie gemeinsam Ihre nächste Reise
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 800, mx: 'auto', px: 3, py: 3 }}>
        <Paper sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Schritt 1: Gruppendetails */}
            {activeStep === 0 && (
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Gruppenname *"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="z.B. Mallorca 2025"
                  required
                />
                
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Beschreiben Sie kurz das Ziel und die Art der Reise..."
                />

                <TextField
                  type="number"
                  fullWidth
                  label="Maximale Teilnehmeranzahl *"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Math.max(2, Math.min(50, parseInt(e.target.value) || 2)))}
                  inputProps={{ min: 2, max: 50 }}
                  helperText="Zwischen 2 und 50 Personen"
                  required
                />

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Reisezeitraum *
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <DatePicker
                      label="Reisebeginn"
                      value={travelPeriod.start}
                      onChange={(date) => setTravelPeriod(prev => ({ ...prev, start: date }))}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minDate={new Date()}
                    />
                    <DatePicker
                      label="Reiseende"
                      value={travelPeriod.end}
                      onChange={(date) => setTravelPeriod(prev => ({ ...prev, end: date }))}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minDate={travelPeriod.start || new Date()}
                    />
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* Schritt 2: Präferenzen */}
            {activeStep === 1 && (
              <Stack spacing={4}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Budget pro Person (€)
                  </Typography>
                  <Slider
                    value={preferences.budget}
                    onChange={(_, value) => handlePreferenceChange('budget', value)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={5000}
                    step={50}
                    marks={[
                      { value: 0, label: '0€' },
                      { value: 1000, label: '1.000€' },
                      { value: 2500, label: '2.500€' },
                      { value: 5000, label: '5.000€+' }
                    ]}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {`${preferences.budget[0]}€ - ${preferences.budget[1]}€ pro Person`}
                  </Typography>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Reisearten</InputLabel>
                  <Select
                    multiple
                    value={preferences.travelType}
                    onChange={(e) => handlePreferenceChange('travelType', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {travelTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Gewünschte Aktivitäten</InputLabel>
                  <Select
                    multiple
                    value={preferences.activities}
                    onChange={(e) => handlePreferenceChange('activities', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {activities.map((activity) => (
                      <MenuItem key={activity} value={activity}>
                        {activity}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            {/* Schritt 3: Mitglieder einladen */}
            {activeStep === 2 && (
              <Stack spacing={3}>
                <Typography variant="h6" gutterBottom>
                  Mitglieder einladen (Optional)
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Sie können auch nach der Gruppenerstellung weitere Mitglieder einladen.
                </Typography>

                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="E-Mail-Adresse"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="name@example.com"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEmail();
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddEmail}
                      disabled={!inviteEmails.trim()}
                    >
                      Hinzufügen
                    </Button>
                  </Stack>

                  {emailList.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Eingeladene Mitglieder ({emailList.length}):
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {emailList.map((email, index) => (
                          <Chip
                            key={index}
                            label={email}
                            onDelete={() => handleRemoveEmail(email)}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {emailList.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Keine Mitglieder hinzugefügt. Sie können die Gruppe auch ohne Einladungen erstellen.
                    </Typography>
                  )}
                </Box>

                {/* Zusammenfassung */}
                <Box sx={{ mt: 4, p: 3, backgroundColor: 'rgba(0, 87, 184, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Zusammenfassung
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="primary">Gruppenname:</Typography>
                      <Typography variant="body1">{groupName}</Typography>
                    </Box>
                    
                    {description && (
                      <Box>
                        <Typography variant="subtitle2" color="primary">Beschreibung:</Typography>
                        <Typography variant="body1">{description}</Typography>
                      </Box>
                    )}
                    
                    <Box>
                      <Typography variant="subtitle2" color="primary">Teilnehmer:</Typography>
                      <Typography variant="body1">Maximal {maxParticipants} Personen</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="primary">Reisezeitraum:</Typography>
                      <Typography variant="body1">
                        {travelPeriod.start && travelPeriod.end ? 
                          `${travelPeriod.start.toLocaleDateString('de-DE')} - ${travelPeriod.end.toLocaleDateString('de-DE')}` :
                          'Nicht gesetzt'
                        }
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="primary">Budget:</Typography>
                      <Typography variant="body1">
                        {preferences.budget[0]}€ - {preferences.budget[1]}€ pro Person
                      </Typography>
                    </Box>
                    
                    {preferences.travelType.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="primary">Reisearten:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                          {preferences.travelType.map((type) => (
                            <Chip key={type} label={type} size="small" color="primary" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {preferences.activities.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="primary">Aktivitäten:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                          {preferences.activities.map((activity) => (
                            <Chip key={activity} label={activity} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {emailList.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="primary">Eingeladene Mitglieder:</Typography>
                        <Typography variant="body1">{emailList.length} Person{emailList.length !== 1 ? 'en' : ''}</Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Button
                onClick={() => navigate('/groups')}
                startIcon={<ArrowBackIcon />}
                disabled={loading}
              >
                Abbrechen
              </Button>
              
              <Box>
                {activeStep > 0 && (
                  <Button
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Zurück
                  </Button>
                )}
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <GroupAddIcon />}
                    disabled={loading}
                    size="large"
                  >
                    {loading ? 'Erstelle Gruppe...' : 'Gruppe erstellen'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={loading}
                    size="large"
                  >
                    Weiter
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default CreateGroup;