import axios from 'axios';

// Basis-URL für die API
const api = axios.create({
  baseURL: 'http://localhost:3001/api',  // ← /api hinzugefügt!
  withCredentials: false, // CORS-Probleme vermeiden
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request-Interceptor: Token aus localStorage hinzufügen
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request-Fehler:', error);
    return Promise.reject(error);
  }
);

// Response-Interceptor: Automatisch bei 401/403 zur Login-Seite weiterleiten
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server hat mit einem Status-Code geantwortet
      switch (error.response.status) {
        case 401:
          // Nicht authentifiziert
          handleAuthError();
          break;
        case 403:
          // Keine Berechtigung
          handleAuthError();
          break;
        case 404:
          console.error('Ressource nicht gefunden:', error.config.url);
          break;
        case 500:
          console.error('Server-Fehler:', error.response.data);
          break;
        default:
          console.error('API-Fehler:', error.response.data);
      }
    } else if (error.request) {
      // Anfrage wurde gesendet, aber keine Antwort erhalten
      console.error('Keine Antwort vom Server:', error.request);
    } else {
      // Fehler bei der Anfrage-Konfiguration
      console.error('Anfrage-Fehler:', error.message);
    }
    return Promise.reject(error);
  }
);

// Hilfsfunktion für die Behandlung von Authentifizierungsfehlern
const handleAuthError = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Löse ein Storage-Event aus, damit App.jsx darauf reagieren kann
  window.dispatchEvent(new Event('storage'));
  
  // Nur zur Login-Seite weiterleiten, wenn wir nicht bereits dort sind
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

export default api;