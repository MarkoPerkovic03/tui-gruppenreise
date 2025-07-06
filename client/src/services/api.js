 // client/src/services/api.js - KOMBINIERTE VERSION mit Axios
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

  // ===== AUTH METHODS =====
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
    
    return response.data;
  } catch (error) {
    console.error('❌ Login-Fehler:', error);
    throw error;
  }
};

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
    
    return response.data;
  } catch (error) {
    console.error('❌ Registrierungs-Fehler:', error);
    throw error;
  }
};

api.logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

api.getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

  // ===== TRAVEL OFFERS METHODS =====
api.getTravelOffers = async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/travel-offers${queryParams ? `?${queryParams}` : ''}`;
  const response = await api.get(endpoint);
    
    // MongoDB Backend gibt { success: true, offers: [...] } zurück
  return response.data.offers || response.data;
};

api.getTravelOffer = async (id) => {
  const response = await api.get(`/travel-offers/${id}`);
  return response.data;
};

api.createTravelOffer = async (offerData) => {
  const response = await api.post('/travel-offers', offerData);
  return response.data.offer || response.data;
};

api.updateTravelOffer = async (id, offerData) => {
  const response = await api.put(`/travel-offers/${id}`, offerData);
  return response.data;
};

api.deleteTravelOffer = async (id) => {
  const response = await api.delete(`/travel-offers/${id}`);
  return response.data;
};

  // ===== GROUPS METHODS =====
api.getGroups = async () => {
  const response = await api.get('/groups');
  return response.data;
};

api.getGroup = async (id) => {
  const response = await api.get(`/groups/${id}`);
  return response.data;
};

api.createGroup = async (groupData) => {
  const response = await api.post('/groups', groupData);
  return response.data;
};

api.updateGroup = async (id, groupData) => {
  const response = await api.put(`/groups/${id}`, groupData);
  return response.data;
};

api.addGroupMember = async (groupId, userEmail) => {
  const response = await api.post(`/groups/${groupId}/members`, { userEmail });
  return response.data;
};

api.leaveGroup = async (groupId) => {
  const response = await api.delete(`/groups/${groupId}/leave`);
  return response.data;
};

  // ===== PROPOSALS METHODS =====
api.getProposals = async (groupId) => {
  const response = await api.get(`/proposals/group/${groupId}`);
  return response.data;
};

api.createProposal = async (proposalData) => {
  const response = await api.post('/proposals', proposalData);
  return response.data;
};

api.voteForProposal = async (proposalId, rank = 1) => {
  const response = await api.post(`/proposals/${proposalId}/vote`, { rank });
  return response.data;
};

api.deleteProposal = async (proposalId) => {
  const response = await api.delete(`/proposals/${proposalId}`);
  return response.data;
};

// ===== PROFILE METHODS =====
api.getProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

api.updateProfile = async (profileData) => {
  const response = await api.put('/profile', profileData);
  return response.data;
};

api.uploadProfileImage = async (imageData) => {
  const response = await api.post('/profile/upload-image', imageData);
  return response.data;
};

api.changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/profile/password', { currentPassword, newPassword });
  return response.data;
};

api.getRecommendations = async () => {
  const response = await api.get('/profile/recommendations');
  return response.data;
};

// ===== INVITE METHODS =====
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

api.getInviteDetails = async (token) => {
  try {
    console.log('🔍 Lade Einladungsdetails für Token:', token);
    
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

  // ===== UTILITY METHODS =====
api.isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

api.getCurrentUserData = () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
};

// ===== DEBUGGING HILFSFUNKTIONEN =====
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

api.getDebugInfo = () => {
  return {
    baseURL: api.defaults.baseURL,
    hasToken: !!localStorage.getItem('token'),
    currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
    redirectPath: localStorage.getItem('redirectAfterLogin')
  };
};

export default api;

// Named Exports für direkten Zugriff
export const {
  login,
  register,
  logout,
  getCurrentUser,
  getTravelOffers,
  getTravelOffer,
  createTravelOffer,
  updateTravelOffer,
  deleteTravelOffer,
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  addGroupMember,
  leaveGroup,
  getProposals,
  createProposal,
  voteForProposal,
  deleteProposal,
  getProfile,
  updateProfile,
  uploadProfileImage,
  changePassword,
  getRecommendations,
  generateInviteLink,
  getInviteDetails,
  joinGroupViaInvite,
  getCurrentInviteLink,
  revokeInviteLink,
  isAuthenticated,
  getCurrentUserData,
  testConnection,
  getDebugInfo
} = api;