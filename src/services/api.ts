import axios from 'axios';

// CRITICAL: Enhanced API base URL detection for cross-domain deployment
const getApiBaseUrl = () => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect based on current environment
  if (import.meta.env.PROD) {
    // Production: Use the same origin as the frontend
    return window.location.origin;
  } else {
    // Development: Use localhost with port 3002
    return 'http://localhost:3002';
  }
};

const API_BASE_URL = getApiBaseUrl();

console.log('?? API Base URL:', API_BASE_URL);
console.log('?? Environment:', import.meta.env.MODE);
console.log('?? Current Origin:', window.location.origin);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: This must be true for cross-domain cookies
  timeout: 30000, // 30 second timeout for production
  headers: {
    'Content-Type': 'application/json',
  },
});

// CRITICAL: Enhanced request interceptor for debugging cross-domain issues
api.interceptors.request.use(
  (config) => {
    console.log('?? API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials,
      origin: window.location.origin,
      cookies: document.cookie ? 'Present' : 'Missing',
      cookieDetails: document.cookie
    });
    return config;
  },
  (error) => {
    console.error('? Request Error:', error);
    return Promise.reject(error);
  }
);

// CRITICAL: Enhanced response interceptor for debugging authentication issues
api.interceptors.response.use(
  (response) => {
    console.log('? API Response:', {
      status: response.status,
      url: response.config.url,
      headers: response.headers,
      cookies: document.cookie,
      setCookieHeader: response.headers['set-cookie']
    });
    return response;
  },
  (error) => {
    console.error('? Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      headers: error.response?.headers,
      cookies: document.cookie,
      data: error.response?.data,
      config: {
        withCredentials: error.config?.withCredentials,
        baseURL: error.config?.baseURL
      }
    });
    
    // CRITICAL: Don't auto-redirect on 401 - let components handle it
    if (error.response?.status === 401) {
      console.warn('?? Authentication failed - 401 Unauthorized');
      console.warn('?? Current cookies:', document.cookie);
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  getCurrentUser: () => api.get('/auth/user').then(res => res.data),
  logout: () => api.post('/auth/logout').then(res => res.data),
  getDiscordAuthUrl: () => `${API_BASE_URL}/auth/discord`,
};

export const ticketsAPI = {
  getAll: (params?: any) => api.get('/api/tickets', { params }).then(res => res.data),
  getById: (id: string) => api.get(`/api/tickets/${id}`).then(res => res.data),
  create: (data: any) => api.post('/api/tickets', data).then(res => res.data),
  addMessage: (id: string, message: string) => 
    api.post(`/api/tickets/${id}/messages`, { message }).then(res => res.data),
  updateStatus: (id: string, status: string) => 
    api.put(`/api/tickets/${id}/status`, { status }).then(res => res.data),
  assign: (id: string, assigned_to: number) => 
    api.put(`/api/tickets/${id}/assign`, { assigned_to }).then(res => res.data),
  transfer: (id: string, category_id: number) => 
    api.put(`/api/tickets/${id}/transfer`, { category_id }).then(res => res.data),
  claim: (id: string, claim: boolean) =>
    api.put(`/api/tickets/${id}/claim`, { claim }).then(res => res.data),
  addParticipant: (id: string, discord_id: string) =>
    api.post(`/api/tickets/${id}/participants`, { discord_id }).then(res => res.data),
};

export const categoriesAPI = {
  getAll: () => api.get('/api/categories').then(res => res.data),
  getAccessibleCategories: () => api.get('/api/categories/accessible').then(res => res.data),
  getSupportCategories: () => api.get('/api/categories/support').then(res => res.data),
  create: (data: any) => api.post('/api/categories', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/api/categories/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/api/categories/${id}`).then(res => res.data),
};

export const applicationsAPI = {
  getAll: () => api.get('/api/applications').then(res => res.data),
  getPublic: () => api.get('/api/applications/public').then(res => res.data),
  getOne: (id: string) => api.get(`/api/applications/${id}`).then(res => res.data),
  create: (data: any) => api.post('/api/applications', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/api/applications/${id}`, data).then(res => res.data),
  submit: (id: string, responses: any) => 
    api.post(`/api/applications/${id}/submit`, { responses }).then(res => res.data),
  getSubmissions: (id: string) => 
    api.get(`/api/applications/${id}/submissions`).then(res => res.data),
  getMySubmissions: (id: string) =>
    api.get(`/api/applications/${id}/my-submissions`).then(res => res.data),
  reviewSubmission: (appId: string, subId: string, data: any) => 
    api.put(`/api/applications/${appId}/submissions/${subId}`, data).then(res => res.data),
  getMyApplications: () => api.get('/api/my-applications').then(res => res.data),
};

export const rolesAPI = {
  getSelfAssignable: () => api.get('/api/roles/self-assignable').then(res => res.data),
  toggleRole: (id: string, action: 'add' | 'remove') => 
    api.post(`/api/roles/self-assignable/${id}/toggle`, { action }).then(res => res.data),
  
  // Admin endpoints
  getAdminSelfAssignable: () => api.get('/api/admin/roles/self-assignable').then(res => res.data),
  createSelfAssignable: (data: any) => api.post('/api/admin/roles/self-assignable', data).then(res => res.data),
  updateSelfAssignable: (id: string, data: any) => api.put(`/api/admin/roles/self-assignable/${id}`, data).then(res => res.data),
  deleteSelfAssignable: (id: string) => api.delete(`/api/admin/roles/self-assignable/${id}`).then(res => res.data),
};

export const departmentsAPI = {
  getAll: () => api.get('/api/departments').then(res => res.data),
  getByClassification: (type: 'department' | 'organization') => 
    api.get(`/api/departments/classification/${type}`).then(res => res.data),
  getRoster: (id: string) => api.get(`/api/departments/${id}/roster`).then(res => res.data),
  addToRoster: (id: string, discord_id: string, callsign_number: string) =>
    api.post(`/api/departments/${id}/roster`, { discord_id, callsign_number }).then(res => res.data),
  updateRosterMember: (id: string, memberId: string, callsign_number: string) =>
    api.put(`/api/departments/${id}/roster/${memberId}`, { callsign_number }).then(res => res.data),
  removeFromRoster: (id: string, memberId: string) =>
    api.delete(`/api/departments/${id}/roster/${memberId}`).then(res => res.data),
  
  // Admin endpoints
  getAllAdmin: () => api.get('/api/departments/admin/all').then(res => res.data),
  create: (data: any) => api.post('/api/departments', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/api/departments/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/api/departments/${id}`).then(res => res.data),
};

export const profileAPI = {
  getProfile: (discordId: string) => api.get(`/api/profile/${discordId}`).then(res => res.data),
};

export const timeclockAPI = {
  getTimeclockData: () => api.get('/api/timeclock').then(res => res.data),
};

export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard/stats').then(res => res.data),
};

// Export the main api instance for other uses
export default api;