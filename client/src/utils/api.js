// client/src/utils/api.js - ERWEITERT mit Invite Endpoints
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
      // Speichere aktuellen Pfad für Redirect nach Login
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/invite/')) {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Nur weiterleiten wenn nicht schon auf Login-Seite oder Invite-Seite
      if (!currentPath.includes('/login') && !currentPath.includes('/invite/')) {
        window.location.href = '/login';
      }
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

// ===== NEUE INVITE API METHODS =====

// Generate invite link for a group
api.generateInviteLink = async (groupId, expiresInDays = 7) => {
  try {
    const response = await api.post('/invites/generate', {
      groupId,
      expiresInDays
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get invite details by token (public endpoint)
api.getInviteDetails = async (token) => {
  try {
    // Verwende direkten fetch für öffentlichen Endpoint
    const response = await fetch(`http://localhost:3001/api/invites/${token}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Laden der Einladung');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Join group via invite token
api.joinGroupViaInvite = async (token) => {
  try {
    const response = await api.post(`/invites/${token}/join`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get current invite link for a group
api.getCurrentInviteLink = async (groupId) => {
  try {
    const response = await api.get(`/invites/group/${groupId}/current`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Revoke invite link
api.revokeInviteLink = async (groupId) => {
  try {
    const response = await api.delete(`/invites/${groupId}/revoke`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ===== ERWEITERTE LOGIN FUNKTION für Redirect-Handling =====
const originalLogin = api.post;
api.login = async (email, password) => {
  try {
    const response = await originalLogin('/auth/login', { email, password });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Prüfe auf gespeicherten Redirect-Pfad
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectPath;
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

// ===== ERWEITERTE REGISTER FUNKTION für Redirect-Handling =====
api.register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Prüfe auf gespeicherten Redirect-Pfad
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectPath;
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

export default api;