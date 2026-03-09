import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  login: (username, password) => api.post('/auth/login', { username, password }),
  startGame: (userId) => api.post('/auth/start-game', { userId }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getProfile: (userId) => api.get(`/auth/profile?userId=${userId}`),
};

export const gameAPI = {
  getIslands: (userId) => api.get(`/islands?userId=${userId}`),
  getResources: (userId) => api.get(`/resources?userId=${userId}`),
  getBuildings: (islandId) => api.get(`/buildings/${islandId}`),
  upgradeBuilding: (buildingId, userId) => api.post('/buildings/upgrade', { buildingId, userId }),
  completeUpgrade: (buildingId) => api.post(`/buildings/complete-upgrade/${buildingId}`),
  getDiscoverableIslands: (userId) => api.get(`/islands/discoverable?userId=${userId}`),
  discoverIsland: (userId, islandName, islandType, specialty, bonus) => api.post('/islands/discover', { userId, islandName, islandType, specialty, bonus }),
};

export const productionAPI = {
  getBuildingProductions: (buildingId) => api.get(`/production/building/${buildingId}`),
  startProduction: (buildingId, userId) => api.post('/production/start', { buildingId, userId }),
  collectProduction: (productionId, userId) => api.post(`/production/collect/${productionId}`, { userId }),
};

export const taskAPI = {
  getTasks: (userId) => api.get(`/tasks?userId=${userId}`),
  updateProgress: (userId, taskType) => api.post('/tasks/progress', { userId, taskType }),
  claimReward: (taskId, userId) => api.post('/tasks/claim', { taskId, userId }),
};

export const marketplaceAPI = {
  getPrices: () => api.get('/marketplace/prices'),
  buyResource: (userId, resourceType, amount) => api.post('/marketplace/buy', { userId, resourceType, amount }),
  sellResource: (userId, resourceType, amount) => api.post('/marketplace/sell', { userId, resourceType, amount }),
  getTransactions: (userId) => api.get(`/marketplace/transactions?userId=${userId}`),
};

export const leaderboardAPI = {
  getLeaderboard: () => api.get('/leaderboard'),
  getUserRank: (userId) => api.get(`/leaderboard/user?userId=${userId}`),
};

// Daily Reward API'leri
export const dailyRewardAPI = {
  check: (userId) => api.get(`/daily-reward/check?userId=${userId}`),
  claim: (userId) => api.post('/daily-reward/claim', { userId }),
};

// Çark çevirme
export const spinAPI = {
  getStatus: (userId) => api.get(`/spin/status?userId=${userId}`),
  spin:      (userId) => api.post('/spin/daily', { userId }),
};

// Friend API'leri
export const friendAPI = {
  search: (username, userId) => api.get(`/friends/search?username=${username}&userId=${userId}`),
  sendRequest: (senderId, receiverId) => api.post('/friends/request', { senderId, receiverId }),
  getPendingRequests: (userId) => api.get(`/friends/requests?userId=${userId}`),
  acceptRequest: (requestId, userId) => api.post('/friends/accept', { requestId, userId }),
  rejectRequest: (requestId, userId) => api.post('/friends/reject', { requestId, userId }),
  getFriends: (userId) => api.get(`/friends/list?userId=${userId}`),
  removeFriend: (userId, friendId) => api.post('/friends/remove', { userId, friendId }),
  sendGift: (senderId, receiverId, resourceType, amount) => 
    api.post('/friends/gift', { senderId, receiverId, resourceType, amount }),
};


// Guild API'leri
export const guildAPI = {
  create: (name, description, leaderId) => 
    api.post('/guilds/create', { name, description, leaderId }),
  list: () => api.get('/guilds/list'),
  getDetails: (guildId) => api.get(`/guilds/details?guildId=${guildId}`),
  getUserGuild: (userId) => api.get(`/guilds/user-guild?userId=${userId}`),
  apply: (guildId, userId, message) => 
    api.post('/guilds/apply', { guildId, userId, message }),
  getApplications: (guildId) => api.get(`/guilds/applications?guildId=${guildId}`),
  acceptApplication: (applicationId, guildId) => 
    api.post('/guilds/accept', { applicationId, guildId }),
  rejectApplication: (applicationId) => 
    api.post('/guilds/reject', { applicationId }),
  leave: (userId, guildId) => api.post('/guilds/leave', { userId, guildId }),
  donate: (userId, guildId, resourceType, amount) => 
    api.post('/guilds/donate', { userId, guildId, resourceType, amount }),
  getChatMessages: (guildId) => api.get(`/guilds/chat?guildId=${guildId}`),
  sendMessage: (guildId, userId, message) => 
    api.post('/guilds/chat', { guildId, userId, message }),
};

// Battle API'leri
export const battleAPI = {
  getArmy: (userId) => api.get(`/battles/army?userId=${userId}`),
  recruit: (userId, type, count) => api.post('/battles/recruit', { userId, type, count }),
  listPirates: () => api.get('/battles/pirates'),
  attackPirate: (userId, pirateId) => api.post('/battles/attack-pirate', { userId, pirateId }),
  getHistory: (userId) => api.get(`/battles/history?userId=${userId}`),
  // PvP - YENİ
  listPvpTargets: (userId) => api.get(`/battles/pvp-targets?userId=${userId}`),
  attackPlayer: (attackerId, defenderId) => api.post('/battles/attack-player', { attackerId, defenderId }),
  buyShield: (userId, hours) => api.post('/battles/buy-shield', { userId, hours }),
  getAllReports: (userId) => api.get(`/battles/reports?userId=${userId}`),
  getUnreadAttacks: (userId) => api.get(`/battles/unread-attacks?userId=${userId}`),
  markAttacksSeen: (userId) => api.post('/battles/mark-seen', { userId }),
};

// Auto Production API'leri
export const autoProductionAPI = {
  activate: (userId) => api.post('/auto-production/activate', { userId }),
  getStatus: (userId) => api.get(`/auto-production/status?userId=${userId}`),
  tick: (userId) => api.post('/auto-production/tick', { userId }),
};

// Admin API
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getStats: () => api.get('/admin/stats'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateResources: (id, data) => api.put(`/admin/users/${id}/resources`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  // Bot yönetimi
  getBots: () => api.get('/admin/bots'),
  createBots: (count) => api.post('/admin/bots/create', { count }),
  triggerBotAttack: (data) => api.post('/admin/bots/attack', data),
  boostBotArmies: (data) => api.post('/admin/bots/boost-armies', data),
  attackSpecificUser: (data) => api.post('/admin/bots/attack-user', data),
  // Seed oyuncu orduları
  boostSeedArmies: (data) => api.post('/admin/seeds/boost-armies', data),
  // Ödül talepleri
  getPrizeRequests: () => api.get('/admin/prize-requests'),
  updatePrizeRequest: (id, status, adminNote) =>
    api.put(`/admin/prize-requests/${id}`, { status, adminNote }),
  // Instagram Boost istekleri
  getInstagramRequests: () => api.get('/admin/instagram-requests'),
  reviewInstagramRequest: (userId, action) => api.put(`/admin/instagram-requests/${userId}`, { action }),
  revokeInstagramBoost: (userId) => api.put(`/admin/instagram-requests/${userId}/revoke`, {}),
  // Ban yönetimi
  getBannedUsers: () => api.get('/admin/banned'),
  banUser: (id, reason) => api.post(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id) => api.post(`/admin/users/${id}/unban`, {}),
};

// Admin2 API
export const admin2API = {
  getPlayers:       ()         => api.get('/admin/admin2/players'),
  getPlayerDetail:  (id)       => api.get(`/admin/admin2/players/${id}`),
  getAllBattles:     (limit, offset) => api.get(`/admin/admin2/battles?limit=${limit || 200}&offset=${offset || 0}`),
  getActivityMetrics: ()       => api.get('/admin/admin2/activity'),
};

// TLCoin API
export const tlcoinAPI = {
  getBalance:    (userId) => api.get(`/tlcoin/balance?userId=${userId}`),
  convertGold:   (userId, goldAmount) => api.post('/tlcoin/convert', { userId, goldAmount }),
  requestPrize:  (userId, prizeId, prizeName, tlcoinCost) =>
    api.post('/tlcoin/request-prize', { userId, prizeId, prizeName, tlcoinCost }),
  getMyRequests: (userId) => api.get(`/tlcoin/my-requests?userId=${userId}`),
};

// Ticaret API
export const tradeAPI = {
  getRates:  () => api.get('/trade/rates'),
  convert:   (userId, resourceType, amount) =>
    api.post('/trade/convert', { userId, resourceType, amount }),
};

// Instagram Boost API
export const instagramAPI = {
  request:   (userId, instagramUsername) => api.post('/instagram/request', { userId, instagramUsername }),
  getStatus: (userId) => api.get(`/instagram/status/${userId}`),
};

export default api;