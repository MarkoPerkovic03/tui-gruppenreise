import axios from 'axios';

// Basis-URL für die API
const api = axios.create({
  baseURL: 'http://localhost:3001/api',  // ← Direkte Basis-URL zum Backend-API
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response) {
      // Server hat mit einem Status-Code geantwortet
      switch (error.response.status) {
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

export default api;