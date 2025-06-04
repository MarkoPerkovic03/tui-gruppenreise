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
  Tab,
  CircularProgress
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
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!email) {
      errors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Ungültige E-Mail-Adresse';
    }
    if (!password) {
      errors.password = 'Passwort ist erforderlich';
    } else if (password.length < 6) {
      errors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      const from = location.state?.from?.pathname || '/groups';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login-Fehler:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        isSystemAdmin
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      const from = location.state?.from?.pathname || '/groups';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Registrierungsfehler:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
    } finally {
      setIsLoading(false);
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
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            setError('');
            setValidationErrors({});
          }}
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
            onChange={(e) => {
              setEmail(e.target.value);
              setValidationErrors(prev => ({ ...prev, email: '' }));
            }}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Passwort"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationErrors(prev => ({ ...prev, password: '' }));
            }}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
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
            disabled={isLoading}
            sx={{
              backgroundColor: '#0057B8',
              '&:hover': { backgroundColor: '#004494' }
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              activeTab === 0 ? 'Anmelden' : 'Registrieren'
            )}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;