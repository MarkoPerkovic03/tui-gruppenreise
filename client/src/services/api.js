// client/src/services/api.js - Für MongoDB Backend

class ApiService {
  constructor() {
    // Verwende relative URLs - Vite Proxy leitet an MongoDB Backend weiter
    this.baseURL = '';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Token hinzufügen falls vorhanden
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log('🔄 API Request:', options.method || 'GET', url);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    }
  }

  // ===== AUTH METHODS =====
  async login(email, password) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Token speichern
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  async register(userData) {
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // Token speichern
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // ===== TRAVEL OFFERS METHODS =====
  async getTravelOffers(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/api/travel-offers${queryParams ? `?${queryParams}` : ''}`;
    const response = await this.request(endpoint);
    
    // MongoDB Backend gibt { success: true, offers: [...] } zurück
    return response.offers || response;
  }

  async getTravelOffer(id) {
    return this.request(`/api/travel-offers/${id}`);
  }

  async createTravelOffer(offerData) {
    const response = await this.request('/api/travel-offers', {
      method: 'POST',
      body: JSON.stringify(offerData),
    });
    return response.offer || response;
  }

  async updateTravelOffer(id, offerData) {
    return this.request(`/api/travel-offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(offerData),
    });
  }

  async deleteTravelOffer(id) {
    return this.request(`/api/travel-offers/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== GROUPS METHODS =====
  async getGroups() {
    return this.request('/api/groups');
  }

  async getGroup(id) {
    return this.request(`/api/groups/${id}`);
  }

  async createGroup(groupData) {
    return this.request('/api/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  async updateGroup(id, groupData) {
    return this.request(`/api/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });
  }

  async addGroupMember(groupId, userEmail) {
    return this.request(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userEmail }),
    });
  }

  async leaveGroup(groupId) {
    return this.request(`/api/groups/${groupId}/leave`, {
      method: 'DELETE',
    });
  }

  // ===== PROPOSALS METHODS =====
  async getProposals(groupId) {
    return this.request(`/api/proposals/group/${groupId}`);
  }

  async createProposal(proposalData) {
    return this.request('/api/proposals', {
      method: 'POST',
      body: JSON.stringify(proposalData),
    });
  }

  async voteForProposal(proposalId, rank = 1) {
    return this.request(`/api/proposals/${proposalId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ rank }),
    });
  }

  async deleteProposal(proposalId) {
    return this.request(`/api/proposals/${proposalId}`, {
      method: 'DELETE',
    });
  }

  // ===== PROFILE METHODS =====
  async getProfile() {
    return this.request('/api/profile');
  }

  async updateProfile(profileData) {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadProfileImage(imageData) {
    return this.request('/api/profile/upload-image', {
      method: 'POST',
      body: JSON.stringify(imageData),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getRecommendations() {
    return this.request('/api/profile/recommendations');
  }

  // ===== UTILITY METHODS =====
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  getCurrentUserData() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }
}

// Erstelle und exportiere Singleton-Instanz
const apiService = new ApiService();
export default apiService;

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
  isAuthenticated,
  getCurrentUserData
} = apiService;