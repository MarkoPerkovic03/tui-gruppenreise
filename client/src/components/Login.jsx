// client/src/components/Login.jsx - KORRIGIERTE VERSION ohne automatisches Beitreten
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
import api from '../services/api';
import { useAuth } from '../App';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsAuthenticated, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (activeTab === 1 && !name) {
      errors.name = 'Name ist erforderlich';
    }
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

  const handleRedirectAfterAuth = () => {
    // ✅ KORRIGIERT: INVITE-REDIRECT LOGIC - Nur zur Einladungsseite, KEIN automatisches Beitreten
    const inviteUrl = localStorage.getItem('inviteReturnUrl');
    if (inviteUrl) {
      localStorage.removeItem('inviteReturnUrl');
      console.log('🔄 Redirect zu Invite URL (OHNE AUTOMATISCHES BEITRETEN):', inviteUrl);
      
      // ✅ WICHTIGE ÄNDERUNG: Verwende navigate() statt window.location.href
      // So bleibt es im React-Router-Kontext und behält den Auth-State
      setTimeout(() => {
        // Extrahiere nur den Pfad-Teil der URL
        try {
          const url = new URL(inviteUrl);
          const invitePath = url.pathname; // z.B. "/invite/abc123"
          console.log('🔄 Navigiere zu Invite-Pfad:', invitePath);
          navigate(invitePath, { replace: true });
        } catch (e) {
          // Fallback: Falls URL-Parsing fehlschlägt, verwende die ganze URL
          const invitePath = inviteUrl.replace(window.location.origin, '');
          console.log('🔄 Fallback-Navigation zu:', invitePath);
          navigate(invitePath, { replace: true });
        }
      }, 100);
      return;
    }

    // ✅ STANDARD-REDIRECT LOGIC für normale Navigation
    const redirectPath = localStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      localStorage.removeItem('redirectAfterLogin');
      console.log('🔄 Redirect zu gespeichertem Pfad:', redirectPath);
      navigate(redirectPath, { replace: true });
      return;
    }

    // ✅ FALLBACK-REDIRECT
    const from = location.state?.from?.pathname || '/groups';
    console.log('🔄 Standard-Redirect zu:', from);
    navigate(from, { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      console.log('🔐 Versuche Login für:', email);
      
      const response = await api.post('/auth/login', { email, password });
      
      console.log('✅ Login erfolgreich:', response.data.user.email);
      
      // Speichere Token und User
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Update Auth Context
      setUser(response.data.user);
      setIsAuthenticated(true);

      console.log('🔄 Auth Context aktualisiert, starte Redirect...');
      
      // ✅ KORRIGIERTE Redirect Logic - Kein automatisches Beitreten
      handleRedirectAfterAuth();

    } catch (error) {
      console.error('❌ Login-Fehler:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === 'ECONNREFUSED') {
        setError('Verbindung zum Server fehlgeschlagen. Ist das Backend gestartet?');
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
      console.log('📝 Versuche Registrierung für:', email);
      
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        isSystemAdmin
      });
      
      console.log('✅ Registrierung erfolgreich:', response.data.user.email);
      
      // Speichere Token und User
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Update Auth Context
      setUser(response.data.user);
      setIsAuthenticated(true);

      console.log('🔄 Auth Context aktualisiert, starte Redirect...');
      
      // ✅ KORRIGIERTE Redirect Logic - Kein automatisches Beitreten
      handleRedirectAfterAuth();

    } catch (error) {
      console.error('❌ Registrierungsfehler:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === 'ECONNREFUSED') {
        setError('Verbindung zum Server fehlgeschlagen. Ist das Backend gestartet?');
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setValidationErrors({});
  };

  // Debug Info (nur in Development)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Login Component Debug Info:', {
        currentUrl: window.location.href,
        inviteReturnUrl: localStorage.getItem('inviteReturnUrl'),
        redirectAfterLogin: localStorage.getItem('redirectAfterLogin'),
        locationState: location.state
      });
    }
  }, [location]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        py: 4
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          TUI Gruppenreisen
        </Typography>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
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

        {/* Debug Info für Invite-Redirects (nur in Development) */}
        {process.env.NODE_ENV === 'development' && localStorage.getItem('inviteReturnUrl') && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              🔄 Nach Login Redirect zu Einladung
            </Typography>
          </Alert>
        )}

        <form onSubmit={activeTab === 0 ? handleLogin : handleRegister}>
          {activeTab === 1 && (
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setValidationErrors(prev => ({ ...prev, name: '' }));
              }}
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              required
              sx={{ mb: 2 }}
              disabled={isLoading}
            />
          )}

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
            disabled={isLoading}
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
            disabled={isLoading}
          />

          {activeTab === 1 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={isSystemAdmin}
                  onChange={(e) => setIsSystemAdmin(e.target.checked)}
                  disabled={isLoading}
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
              '&:hover': { backgroundColor: '#004494' },
              mb: 2
            }}
          >
            {isLoading ? (
              <Box display="flex" alignItems="center">
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                {activeTab === 0 ? 'Anmeldung...' : 'Registrierung...'}
              </Box>
            ) : (
              activeTab === 0 ? 'Anmelden' : 'Registrieren'
            )}
          </Button>
        </form>

        {/* Navigation Hilfe */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            {activeTab === 0 
              ? 'Noch kein Konto? Wechseln Sie zum "Registrieren" Tab.'
              : 'Bereits registriert? Wechseln Sie zum "Anmelden" Tab.'
            }
          </Typography>
        </Box>

        {/* Test-Accounts Hinweis (nur in Development) */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0, 87, 184, 0.05)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Test-Accounts:<br />
              Admin: admin@tui.com / admin123<br />
              Demo: demo@tui.com / demo123
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Login;
