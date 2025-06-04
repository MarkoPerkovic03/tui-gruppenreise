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
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import deLocale from 'date-fns/locale/de';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [travelPeriod, setTravelPeriod] = useState({
    start: null,
    end: null
  });
  const [preferences, setPreferences] = useState({
    budget: [0, 5000],
    travelType: [],
    activities: []
  });
  const [inviteEmails, setInviteEmails] = useState('');
  const [emailList, setEmailList] = useState([]);
  const [error, setError] = useState('');

  const steps = ['Gruppendetails', 'Präferenzen', 'Mitglieder einladen'];

  const travelTypes = [
    'Strandurlaub',
    'Städtereise',
    'Wanderurlaub',
    'Kulturreise',
    'Abenteuerreise'
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
    if (emailList.length < 1) {
      setError('Bitte laden Sie mindestens einen weiteren Teilnehmer ein');
      return;
    }
    try {
      const response = await api.post('/groups', {
        name: groupName,
        description,
        maxParticipants,
        travelDateFrom: travelPeriod.start,
        travelDateTo: travelPeriod.end,
        preferences: preferences.travelType,
        budgetMin: preferences.budget[0],
        budgetMax: preferences.budget[1]
      });
      navigate(`/group/${response.data.id}`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Gruppe:', error);
      setError('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
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
          <Typography variant="h4" sx={{ mb: 2 }}>
            Neue Reisegruppe erstellen
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Erstellen Sie eine neue Gruppe und laden Sie Ihre Reisebegleiter ein
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 800, mx: 'auto', px: 3 }}>
        <Paper sx={{ p: 4, mb: 4 }}>
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
            {activeStep === 0 ? (
              <>
                <TextField
                  fullWidth
                  label="Gruppenname"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={4}
                  placeholder="Beschreiben Sie den Zweck der Gruppe und mögliche Reiseziele..."
                  sx={{ mb: 3 }}
                />

                <TextField
                  type="number"
                  fullWidth
                  label="Maximale Teilnehmeranzahl"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Math.max(2, parseInt(e.target.value)))}
                  inputProps={{ min: 2 }}
                  required
                  sx={{ mb: 3 }}
                />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Reisezeitraum
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <DatePicker
                      label="Von"
                      value={travelPeriod.start}
                      onChange={(date) => setTravelPeriod(prev => ({ ...prev, start: date }))}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minDate={new Date()}
                    />
                    <DatePicker
                      label="Bis"
                      value={travelPeriod.end}
                      onChange={(date) => setTravelPeriod(prev => ({ ...prev, end: date }))}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minDate={travelPeriod.start || new Date()}
                    />
                  </Stack>
                </Box>
              </>
            ) : activeStep === 1 ? (
              <>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Budget pro Person (€)
                  </Typography>
                  <Slider
                    value={preferences.budget}
                    onChange={(_, value) => handlePreferenceChange('budget', value)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={10000}
                    step={100}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {`${preferences.budget[0]}€ - ${preferences.budget[1]}€`}
                  </Typography>
                </Box>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Reisearten</InputLabel>
                  <Select
                    multiple
                    value={preferences.travelType}
                    onChange={(e) => handlePreferenceChange('travelType', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
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

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Aktivitäten</InputLabel>
                  <Select
                    multiple
                    value={preferences.activities}
                    onChange={(e) => handlePreferenceChange('activities', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
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
              </>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="E-Mail-Adressen der Teilnehmer"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="E-Mail eingeben und Enter drücken"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                  />
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
                  {emailList.map((email, index) => (
                    <Chip
                      key={index}
                      label={email}
                      onDelete={() => handleRemoveEmail(email)}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Stack>

                {emailList.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Fügen Sie mindestens eine E-Mail-Adresse hinzu
                  </Typography>
                )}
              </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                onClick={() => navigate('/')}
                startIcon={<ArrowBackIcon />}
                sx={{ mr: 1 }}
              >
                Abbrechen
              </Button>
              <Box>
                {activeStep > 0 && (
                  <Button
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Zurück
                  </Button>
                )}
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<GroupAddIcon />}
                    disabled={emailList.length === 0}
                  >
                    Gruppe erstellen
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={<ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />}
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