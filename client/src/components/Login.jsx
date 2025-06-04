import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../App';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsAuthenticated, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      // Weiterleitung zur vorherigen Seite oder zur Gruppenliste
      const from = location.state?.from?.pathname || '/groups';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login-Fehler:', error);
      setError('Ungültige E-Mail oder Passwort');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        isSystemAdmin
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      // Weiterleitung zur vorherigen Seite oder zur Gruppenliste
      const from = location.state?.from?.pathname || '/groups';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Registrierungsfehler:', error);
      setError('Registrierung fehlgeschlagen. Möglicherweise existiert die E-Mail bereits.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          TUI Gruppenreisen
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Anmelden" />
          <Tab label="Registrieren" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={activeTab === 0 ? handleLogin : handleRegister}>
          <TextField
            fullWidth
            label="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
          />

          {activeTab === 1 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={isSystemAdmin}
                  onChange={(e) => setIsSystemAdmin(e.target.checked)}
                />
              }
              label="Als Systemadministrator registrieren"
              sx={{ mb: 2, display: 'block', textAlign: 'left' }}
            />
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{
              backgroundColor: '#0057B8',
              '&:hover': { backgroundColor: '#004494' }
            }}
          >
            {activeTab === 0 ? 'Anmelden' : 'Registrieren'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;