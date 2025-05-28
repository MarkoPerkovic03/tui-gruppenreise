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
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [emailList, setEmailList] = useState([]);
  const [error, setError] = useState('');

  const steps = ['Gruppendetails', 'Mitglieder einladen'];

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
    if (activeStep === 0 && !groupName.trim()) {
      setError('Bitte geben Sie einen Gruppennamen ein');
      return;
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
    try {
      const response = await axios.post('/api/groups', {
        name: groupName,
        description,
        members: emailList
      });
      navigate(`/group/${response.data.id}`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Gruppe:', error);
      setError('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <>
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
                    endIcon={<AddIcon />}
                  >
                    Weiter
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
    </>
  );
};

export default CreateGroup; 