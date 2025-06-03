import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import GroupList from './components/GroupList';
import CreateGroup from './components/CreateGroup';
import GroupDetail from './components/GroupDetail';
import Login from './components/Login';
import FlightIcon from '@mui/icons-material/Flight';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState, useEffect, createContext, useContext } from 'react';

// Context für Authentifizierung
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#0057B8',
      dark: '#004494',
    },
    secondary: {
      main: '#DC0032',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          padding: '10px 20px',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const authValue = {
    isAuthenticated,
    user,
    setIsAuthenticated,
    setUser,
    logout: handleLogout
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <Typography>Lädt...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box className="app-container">
            <AppBar position="static" elevation={0}>
              <Toolbar sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <FlightIcon sx={{ mr: 2 }} />
                <Typography 
                  variant="h6" 
                  component={isAuthenticated ? Link : 'div'} 
                  to={isAuthenticated ? "/" : undefined}
                  sx={{ 
                    flexGrow: 1, 
                    textDecoration: 'none', 
                    color: 'white',
                    cursor: isAuthenticated ? 'pointer' : 'default'
                  }}
                >
                  TUI Gruppenreisen
                </Typography>
                {isAuthenticated ? (
                  <>
                    <Button
                      component={Link}
                      to="/"
                      startIcon={<HomeIcon />}
                      color="inherit"
                      sx={{ mr: 2 }}
                    >
                      Startseite
                    </Button>
                    <Button
                      onClick={handleLogout}
                      startIcon={<LogoutIcon />}
                      color="inherit"
                    >
                      Abmelden
                    </Button>
                  </>
                ) : null}
              </Toolbar>
            </AppBar>

            <Box component="main" className="main-content">
              <Container>
                <Routes>
                  <Route 
                    path="/login" 
                    element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} 
                  />
                  <Route
                    path="/"
                    element={isAuthenticated ? <GroupList /> : <Navigate to="/login" replace />}
                  />
                  <Route
                    path="/create-group"
                    element={isAuthenticated ? <CreateGroup /> : <Navigate to="/login" replace />}
                  />
                  <Route
                    path="/group/:id"
                    element={isAuthenticated ? <GroupDetail /> : <Navigate to="/login" replace />}
                  />
                  <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
                </Routes>
              </Container>
            </Box>

            <Box component="footer" className="footer">
              <Container>
                <Typography variant="body2" align="center" color="white">
                  © {new Date().getFullYear()} TUI Group | Alle Rechte vorbehalten
                </Typography>
              </Container>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

export default App;