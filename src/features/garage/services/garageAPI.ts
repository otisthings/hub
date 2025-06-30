import api from '../../../services/api';

export const garageAPI = {
  // Dashboard
  getDashboard: () => api.get('/api/garage/dashboard').then(res => res.data),
  
  // Tiers
  getTiers: () => api.get('/api/garage/tiers').then(res => res.data),
  
  // Code redemption
  redeemCode: (code: string) => api.post('/api/garage/redeem', { code }).then(res => res.data),
  
  // Vehicles
  submitVehicle: (data: any) => api.post('/api/garage/vehicles', data).then(res => res.data),
  getUserVehicles: () => api.get('/api/garage/my-vehicles').then(res => res.data),
  
  // Admin endpoints
  getConfig: () => api.get('/api/garage/config').then(res => res.data),
  updateConfig: (data: any) => api.put('/api/garage/config', data).then(res => res.data),
  
  getRolePermissions: () => api.get('/api/garage/permissions').then(res => res.data),
  updateRolePermissions: (role_id: string, permissions: any) => 
    api.put('/api/garage/permissions', { role_id, permissions }).then(res => res.data),
  
  createTier: (data: any) => api.post('/api/garage/tiers', data).then(res => res.data),
  updateTier: (id: string, data: any) => api.put(`/api/garage/tiers/${id}`, data).then(res => res.data),
  deleteTier: (id: string) => api.delete(`/api/garage/tiers/${id}`).then(res => res.data),
  
  generateCodes: (data: any) => api.post('/api/garage/generate-codes', data).then(res => res.data),
};