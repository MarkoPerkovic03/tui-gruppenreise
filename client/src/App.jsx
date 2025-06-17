import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import GroupList from './components/GroupList';
import CreateGroup from './components/CreateGroup';
import GroupDetail from './components/GroupDetail';
import Login from './components/Login';
import TravelOffers from './components/TravelOffers';
import UserProfile from './components/UserProfile';
import FlightIcon from '@mui/icons-material/Flight';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import HotelIcon from '@mui/icons-material/Hotel';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useState, useEffect, createContext, useContext } from 'react';
import AdminDashboard from './components/AdminDashboard';
import AdminTravelOffers from './components/AdminTravelOffers'; 

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

// Geschützte Route Komponente
const PrivateRoute = ({ children, requiresAdmin = false }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiresAdmin && !user?.isSystemAdmin) {
    return <Navigate to="/groups" replace />;
  }

  return children;
};

// Login Route Komponente
const LoginRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/groups';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Fehler beim Laden der Benutzerdaten:', error);
          handleLogout();
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Event-Listener für Storage-Änderungen
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
                  component={Link} 
                  to="/" 
                  sx={{ 
                    flexGrow: 1, 
                    textDecoration: 'none', 
                    color: 'white' 
                  }}
                >
                  TUI Gruppenreisen
                </Typography>
                {isAuthenticated && (
                  <>
                    <Button
                      component={Link}
                      to="/groups"
                      startIcon={<HomeIcon />}
                      color="inherit"
                      sx={{ mr: 2 }}
                    >
                      Startseite
                    </Button>
                    <Button
                      component={Link}
                      to="/travel-offers"
                      startIcon={<BeachAccessIcon />}
                      color="inherit"
                      sx={{ mr: 2 }}
                    >
                      Reiseangebote
                    </Button>
                    <Button
                      component={Link}
                      to="/profile"
                      startIcon={<AccountCircleIcon />}
                      color="inherit"
                      sx={{ mr: 2 }}
                    >
                      Mein Profil
                    </Button>
                    {/* Admin-Buttons nur für Admins anzeigen */}
                    {user?.isSystemAdmin && (
                      <>
                        <Button
                          component={Link}
                          to="/admin/travel-offers"
                          startIcon={<HotelIcon />}
                          color="inherit"
                          sx={{ mr: 2 }}
                        >
                          Angebote verwalten
                        </Button>
                        <Button
                          component={Link}
                          to="/admin/dashboard"
                          color="inherit"
                          sx={{ mr: 2 }}
                        >
                          Admin Dashboard
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={handleLogout}
                      color="inherit"
                      startIcon={<LogoutIcon />}
                      component={Link}
                      to="/login"
                    >
                      Abmelden
                    </Button>
                  </>
                )}
              </Toolbar>
            </AppBar>

            <Box component="main" className="main-content">
              <Routes>
                <Route 
                  path="/login" 
                  element={
                    <LoginRoute>
                      <Login />
                    </LoginRoute>
                  } 
                />
                <Route
                  path="/groups"
                  element={
                    <PrivateRoute>
                      <GroupList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/groups/create"
                  element={
                    <PrivateRoute>
                      <CreateGroup />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/groups/:id"
                  element={
                    <PrivateRoute>
                      <GroupDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/travel-offers"
                  element={
                    <PrivateRoute>
                      <TravelOffers />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <UserProfile />
                    </PrivateRoute>
                  }
                />
                {/* Admin-Routes */}
                <Route
                  path="/admin/travel-offers"
                  element={
                    <PrivateRoute requiresAdmin={true}>
                      <AdminTravelOffers />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <PrivateRoute requiresAdmin={true}>
                      <AdminDashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <Navigate to="/groups" replace />
                  }
                />
              </Routes>
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