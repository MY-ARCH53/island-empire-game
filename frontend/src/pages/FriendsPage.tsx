import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Search, UserPlus, Gift, Trash2, Check, X, Send } from 'lucide-react';
import { friendAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { fireRewardConfetti } from '../utils/confetti';

function FriendsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [giftResource, setGiftResource] = useState('gold');
  const [giftAmount, setGiftAmount] = useState(10);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUser(user);
      loadFriends(user.id);
      loadPendingRequests(user.id);
    }
  }, []);

  const loadFriends = async (userId: number) => {
    try {
      const response = await friendAPI.getFriends(userId);
      setFriends(response.data.data.friends);
    } catch (error) {
      console.error('Arkadaş listesi yükleme hatası:', error);
    }
  };

  const loadPendingRequests = async (userId: number) => {
    try {
      const response = await friendAPI.getPendingRequests(userId);
      setPendingRequests(response.data.data.requests);
    } catch (error) {
      console.error('İstekler yükleme hatası:', error);
    }
  };

  const handleSearch = async () => {
    if (!user || searchQuery.length < 2) {
      showToast('En az 2 karakter giriniz', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await friendAPI.search(searchQuery, user.id);
      setSearchResults(response.data.data.users);
      if (response.data.data.users.length === 0) {
        showToast('Kullanıcı bulunamadı', 'info');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Arama başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (receiverId: number) => {
    if (!user) return;

    try {
      const response = await friendAPI.sendRequest(user.id, receiverId);
      showToast(response.data.message + ' 📨', 'success');
      handleSearch(); // Sonuçları yenile
    } catch (error: any) {
      showToast(error.response?.data?.message || 'İstek gönderilemedi', 'error');
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    if (!user) return;

    try {
      const response = await friendAPI.acceptRequest(requestId, user.id);
      fireRewardConfetti();
      showToast(response.data.message + ' 🎉', 'success');
      loadFriends(user.id);
      loadPendingRequests(user.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'İstek kabul edilemedi', 'error');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!user) return;

    try {
      const response = await friendAPI.rejectRequest(requestId, user.id);
      showToast(response.data.message, 'info');
      loadPendingRequests(user.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'İstek reddedilemedi', 'error');
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    if (!user) return;

    if (!confirm('Bu arkadaşı silmek istediğine emin misin?')) {
      return;
    }

    try {
      const response = await friendAPI.removeFriend(user.id, friendId);
      showToast(response.data.message, 'info');
      loadFriends(user.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Arkadaş silinemedi', 'error');
    }
  };

  const handleSendGift = async () => {
    if (!user || !selectedFriend) return;

    try {
      const response = await friendAPI.sendGift(
        user.id,
        selectedFriend.friend_id,
        giftResource,
        giftAmount
      );
      fireRewardConfetti();
      showToast(response.data.message, 'success');
      setShowGiftModal(false);
      setSelectedFriend(null);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Hediye gönderilemedi', 'error');
    }
  };

  const resourceIcons: any = {
    gold: { icon: '💰', label: 'Altın' },
    wood: { icon: '🌲', label: 'Odun' },
    food: { icon: '🍎', label: 'Yiyecek' },
    energy: { icon: '⚡', label: 'Enerji' }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-card mb-4 animate-fadeIn">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-3 transition hover-lift"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </button>
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Arkadaşlar</h1>
              <p className="text-sm text-gray-600">
                {friends.length} arkadaş • {pendingRequests.length} bekleyen istek
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card mb-4 animate-slideInLeft">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition btn-modern ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Arkadaşlarım ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition btn-modern ${
                activeTab === 'search'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Search className="w-5 h-5 inline mr-2" />
              Ara
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition btn-modern relative ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserPlus className="w-5 h-5 inline mr-2" />
              İstekler
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="glass-card animate-fadeIn">
            <h2 className="font-bold text-gray-800 mb-4">👥 Arkadaş Listesi</h2>
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Henüz arkadaşın yok</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition btn-modern"
                >
                  Arkadaş Ara
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend, index) => (
                  <div
                    key={friend.id}
                    className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 hover-lift animate-slideInLeft"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{friend.username}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              Seviye {friend.level}
                            </span>
                            <span>•</span>
                            <span>{friend.island_count} Ada</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedFriend(friend);
                            setShowGiftModal(true);
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition btn-modern"
                          title="Hediye Gönder"
                        >
                          <Gift className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.friend_id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition btn-modern"
                          title="Arkadaşı Sil"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {activeTab === 'search' && (
          <div className="glass-card animate-fadeIn">
            <h2 className="font-bold text-gray-800 mb-4">🔍 Arkadaş Ara</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Kullanıcı adı ara..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold transition btn-modern shadow-lg disabled:opacity-50"
              >
                {loading ? '...' : <Search className="w-5 h-5" />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 rounded-xl bg-white border-2 border-gray-200 hover-lift"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-xl">
                          {result.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{result.username}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Seviye {result.level}</span>
                            <span>•</span>
                            <span>{result.league}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(result.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition btn-modern flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Ekle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Requests */}
        {activeTab === 'requests' && (
          <div className="glass-card animate-fadeIn">
            <h2 className="font-bold text-gray-800 mb-4">📨 Gelen İstekler</h2>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Bekleyen istek yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((request, index) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 hover-lift animate-slideInLeft"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                          {request.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{request.username}</p>
                          <p className="text-sm text-gray-600">
                            Seviye {request.level} • {request.league}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition btn-modern"
                          title="Kabul Et"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition btn-modern"
                          title="Reddet"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gift Modal */}
      {showGiftModal && selectedFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="glass-card max-w-md w-full animate-slideInLeft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Gift className="w-6 h-6 text-green-500" />
                Hediye Gönder
              </h2>
              <button
                onClick={() => {
                  setShowGiftModal(false);
                  setSelectedFriend(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              <span className="font-bold">{selectedFriend.username}</span> için hediye seç
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kaynak Türü
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(resourceIcons).map(([key, config]: any) => (
                  <button
                    key={key}
                    onClick={() => setGiftResource(key)}
                    className={`p-3 rounded-xl border-2 transition ${
                      giftResource === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <span className="text-2xl">{config.icon}</span>
                    <p className="text-sm font-medium text-gray-800">{config.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Miktar
              </label>
              <input
              type="number"
              value={giftAmount}
              onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
              min="1"
              max="10"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
/>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              * Günlük 3 hediye gönderebilirsiniz
            </p>

            <button
              onClick={handleSendGift}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-xl font-bold transition btn-modern shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Hediye Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FriendsPage;