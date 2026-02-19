import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Castle, Users, Search, Plus, Send, Gift, LogOut, MessageCircle, Shield } from 'lucide-react';
import { guildAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { fireConfetti, fireRewardConfetti } from '../utils/confetti';

function GuildsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'my-guild' | 'list' | 'create'>('my-guild');
  const [myGuild, setMyGuild] = useState<any>(null);
  const [guildDetails, setGuildDetails] = useState<any>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [guildName, setGuildName] = useState('');
  const [guildDescription, setGuildDescription] = useState('');

  // Apply form
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<any>(null);
  const [applyMessage, setApplyMessage] = useState('');

  // Donate form
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateResource, setDonateResource] = useState('gold');
  const [donateAmount, setDonateAmount] = useState(10);

  // Chat
  const [chatMessage, setChatMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUser(user);
      loadUserGuild(user.id);
    }
  }, []);

  useEffect(() => {
  if (myGuild) {
    loadGuildDetails(myGuild.id);
    loadChatMessages(myGuild.id);
    
    const chatInterval = setInterval(() => {
      loadChatMessages(myGuild.id);
    }, 10000);

    return () => clearInterval(chatInterval);
  }
}, [myGuild]);

  const loadUserGuild = async (userId: number) => {
    try {
      const response = await guildAPI.getUserGuild(userId);
      setMyGuild(response.data.data.guild);
      
      if (!response.data.data.guild) {
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Guild yükleme hatası:', error);
    }
  };

  const loadGuildDetails = async (guildId: number) => {
    try {
      const response = await guildAPI.getDetails(guildId);
      setGuildDetails(response.data.data);

      // Eğer lider veya officer ise, başvuruları yükle
      if (myGuild && (myGuild.role === 'leader' || myGuild.role === 'officer')) {
        const appsResponse = await guildAPI.getApplications(guildId);
        setApplications(appsResponse.data.data.applications);
      }
    } catch (error) {
      console.error('Guild detayları yükleme hatası:', error);
    }
  };

  const loadGuildsList = async () => {
    try {
      const response = await guildAPI.list();
      setGuilds(response.data.data.guilds);
    } catch (error) {
      console.error('Guild listesi yükleme hatası:', error);
    }
  };

  const loadChatMessages = async (guildId: number) => {
    try {
      const response = await guildAPI.getChatMessages(guildId);
      setChatMessages(response.data.data.messages);
    } catch (error) {
      console.error('Chat yükleme hatası:', error);
    }
  };

  const handleCreateGuild = async () => {
    if (!user) return;

    if (guildName.length < 3) {
      showToast('Guild ismi en az 3 karakter olmalı', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await guildAPI.create(guildName, guildDescription, user.id);
      fireConfetti();
      showToast(response.data.message, 'success');
      setGuildName('');
      setGuildDescription('');
      loadUserGuild(user.id);
      setActiveTab('my-guild');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Guild oluşturulamadı', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user || !selectedGuild) return;

    try {
      const response = await guildAPI.apply(selectedGuild.id, user.id, applyMessage);
      showToast(response.data.message, 'success');
      setShowApplyModal(false);
      setSelectedGuild(null);
      setApplyMessage('');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Başvuru gönderilemedi', 'error');
    }
  };

  const handleAcceptApplication = async (applicationId: number) => {
    if (!myGuild) return;

    try {
      const response = await guildAPI.acceptApplication(applicationId, myGuild.id);
      fireRewardConfetti();
      showToast(response.data.message, 'success');
      loadGuildDetails(myGuild.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Başvuru kabul edilemedi', 'error');
    }
  };

  const handleRejectApplication = async (applicationId: number) => {
    try {
      const response = await guildAPI.rejectApplication(applicationId);
      showToast(response.data.message, 'info');
      if (myGuild) loadGuildDetails(myGuild.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Başvuru reddedilemedi', 'error');
    }
  };

  const handleLeaveGuild = async () => {
    if (!user || !myGuild) return;

    if (!confirm('Guild\'den ayrılmak istediğine emin misin?')) {
      return;
    }

    try {
      const response = await guildAPI.leave(user.id, myGuild.id);
      showToast(response.data.message, 'info');
      loadUserGuild(user.id);
      setActiveTab('list');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Ayrılamadı', 'error');
    }
  };

  const handleDonate = async () => {
    if (!user || !myGuild) return;

    try {
      const response = await guildAPI.donate(user.id, myGuild.id, donateResource, donateAmount);
      fireRewardConfetti();
      showToast(response.data.message, 'success');
      setShowDonateModal(false);
      loadGuildDetails(myGuild.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Bağış yapılamadı', 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!user || !myGuild || !chatMessage.trim()) return;

    try {
      await guildAPI.sendMessage(myGuild.id, user.id, chatMessage);
      setChatMessage('');
      loadChatMessages(myGuild.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Mesaj gönderilemedi', 'error');
    }
  };

  const resourceIcons: any = {
    gold: { icon: '💰', label: 'Altın' },
    wood: { icon: '🌲', label: 'Odun' },
    food: { icon: '🍎', label: 'Yiyecek' },
    energy: { icon: '⚡', label: 'Enerji' }
  };

  const roleLabels: any = {
    leader: { label: 'Lider', color: 'bg-yellow-100 text-yellow-800', icon: '👑' },
    officer: { label: 'Yardımcı', color: 'bg-blue-100 text-blue-800', icon: '⭐' },
    member: { label: 'Üye', color: 'bg-gray-100 text-gray-800', icon: '👤' }
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
            <Castle className="w-8 h-8 text-purple-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Guild Sistemi</h1>
              <p className="text-sm text-gray-600">
                {myGuild ? `${myGuild.name} - ${roleLabels[myGuild.role].label}` : 'Guild\'e katıl veya oluştur'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card mb-4 animate-slideInLeft">
          <div className="flex gap-2">
            {myGuild && (
              <button
                onClick={() => setActiveTab('my-guild')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition btn-modern ${
                  activeTab === 'my-guild'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Castle className="w-5 h-5 inline mr-2" />
                Guild\'im
              </button>
            )}
            <button
              onClick={() => {
                setActiveTab('list');
                loadGuildsList();
              }}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition btn-modern ${
                activeTab === 'list'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Search className="w-5 h-5 inline mr-2" />
              Guild Listesi
            </button>
            {!myGuild && (
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition btn-modern ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Oluştur
              </button>
            )}
          </div>
        </div>

        {/* My Guild */}
        {activeTab === 'my-guild' && myGuild && guildDetails && (
          <div className="space-y-4">
            {/* Guild Info */}
            <div className="glass-card animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{guildDetails.guild.name}</h2>
                  <p className="text-gray-600">{guildDetails.guild.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleLabels[myGuild.role].color}`}>
                      {roleLabels[myGuild.role].icon} {roleLabels[myGuild.role].label}
                    </span>
                    <span className="text-sm text-gray-600">
                      Seviye {guildDetails.guild.level}
                    </span>
                    <span className="text-sm text-gray-600">
                      {guildDetails.members.length}/{guildDetails.guild.member_limit} Üye
                    </span>
                  </div>
                </div>
                {myGuild.role !== 'leader' && (
                  <button
                    onClick={handleLeaveGuild}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition btn-modern flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Ayrıl
                  </button>
                )}
              </div>

              {/* Storage */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-800">🏦 Guild Deposu</h3>
                  <button
                    onClick={() => setShowDonateModal(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition btn-modern flex items-center gap-1"
                  >
                    <Gift className="w-4 h-4" />
                    Bağış Yap
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {guildDetails.storage.map((storage: any) => {
                    const config = resourceIcons[storage.resource_type];
                    return (
                      <div
                        key={storage.resource_type}
                        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 text-center border-2 border-purple-200"
                      >
                        <span className="text-2xl">{config.icon}</span>
                        <p className="text-sm text-gray-600">{config.label}</p>
                        <p className="font-bold text-gray-800 text-lg">{storage.amount}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Applications (Leader/Officer only) */}
              {(myGuild.role === 'leader' || myGuild.role === 'officer') && applications.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-bold text-gray-800 mb-2">📨 Başvurular ({applications.length})</h3>
                  <div className="space-y-2">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="bg-yellow-50 rounded-lg p-3 border-2 border-yellow-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-800">{app.username}</p>
                            <p className="text-sm text-gray-600">
                              Seviye {app.level} • {app.league}
                            </p>
                            {app.message && (
                              <p className="text-sm text-gray-600 mt-1 italic">"{app.message}"</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptApplication(app.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition btn-modern"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleRejectApplication(app.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition btn-modern"
                            >
                              ✗
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Members */}
            <div className="glass-card animate-slideInLeft">
              <h3 className="font-bold text-gray-800 mb-3">
                👥 Üyeler ({guildDetails.members.length})
              </h3>
              <div className="space-y-2">
                {guildDetails.members.map((member: any, index: number) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover-lift animate-slideInLeft"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-800">{member.username}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleLabels[member.role].color}`}>
                              {roleLabels[member.role].icon}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Seviye {member.level} • Katkı: {member.contribution_points}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="glass-card animate-slideInRight">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Guild Sohbeti
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-64 overflow-y-auto space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center">Henüz mesaj yok</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2 rounded-lg ${
                        msg.user_id === user?.id
                          ? 'bg-blue-100 ml-8'
                          : 'bg-white mr-8'
                      }`}
                    >
                      <p className="text-xs text-gray-600 font-semibold">{msg.username}</p>
                      <p className="text-sm text-gray-800">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Mesaj yaz..."
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition btn-modern"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Guild List */}
        {activeTab === 'list' && (
          <div className="glass-card animate-fadeIn">
            <h2 className="font-bold text-gray-800 mb-4">🔍 Tüm Guild'ler</h2>
            {guilds.length === 0 ? (
              <div className="text-center py-8">
                <Castle className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Henüz guild yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guilds.map((guild, index) => (
                  <div
                    key={guild.id}
                    className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover-lift animate-slideInLeft"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{guild.name}</h3>
                        <p className="text-sm text-gray-600">{guild.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                          <span>Lider: {guild.leader_name}</span>
                          <span>•</span>
                          <span>Seviye {guild.level}</span>
                          <span>•</span>
                          <span>{guild.member_count}/{guild.member_limit} Üye</span>
                          <span>•</span>
                          <span>{guild.total_points} Puan</span>
                        </div>
                      </div>
                      {!myGuild && (
                        <button
                          onClick={() => {
                            setSelectedGuild(guild);
                            setShowApplyModal(true);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition btn-modern flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Başvur
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Guild */}
        {activeTab === 'create' && !myGuild && (
          <div className="glass-card animate-fadeIn">
            <h2 className="font-bold text-gray-800 mb-4">➕ Yeni Guild Oluştur</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guild İsmi *
                </label>
                <input
                  type="text"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  placeholder="Örn: Ejderha Avcıları"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={guildDescription}
                  onChange={(e) => setGuildDescription(e.target.value)}
                  placeholder="Guild'iniz hakkında kısa bilgi..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
              <button
                onClick={handleCreateGuild}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl font-bold transition btn-modern shadow-lg disabled:opacity-50"
              >
                {loading ? 'Oluşturuluyor...' : '🏰 Guild Oluştur'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && selectedGuild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="glass-card max-w-md w-full animate-slideInLeft">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              {selectedGuild.name}'e Başvur
            </h2>
            <textarea
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              placeholder="Başvuru mesajı (opsiyonel)"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedGuild(null);
                  setApplyMessage('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition"
              >
                İptal
              </button>
              <button
                onClick={handleApply}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg transition btn-modern"
              >
                Başvur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donate Modal */}
      {showDonateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="glass-card max-w-md w-full animate-slideInLeft">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Gift className="w-6 h-6 text-green-500" />
              Bağış Yap
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kaynak Türü
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(resourceIcons).map(([key, config]: any) => (
                  <button
                    key={key}
                    onClick={() => setDonateResource(key)}
                    className={`p-3 rounded-xl border-2 transition ${
                      donateResource === key
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-300'
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
                Miktar (1-100)
              </label>
              <input
                type="number"
                value={donateAmount}
                onChange={(e) => setDonateAmount(parseInt(e.target.value) || 0)}
                min="1"
                max="100"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDonateModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition"
              >
                İptal
              </button>
              <button
                onClick={handleDonate}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition btn-modern"
              >
                Bağış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuildsPage;