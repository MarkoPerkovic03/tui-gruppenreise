import axios from 'axios';

// Basis-URL für die API
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
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
    return Promise.reject(error);
  }
);

// Response-Interceptor: Automatisch bei 401/403 zur Login-Seite weiterleiten
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Token ist ungültig oder abgelaufen
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Löse ein Storage-Event aus, damit App.jsx darauf reagieren kann
      window.dispatchEvent(new Event('storage'));
      
      // Nur zur Login-Seite weiterleiten, wenn wir nicht bereits dort sind
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;