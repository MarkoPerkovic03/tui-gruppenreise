// client/src/utils/api.js - KORRIGIERTE VERSION mit Debug-Logging
import axios from 'axios';

// Basis-URL für die API
const api = axios.create({
   baseURL: '/api',
  withCredentials: false,
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
    // Debug-Logging für alle Requests
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('Request-Fehler:', error);
    return Promise.reject(error);
  }
);

// Response-Interceptor: Automatisch bei 401/403 zur Login-Seite weiterleiten
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status || 'Network'} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/invite/')) {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      if (!currentPath.includes('/login') && !currentPath.includes('/invite/')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===== KORRIGIERTE INVITE API METHODS =====

// Generate invite link for a group
api.generateInviteLink = async (groupId, expiresInDays = 7) => {
  try {
    console.log('🔗 Generiere Einladungslink:', { groupId, expiresInDays });
    const response = await api.post('/invites/generate', {
      groupId,
      expiresInDays
    });
    return response.data;
  } catch (error) {
    console.error('❌ Fehler beim Generieren des Einladungslinks:', error);
    throw error;
  }
};

// ✅ KORRIGIERT: Get invite details by token (public endpoint)
api.getInviteDetails = async (token) => {
  try {
    console.log('🔍 Lade Einladungsdetails für Token:', token);
    
    // ✅ FIX: Verwende axios-Instance statt fetch für einheitliches Error-Handling
    const response = await api.get(`/invites/${token}`);
    
    console.log('✅ Einladungsdetails geladen:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Fehler beim Laden der Einladungsdetails:', error);
    
    // Besseres Error-Handling mit spezifischen Nachrichten
    if (error.response?.status === 404) {
      throw new Error('Diese Einladung wurde nicht gefunden oder ist abgelaufen.');
    } else if (error.response?.status === 400) {
      throw new Error('Ungültiger Einladungslink.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      throw new Error('Verbindung zum Server fehlgeschlagen. Ist das Backend gestartet?');
    } else {
      throw new Error(`Fehler beim Laden der Einladung: ${error.message}`);
    }
  }
};

// Join group via invite token
api.joinGroupViaInvite = async (token) => {
  try {
    console.log('👥 Trete Gruppe bei via Token:', token);
    const response = await api.post(`/invites/${token}/join`);
    console.log('✅ Erfolgreich der Gruppe beigetreten:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Fehler beim Beitreten der Gruppe:', error);
    throw error;
  }
};

// Get current invite link for a group
api.getCurrentInviteLink = async (groupId) => {
  try {
    console.log('📋 Lade aktuellen Einladungslink für Gruppe:', groupId);
    const response = await api.get(`/invites/group/${groupId}/current`);
    return response.data;
  } catch (error) {
    console.error('❌ Fehler beim Laden des aktuellen Einladungslinks:', error);
    throw error;
  }
};

// Revoke invite link
api.revokeInviteLink = async (groupId) => {
  try {
    console.log('🚫 Widerrufe Einladungslink für Gruppe:', groupId);
    const response = await api.delete(`/invites/${groupId}/revoke`);
    return response.data;
  } catch (error) {
    console.error('❌ Fehler beim Widerrufen des Einladungslinks:', error);
    throw error;
  }
};

// ===== ENHANCED LOGIN FUNKTION für Redirect-Handling =====
const originalPost = api.post;
api.login = async (email, password) => {
  try {
    console.log('🔐 Versuche Login für:', email);
    const response = await originalPost('/auth/login', { email, password });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Prüfe auf gespeicherten Redirect-Pfad
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        console.log('🔄 Redirect nach Login:', redirectPath);
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
    }
    
    return response;
  } catch (error) {
    console.error('❌ Login-Fehler:', error);
    throw error;
  }
};

// ===== ENHANCED REGISTER FUNKTION für Redirect-Handling =====
api.register = async (userData) => {
  try {
    console.log('📝 Versuche Registrierung für:', userData.email);
    const response = await originalPost('/auth/register', userData);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Prüfe auf gespeicherten Redirect-Pfad
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        console.log('🔄 Redirect nach Registrierung:', redirectPath);
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
    }
    
    return response;
  } catch (error) {
    console.error('❌ Registrierungs-Fehler:', error);
    throw error;
  }
};

// ===== DEBUGGING HILFSFUNKTIONEN =====

// Test-Funktion für Backend-Verbindung
api.testConnection = async () => {
  try {
    console.log('🧪 Teste Backend-Verbindung...');
    const response = await api.get('/auth/test');
    console.log('✅ Backend-Verbindung OK:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend-Verbindung fehlgeschlagen:', error);
    return false;
  }
};

// Debug-Info für aktuelle Konfiguration
api.getDebugInfo = () => {
  return {
    baseURL: api.defaults.baseURL,
    hasToken: !!localStorage.getItem('token'),
    currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
    redirectPath: localStorage.getItem('redirectAfterLogin')
  };
};

export default api;