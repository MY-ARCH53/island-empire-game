import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';

function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'bots' | 'prizes' | 'instagram' | 'banned' | 'guildchat'>('users');

  // Kullanıcı tab state'leri
  const [stats, setStats]       = useState<any>(null);
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [resourceForm, setResourceForm] = useState<any>({});
  const [saving, setSaving]     = useState(false);
  const [message, setMessage]   = useState('');

  // Bot tab state'leri
  const [bots, setBots]               = useState<any[]>([]);
  const [botTotal, setBotTotal]       = useState(0);
  const [botLoading, setBotLoading]   = useState(false);
  const [attackCount, setAttackCount] = useState(5);
  const [attackResults, setAttackResults] = useState<any[]>([]);
  const [attacking, setAttacking]     = useState(false);
  const [creating, setCreating]       = useState(false);
  const [botMsg, setBotMsg]           = useState('');

  // Bot güç boost state'leri
  const [boostArcher, setBoostArcher]     = useState(10);
  const [boostInfantry, setBoostInfantry] = useState(10);
  const [boostCavalry, setBoostCavalry]   = useState(5);
  const [boosting, setBoosting]           = useState(false);

  // Seed ordu boost state'leri
  const [seedArcher, setSeedArcher]     = useState(20);
  const [seedInfantry, setSeedInfantry] = useState(20);
  const [seedCavalry, setSeedCavalry]   = useState(10);
  const [seedBoosting, setSeedBoosting] = useState(false);

  // Tekil kullanıcı saldırısı state'leri
  const [targetUserId, setTargetUserId]   = useState('');
  const [targetBotCount, setTargetBotCount] = useState(3);
  const [attackingUser, setAttackingUser] = useState(false);

  // Seed kaynak boost state'leri
  const [seedGold, setSeedGold]     = useState(1000);
  const [seedWood, setSeedWood]     = useState(1000);
  const [seedFood, setSeedFood]     = useState(1000);
  const [seedResLoading, setSeedResLoading] = useState(false);

  // Zorla savaş state'leri
  const [forceAttackerId, setForceAttackerId] = useState('');
  const [forceDefenderId, setForceDefenderId] = useState('');
  const [forceBattleLoading, setForceBattleLoading] = useState(false);
  const [forceBattleResult, setForceBattleResult] = useState<any>(null);

  // Seed kaynak SET state'leri
  const [setGoldMin, setSetGoldMin] = useState(250000);
  const [setGoldMax, setSetGoldMax] = useState(450000);
  const [setWoodMin, setSetWoodMin] = useState(250000);
  const [setWoodMax, setSetWoodMax] = useState(450000);
  const [setFoodMin, setSetFoodMin] = useState(250000);
  const [setFoodMax, setSetFoodMax] = useState(450000);
  const [setResLoading, setSetResLoading] = useState(false);

  // Otomatik saldırı kuralları state'leri
  const [autoAttackRules, setAutoAttackRules] = useState<any[]>([]);
  const [customThreshold, setCustomThreshold] = useState(3000000);
  const [autoAttackLoading, setAutoAttackLoading] = useState(false);

  // Ödül talepleri state'leri
  const [prizeRequests, setPrizeRequests]       = useState<any[]>([]);
  const [prizeLoading, setPrizeLoading]         = useState(false);
  const [prizeActionId, setPrizeActionId]       = useState<number | null>(null);

  // Instagram Boost state'leri
  const [igRequests, setIgRequests]             = useState<any[]>([]);
  const [igLoading, setIgLoading]               = useState(false);
  const [igActionId, setIgActionId]             = useState<number | null>(null);

  // Ban state'leri
  const [bannedUsers, setBannedUsers]           = useState<any[]>([]);
  const [bannedLoading, setBannedLoading]       = useState(false);
  const [banReason, setBanReason]               = useState('');
  const [banningId, setBanningId]               = useState<number | null>(null);

  // Guild sohbet state'leri
  const [guildChats, setGuildChats]             = useState<any[]>([]);
  const [guildList, setGuildList]               = useState<any[]>([]);
  const [chatLoading, setChatLoading]           = useState(false);
  const [selectedGuildId, setSelectedGuildId]   = useState<string>('');

  // Sıralama state'leri
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const u = JSON.parse(userData);
    if (!u.is_admin) { navigate('/home'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBots = async () => {
    setBotLoading(true);
    try {
      const res = await adminAPI.getBots();
      setBots(res.data.data.bots);
      setBotTotal(res.data.data.total);
    } catch (err) {
      console.error('Bot load error:', err);
    } finally {
      setBotLoading(false);
    }
  };

  const loadPrizeRequests = async () => {
    setPrizeLoading(true);
    try {
      const res = await adminAPI.getPrizeRequests();
      setPrizeRequests(res.data.data.requests);
    } catch (err) {
      console.error('Prize requests load error:', err);
    } finally {
      setPrizeLoading(false);
    }
  };

  const handlePrizeAction = async (id: number, status: string, note: string) => {
    setPrizeActionId(id);
    try {
      await adminAPI.updatePrizeRequest(id, status, note);
      await loadPrizeRequests();
    } catch (err) {
      console.error('Prize action error:', err);
    } finally {
      setPrizeActionId(null);
    }
  };

  const loadIgRequests = async () => {
    setIgLoading(true);
    try {
      const res = await adminAPI.getInstagramRequests();
      setIgRequests(res.data.data.requests);
    } catch (err) {
      console.error('IG requests load error:', err);
    } finally {
      setIgLoading(false);
    }
  };

  const handleIgAction = async (userId: number, action: 'approve' | 'reject' | 'revoke') => {
    setIgActionId(userId);
    try {
      if (action === 'revoke') {
        await adminAPI.revokeInstagramBoost(userId);
      } else {
        await adminAPI.reviewInstagramRequest(userId, action);
      }
      await loadIgRequests();
    } catch (err) {
      console.error('IG action error:', err);
    } finally {
      setIgActionId(null);
    }
  };

  const loadBannedUsers = async () => {
    setBannedLoading(true);
    try {
      const r = await adminAPI.getBannedUsers();
      setBannedUsers(r.data.data.users);
    } catch { /* ignore */ }
    setBannedLoading(false);
  };

  const loadGuildChats = async (guildId?: string) => {
    setChatLoading(true);
    try {
      const r = await adminAPI.getGuildChats(guildId || undefined);
      setGuildChats(r.data.data.messages);
      setGuildList(r.data.data.guilds);
    } catch { /* ignore */ }
    setChatLoading(false);
  };

  const handleDeleteChatMessage = async (id: number) => {
    if (!confirm('Bu mesajı silmek istediğine emin misin?')) return;
    await adminAPI.deleteGuildMessage(id);
    setGuildChats(prev => prev.filter((m: any) => m.id !== id));
  };

  const handleBanUser = async (user: any) => {
    const reason = prompt(`"${user.username}" kullanıcısını banlamak istediğinize emin misiniz?\n\nBan sebebini yazın (zorunlu değil):`);
    if (reason === null) return; // iptal
    setBanningId(user.id);
    try {
      await adminAPI.banUser(user.id, reason.trim() || undefined);
      setEditUser(null);
      await loadData();
      await loadBannedUsers();
    } catch {
      alert('Ban işlemi başarısız');
    }
    setBanningId(null);
  };

  const handleUnbanUser = async (user: any) => {
    if (!confirm(`"${user.username}" kullanıcısının banını kaldırmak istiyor musunuz?`)) return;
    setBanningId(user.id);
    try {
      await adminAPI.unbanUser(user.id);
      await loadBannedUsers();
      await loadData();
    } catch {
      alert('Ban kaldırma başarısız');
    }
    setBanningId(null);
  };

  const handleTabChange = (tab: 'users' | 'bots' | 'prizes' | 'instagram' | 'banned' | 'guildchat') => {
    setActiveTab(tab);
    if (tab === 'bots') { if (bots.length === 0) loadBots(); loadAutoAttackRules(); }
    if (tab === 'prizes') loadPrizeRequests();
    if (tab === 'instagram') loadIgRequests();
    if (tab === 'banned') loadBannedUsers();
    if (tab === 'guildchat') loadGuildChats();
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      level: user.level,
      experience: user.experience,
      league: user.league,
      is_active: user.is_active,
      is_admin: user.is_admin,
    });
    setResourceForm({
      gold: Math.round(user.resources?.gold || 0),
      wood: Math.round(user.resources?.wood || 0),
      food: Math.round(user.resources?.food || 0),
      energy: Math.round(user.resources?.energy || 0),
    });
    setMessage('');
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminAPI.updateUser(editUser.id, editForm);
      await adminAPI.updateResources(editUser.id, resourceForm);
      setMessage('✅ Kaydedildi!');
      await loadData();
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('❌ Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: any) => {
    if (!confirm(`"${user.username}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
    try {
      await adminAPI.deleteUser(user.id);
      setEditUser(null);
      await loadData();
    } catch {
      alert('Silme işlemi başarısız');
    }
  };

  const handleCreateBots = async () => {
    if (!confirm('1000 bot oluşturulacak. Devam edilsin mi?')) return;
    setCreating(true);
    setBotMsg('');
    try {
      const res = await adminAPI.createBots(1000);
      setBotMsg(`✅ ${res.data.message}`);
      await loadBots();
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleBotAttack = async () => {
    setAttacking(true);
    setAttackResults([]);
    setBotMsg('');
    try {
      const res = await adminAPI.triggerBotAttack({ count: attackCount });
      setAttackResults(res.data.data.results);
      setBotMsg(`✅ ${res.data.message}`);
      await loadBots();
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setAttacking(false);
    }
  };

  const handleBoostArmies = async () => {
    if (!confirm(`Tüm botlara +${boostArcher} okçu, +${boostInfantry} piyade, +${boostCavalry} süvari eklenecek. Devam?`)) return;
    setBoosting(true);
    setBotMsg('');
    try {
      const res = await adminAPI.boostBotArmies({ archerAdd: boostArcher, infantryAdd: boostInfantry, cavalryAdd: boostCavalry });
      setBotMsg(`✅ ${res.data.message}`);
      await loadBots();
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setBoosting(false);
    }
  };

  const handleBoostSeedResources = async () => {
    if (!seedGold && !seedWood && !seedFood) return;
    if (!confirm(`Tüm seed oyunculara +${seedGold} altın, +${seedWood} odun, +${seedFood} yiyecek eklenecek (mevcut üzerine eklenir). Devam?`)) return;
    setSeedResLoading(true);
    setBotMsg('');
    try {
      const res = await adminAPI.boostSeedResources({ goldAdd: seedGold, woodAdd: seedWood, foodAdd: seedFood });
      setBotMsg(`✅ ${res.data.message}`);
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setSeedResLoading(false);
    }
  };

  const handleSetSeedResources = async () => {
    if (!confirm(`Tüm seed oyuncuların kaynakları rastgele aralıkta belirlenecek:\nAltın: ${setGoldMin.toLocaleString()} - ${setGoldMax.toLocaleString()}\nOdun: ${setWoodMin.toLocaleString()} - ${setWoodMax.toLocaleString()}\nYiyecek: ${setFoodMin.toLocaleString()} - ${setFoodMax.toLocaleString()}\nDevam?`)) return;
    setSetResLoading(true);
    setBotMsg('');
    try {
      const res = await adminAPI.setSeedResources({ goldMin: setGoldMin, goldMax: setGoldMax, woodMin: setWoodMin, woodMax: setWoodMax, foodMin: setFoodMin, foodMax: setFoodMax });
      setBotMsg(`✅ ${res.data.message}`);
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setSetResLoading(false);
    }
  };

  const handleForceBattle = async () => {
    if (!forceAttackerId || !forceDefenderId) { setBotMsg('❌ Her iki oyuncu ID\'si gerekli.'); return; }
    if (!confirm(`#${forceAttackerId} vs #${forceDefenderId} savaşı başlatılacak. Devam?`)) return;
    setForceBattleLoading(true);
    setForceBattleResult(null);
    setBotMsg('');
    try {
      const res = await adminAPI.forceBattle(parseInt(forceAttackerId), parseInt(forceDefenderId));
      setForceBattleResult(res.data.data);
      setBotMsg(`✅ ${res.data.message}`);
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setForceBattleLoading(false);
    }
  };

  const loadAutoAttackRules = async () => {
    try {
      const r = await adminAPI.getAutoAttackRules();
      setAutoAttackRules(r.data.data.rules);
      const custom = r.data.data.rules.find((x: any) => x.id === 'custom');
      if (custom) setCustomThreshold(custom.threshold);
    } catch { /* ignore */ }
  };

  const handleToggleRule = async (id: string) => {
    setAutoAttackLoading(true);
    try {
      const r = await adminAPI.toggleAutoAttackRule(id);
      setAutoAttackRules(prev => prev.map(rule => rule.id === id ? r.data.data.rule : rule));
    } catch { alert('Kural değiştirilemedi'); }
    setAutoAttackLoading(false);
  };

  const handleSetCustomThreshold = async () => {
    setAutoAttackLoading(true);
    try {
      const r = await adminAPI.setCustomAttackThreshold(customThreshold);
      setAutoAttackRules(r.data.data.rules);
      setBotMsg(`✅ ${r.data.message}`);
    } catch { setBotMsg('❌ Hata oluştu'); }
    setAutoAttackLoading(false);
  };

  const handleBoostSeedArmies = async () => {
    const power = seedArcher * 3 + seedInfantry * 2 + seedCavalry * 5;
    if (!confirm(`Tüm seed oyunculara +${seedArcher} okçu, +${seedInfantry} piyade, +${seedCavalry} süvari eklenecek (+${power} güç). Devam?`)) return;
    setSeedBoosting(true);
    setBotMsg('');
    try {
      const res = await adminAPI.boostSeedArmies({ archerAdd: seedArcher, infantryAdd: seedInfantry, cavalryAdd: seedCavalry });
      setBotMsg(`✅ ${res.data.message}`);
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setSeedBoosting(false);
    }
  };

  const handleAttackUser = async () => {
    const uid = parseInt(targetUserId);
    if (!uid || uid <= 0) { setBotMsg('❌ Geçerli bir kullanıcı ID girin.'); return; }
    if (!confirm(`ID=${uid} kullanıcısına ${targetBotCount} bot saldırısı gönderilecek. Devam?`)) return;
    setAttackingUser(true);
    setBotMsg('');
    try {
      const res = await adminAPI.attackSpecificUser({ targetUserId: uid, botCount: targetBotCount });
      setAttackResults(res.data.data.results);
      setBotMsg(`✅ ${res.data.message}`);
    } catch (e: any) {
      setBotMsg(`❌ ${e.response?.data?.message || 'Hata oluştu'}`);
    } finally {
      setAttackingUser(false);
    }
  };

  const getSortValue = (u: any) => {
    switch (sortBy) {
      case 'id':         return u.id;
      case 'level':      return u.level;
      case 'gold':       return u.resources?.gold || 0;
      case 'wood':       return u.resources?.wood || 0;
      case 'food':       return u.resources?.food || 0;
      case 'tlcoin':     return u.tlcoin_balance || 0;
      case 'power':      return u.army_power || 0;
      case 'created_at': return new Date(u.created_at).getTime();
      default:           return u.id;
    }
  };

  const filtered = users
    .filter(u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = getSortValue(a), bv = getSortValue(b);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const leagueColor: any = { 'Ticaret': '#3b82f6', 'Üretim': '#22c55e', 'Korsan': '#ef4444' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <p style={{ color: '#fff', fontSize: 20 }}>Admin paneli yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Admin Paneli</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Island Empire Yönetim</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/home')}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          ← Ana Sayfa
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Toplam Oyuncu', value: stats.total_users, emoji: '👥', color: '#3b82f6' },
              { label: 'Bugün Aktif',   value: stats.active_today, emoji: '🟢', color: '#22c55e' },
              { label: 'Toplam Savaş', value: stats.total_battles, emoji: '⚔️', color: '#ef4444' },
              { label: 'Toplam Lonca', value: stats.total_guilds,  emoji: '🏰', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px 16px', border: `1px solid ${s.color}33` }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Butonları */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'users',     label: '👥 Oyuncular' },
            { key: 'bots',      label: '🤖 Bot Yönetimi' },
            { key: 'prizes',    label: '🎁 Ödül Talepleri' },
            { key: 'instagram', label: '📸 Instagram Boost' },
            { key: 'banned',    label: '🚫 Banlanan Oyuncular' },
            { key: 'guildchat', label: '💬 Guild Sohbetleri' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key as any)}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14,
                background: activeTab === t.key ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.07)',
                color: activeTab === t.key ? '#fff' : '#64748b',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OYUNCULAR SEKMESİ ─────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="🔍 Oyuncu ara (kullanıcı adı veya e-posta)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {[
                        { label: 'ID',       col: 'id' },
                        { label: 'Kullanıcı', col: null },
                        { label: 'E-posta',  col: null },
                        { label: 'Seviye',   col: 'level' },
                        { label: 'Lig',      col: null },
                        { label: 'Altın',    col: 'gold' },
                        { label: 'Odun',     col: 'wood' },
                        { label: 'Yiyecek',  col: 'food' },
                        { label: 'TLCoin',   col: 'tlcoin' },
                        { label: 'Ada',      col: null },
                        { label: '⚔️ Güç',   col: 'power' },
                        { label: 'Durum',    col: null },
                        { label: 'Kayıt',    col: 'created_at' },
                        { label: 'İşlem',    col: null },
                      ].map(({ label, col }) => (
                        <th
                          key={label}
                          onClick={col ? () => handleSort(col) : undefined}
                          style={{
                            padding: '12px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap',
                            color: col && sortBy === col ? '#f1f5f9' : '#64748b',
                            cursor: col ? 'pointer' : 'default',
                            userSelect: 'none',
                          }}
                        >
                          {label}{col && sortBy === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : col ? ' ⇅' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{u.id}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{u.username}</span>
                            {u.is_admin && <span style={{ background: '#f59e0b22', color: '#f59e0b', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>ADMIN</span>}
                            {!u.is_active && <span style={{ background: '#ef444422', color: '#ef4444', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>BANLANDI</span>}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</td>
                        <td style={{ padding: '10px 14px' }}><span style={{ color: '#06b6d4', fontWeight: 600 }}>Lvl {u.level}</span></td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: `${leagueColor[u.league]}22`, color: leagueColor[u.league], padding: '3px 8px', borderRadius: 10, fontSize: 12 }}>
                            {u.league}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#f59e0b' }}>{Math.round(u.resources?.gold || 0)}</td>
                        <td style={{ padding: '10px 14px', color: '#22c55e' }}>{Math.round(u.resources?.wood || 0)}</td>
                        <td style={{ padding: '10px 14px', color: '#ef4444' }}>{Math.round(u.resources?.food || 0)}</td>
                        <td style={{ padding: '10px 14px', color: '#38bdf8', fontWeight: 600 }}>{Math.round(u.tlcoin_balance || 0)}</td>
                        <td style={{ padding: '10px 14px', color: '#a78bfa' }}>{u.island_count} ada</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ color: '#f97316', fontWeight: 700, fontSize: 13 }}>{u.army_power ?? 0}</span>
                            <span style={{ color: '#475569', fontSize: 10 }}>
                              🏹{u.archer_count ?? 0} ⚔️{u.infantry_count ?? 0} 🐴{u.cavalry_count ?? 0}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.is_active ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(u.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button
                            onClick={() => openEdit(u)}
                            style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                          >
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Oyuncu bulunamadı</div>
              )}
            </div>
            <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
              Toplam {filtered.length} / {users.length} oyuncu gösteriliyor
            </div>
          </>
        )}

        {/* ── BOT SEKMESİ ───────────────────────────────────────────────── */}
        {activeTab === 'bots' && (
          <>
            {/* Bot özet kart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>🤖</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#a78bfa' }}>{botTotal}</div>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Toplam Bot</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>⚔️</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#f87171' }}>
                  {bots.reduce((s, b) => s + (b.attack_count || 0), 0)}
                </div>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Toplam Bot Saldırısı</div>
              </div>
            </div>

            {/* Bot oluştur */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>🤖 Bot Oluştur</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                Tek seferlik 1000 bot oluşturur. Her bot rastgele güç seviyesine sahip olur. Zaten bot varsa ek bot oluşturur.
              </p>
              <button
                onClick={handleCreateBots}
                disabled={creating}
                style={{
                  padding: '11px 24px', borderRadius: 10, border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: 14, opacity: creating ? 0.6 : 1,
                  background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff',
                }}
              >
                {creating ? '⏳ Oluşturuluyor...' : '🤖 1000 Bot Oluştur'}
              </button>
            </div>

            {/* Bot saldırısı */}
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#f87171' }}>⚔️ Bot Saldırısı Başlat</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                Kalkanı olmayan rastgele botlar, kalkanı olmayan rastgele gerçek oyunculara saldırır.
                Bot kazanırsa kaynak yağmalar ve savunana 3 saatlik kalkan uygulanır.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ color: '#94a3b8', fontSize: 13 }}>Saldırı Sayısı:</label>
                  <input
                    type="number" min={1} max={50} value={attackCount}
                    onChange={e => setAttackCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{ width: 70, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14, textAlign: 'center' }}
                  />
                  <span style={{ color: '#475569', fontSize: 12 }}>(max 50)</span>
                </div>
                <button
                  onClick={handleBotAttack}
                  disabled={attacking}
                  style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: attacking ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14, opacity: attacking ? 0.6 : 1,
                    background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff',
                  }}
                >
                  {attacking ? '⚔️ Saldırıyor...' : `⚔️ ${attackCount} Saldırı Başlat`}
                </button>
              </div>
            </div>

            {/* Bot ordularına güç ekle */}
            <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#c084fc' }}>⚔️ Tüm Bot Ordularına Güç Ekle</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                Seçilen asker sayısı tüm botlara eklenir. Bot kayıplarını telafi etmek için kullan.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                {[
                  { label: '🏹 Okçu (×3 güç)', val: boostArcher, set: setBoostArcher },
                  { label: '⚔️ Piyade (×2 güç)', val: boostInfantry, set: setBoostInfantry },
                  { label: '🐴 Süvari (×5 güç)', val: boostCavalry, set: setBoostCavalry },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type="number" min={0} max={500} value={f.val}
                      onChange={e => f.set(Math.min(500, Math.max(0, parseInt(e.target.value) || 0)))}
                      style={{ width: 80, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14, textAlign: 'center' }}
                    />
                  </div>
                ))}
                <div style={{ color: '#a78bfa', fontSize: 12, alignSelf: 'center' }}>
                  → +{boostArcher * 3 + boostInfantry * 2 + boostCavalry * 5} güç/bot
                </div>
                <button
                  onClick={handleBoostArmies}
                  disabled={boosting || (boostArcher === 0 && boostInfantry === 0 && boostCavalry === 0)}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none', cursor: boosting ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14, opacity: boosting ? 0.6 : 1,
                    background: 'linear-gradient(135deg,#8b5cf6,#a855f7)', color: '#fff',
                  }}
                >
                  {boosting ? '⏳ Ekleniyor...' : '⚡ Güç Ekle'}
                </button>
              </div>
            </div>

            {/* Seed oyuncu ordularına toplu güç ekle */}
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#4ade80' }}>🌱 Seed Oyuncu Ordularına Güç Ekle</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>@islandsempire.com</code> e-postalı tüm seed oyuncuların ordusuna toplu ekleme yapar.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                {[
                  { label: '🏹 Okçu (×3)', val: seedArcher,   set: setSeedArcher   },
                  { label: '⚔️ Piyade (×2)', val: seedInfantry, set: setSeedInfantry },
                  { label: '🐴 Süvari (×5)', val: seedCavalry,  set: setSeedCavalry  },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type="number" min={0} max={1000} value={f.val}
                      onChange={e => f.set(Math.min(1000, Math.max(0, parseInt(e.target.value) || 0)))}
                      style={{ width: 80, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14, textAlign: 'center' }}
                    />
                  </div>
                ))}
                <div style={{ color: '#4ade80', fontSize: 12, alignSelf: 'center' }}>
                  → +{seedArcher * 3 + seedInfantry * 2 + seedCavalry * 5} güç/oyuncu
                </div>
                <button
                  onClick={handleBoostSeedArmies}
                  disabled={seedBoosting || (seedArcher === 0 && seedInfantry === 0 && seedCavalry === 0)}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none',
                    cursor: seedBoosting ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14,
                    opacity: seedBoosting ? 0.6 : 1,
                    background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff',
                  }}
                >
                  {seedBoosting ? '⏳ Ekleniyor...' : '🌱 Seed Ordularını Güçlendir'}
                </button>
              </div>
            </div>

            {/* Seed oyunculara toplu kaynak ekle */}
            <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>🌱 Seed Oyunculara Toplu Kaynak Ekle</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                Tüm <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>@islandsempire.com</code> seed oyuncularına kaynak ekler.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                {[
                  { label: '💰 Altın', val: seedGold, set: setSeedGold },
                  { label: '🪵 Odun',  val: seedWood,  set: setSeedWood },
                  { label: '🍎 Yiyecek', val: seedFood, set: setSeedFood },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input type="number" min={0} value={f.val} onChange={e => f.set(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ width: 90, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14, textAlign: 'center' }} />
                  </div>
                ))}
                <button onClick={handleBoostSeedResources} disabled={seedResLoading}
                  style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: seedResLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: seedResLoading ? 0.6 : 1, background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', color: '#000' }}>
                  {seedResLoading ? '⏳ Ekleniyor...' : '💰 Kaynakları Ekle'}
                </button>
              </div>
            </div>

            {/* Seed kaynaklarını aralıkta ata */}
            <div style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#c084fc' }}>🎲 Seed Kaynaklarını Aralıkta Ata (SET)</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                Her seed oyuncusuna min-max arasında rastgele kaynak atar. Mevcut değerin üzerine yazar.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                {[
                  { label: '💰 Altın Min', val: setGoldMin, set: setSetGoldMin },
                  { label: '💰 Altın Max', val: setGoldMax, set: setSetGoldMax },
                  { label: '🪵 Odun Min',  val: setWoodMin, set: setSetWoodMin },
                  { label: '🪵 Odun Max',  val: setWoodMax, set: setSetWoodMax },
                  { label: '🍎 Yiyecek Min', val: setFoodMin, set: setSetFoodMin },
                  { label: '🍎 Yiyecek Max', val: setFoodMax, set: setSetFoodMax },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input type="number" min={0} value={f.val} onChange={e => f.set(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <button onClick={handleSetSeedResources} disabled={setResLoading}
                style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: setResLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: setResLoading ? 0.6 : 1, background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff' }}>
                {setResLoading ? '⏳ Atanıyor...' : '🎲 Kaynakları Ata'}
              </button>
            </div>

            {/* Otomatik Saldırı Kuralları */}
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#f87171' }}>🤖 Otomatik Saldırı Kuralları</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
                Aktif kurallar her 5 dakikada kontrol edilir. Kalkanı olan oyunculara saldırılmaz.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {autoAttackRules.filter(r => r.id !== 'custom').map(rule => (
                  <div key={rule.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 10,
                    background: rule.active ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${rule.active ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, color: rule.active ? '#f87171' : '#94a3b8', fontSize: 14 }}>{rule.label}</span>
                      <span style={{ marginLeft: 10, fontSize: 12, color: '#475569' }}>
                        {rule.active ? '● Aktif' : '○ Pasif'}
                      </span>
                    </div>
                    <button onClick={() => handleToggleRule(rule.id)} disabled={autoAttackLoading}
                      style={{
                        padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                        background: rule.active ? '#ef4444' : '#22c55e', color: '#fff', opacity: autoAttackLoading ? 0.6 : 1,
                      }}>
                      {rule.active ? 'Pasif Et' : 'Aktif Et'}
                    </button>
                  </div>
                ))}

                {/* Custom threshold */}
                {autoAttackRules.filter(r => r.id === 'custom').map(rule => (
                  <div key={rule.id} style={{
                    padding: '12px 16px', borderRadius: 10,
                    background: rule.active ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${rule.active ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, color: rule.active ? '#f87171' : '#94a3b8', fontSize: 14 }}>Özel Eşik</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>{rule.active ? '● Aktif' : '○ Pasif'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Altın Eşiği</label>
                        <input type="number" min={1} value={customThreshold}
                          onChange={e => setCustomThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ width: 140, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14 }} />
                      </div>
                      <button onClick={handleSetCustomThreshold} disabled={autoAttackLoading}
                        style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#334155', color: '#e2e8f0', fontSize: 13, marginTop: 16 }}>
                        Güncelle
                      </button>
                      <button onClick={() => handleToggleRule(rule.id)} disabled={autoAttackLoading}
                        style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: rule.active ? '#ef4444' : '#22c55e', color: '#fff', marginTop: 16 }}>
                        {rule.active ? 'Pasif Et' : 'Aktif Et'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zorla savaş */}
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#f87171' }}>⚔️ İki Oyuncuyu Savaştır</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                Herhangi iki oyuncuyu savaştır. Kalkan/limit kontrolü yoktur.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Saldıran ID</label>
                  <input type="number" min={1} value={forceAttackerId} onChange={e => setForceAttackerId(e.target.value)} placeholder="Örn: 5"
                    style={{ width: 100, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Savunan ID</label>
                  <input type="number" min={1} value={forceDefenderId} onChange={e => setForceDefenderId(e.target.value)} placeholder="Örn: 12"
                    style={{ width: 100, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14 }} />
                </div>
                <button onClick={handleForceBattle} disabled={forceBattleLoading || !forceAttackerId || !forceDefenderId}
                  style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: (forceBattleLoading || !forceAttackerId || !forceDefenderId) ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: (forceBattleLoading || !forceAttackerId || !forceDefenderId) ? 0.6 : 1, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}>
                  {forceBattleLoading ? '⏳ Savaşıyor...' : '⚔️ Savaşı Başlat'}
                </button>
              </div>
              {forceBattleResult && (
                <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: 10, fontSize: 13 }}>
                  <div style={{ marginBottom: 6, fontWeight: 700, color: '#f87171' }}>Savaş Sonucu</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: '#94a3b8' }}>
                    <span>Saldıran: <strong style={{ color: '#e2e8f0' }}>{forceBattleResult.attacker}</strong> ({forceBattleResult.attackerPower} güç)</span>
                    <span>Savunan: <strong style={{ color: '#e2e8f0' }}>{forceBattleResult.defender}</strong> ({forceBattleResult.defenderPower} güç)</span>
                    <span style={{ gridColumn: '1/-1', color: '#34d399', fontWeight: 700 }}>Kazanan: {forceBattleResult.winner}</span>
                    <span>💰 {forceBattleResult.rewardGold} altın</span>
                    <span>🪵 {forceBattleResult.rewardWood} odun</span>
                    <span>🍎 {forceBattleResult.rewardFood} yiyecek</span>
                    <span>⭐ {forceBattleResult.rewardXp} XP</span>
                  </div>
                </div>
              )}
            </div>

            {/* Belirli kullanıcıya bot saldırısı */}
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>🎯 Belirli Kullanıcıya Bot Saldırısı</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                ID'sini girdiğin kullanıcıya rastgele botlar saldırır. Admin kullanıcılar korunur.
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Kullanıcı ID</label>
                  <input
                    type="number" min={1} value={targetUserId}
                    onChange={e => setTargetUserId(e.target.value)}
                    placeholder="Örn: 42"
                    style={{ width: 100, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Bot Sayısı (max 10)</label>
                  <input
                    type="number" min={1} max={10} value={targetBotCount}
                    onChange={e => setTargetBotCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{ width: 70, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 14, textAlign: 'center' }}
                  />
                </div>
                <button
                  onClick={handleAttackUser}
                  disabled={attackingUser || !targetUserId}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none', cursor: (attackingUser || !targetUserId) ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14, opacity: (attackingUser || !targetUserId) ? 0.6 : 1,
                    background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff',
                  }}
                >
                  {attackingUser ? '⏳ Saldırıyor...' : `🎯 ${targetBotCount} Bot Gönder`}
                </button>
              </div>
            </div>

            {/* Mesaj */}
            {botMsg && (
              <div style={{
                padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14,
                background: botMsg.startsWith('✅') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${botMsg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: botMsg.startsWith('✅') ? '#4ade80' : '#f87171',
              }}>
                {botMsg}
              </div>
            )}

            {/* Saldırı sonuçları */}
            {attackResults.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Son Saldırı Sonuçları</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {attackResults.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8,
                      background: r.winner === 'attacker' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${r.winner === 'attacker' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      fontSize: 13,
                    }}>
                      <span>{r.winner === 'attacker' ? '✅' : '❌'} Bot #{r.bot_id} → <strong>{r.target_username}</strong></span>
                      {r.winner === 'attacker' && r.reward_gold > 0 && (
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>+{r.reward_gold}💰</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bot listesi */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>🤖 Bot Listesi ({botTotal})</p>
                <button onClick={loadBots} disabled={botLoading} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {botLoading ? '⏳' : '↻ Yenile'}
                </button>
              </div>
              {botLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>Yükleniyor...</div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0 }}>
                      <tr style={{ background: '#0f172a' }}>
                        {['ID', 'Bot Adı', 'Seviye', 'Güç', 'Okçu', 'Piyade', 'Süvari', 'Saldırı', 'Son Saldırı', 'Kalkan'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bots.map((b, i) => {
                        const shielded = b.shield_until && new Date(b.shield_until) > new Date();
                        return (
                          <tr key={b.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>{b.id}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#a78bfa' }}>{b.username}</td>
                            <td style={{ padding: '8px 12px', color: '#06b6d4' }}>Lv{b.level}</td>
                            <td style={{ padding: '8px 12px', color: '#f97316', fontWeight: 700 }}>{b.total_power}</td>
                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{b.archer_count}</td>
                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{b.infantry_count}</td>
                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{b.cavalry_count}</td>
                            <td style={{ padding: '8px 12px', color: '#ef4444', fontWeight: 700 }}>{b.attack_count}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {b.last_attack_at ? new Date(b.last_attack_at).toLocaleDateString('tr-TR') : '—'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              {shielded
                                ? <span style={{ color: '#3b82f6', fontSize: 12 }}>🛡️ Aktif</span>
                                : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {bots.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      Henüz bot yok. "1000 Bot Oluştur" butonunu kullan.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {/* ── ÖDÜL TALEPLERİ SEKMESİ ──────────────────────────────────── */}
        {activeTab === 'prizes' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
                Pending talepler önce gösterilir. Reddedilirse TLCoin otomatik iade edilir.
              </p>
              <button onClick={loadPrizeRequests} disabled={prizeLoading} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {prizeLoading ? '⏳' : '↻ Yenile'}
              </button>
            </div>

            {prizeLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Yükleniyor...</div>
            ) : prizeRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Henüz ödül talebi yok.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {prizeRequests.map(req => {
                  const isPending = req.status === 'pending';
                  const statusClr = req.status === 'approved' ? '#22c55e' : req.status === 'rejected' ? '#ef4444' : '#f59e0b';
                  const statusLbl = req.status === 'approved' ? 'Onaylandı' : req.status === 'rejected' ? 'Reddedildi' : 'Beklemede';
                  const noteId = `note-${req.id}`;
                  return (
                    <div key={req.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: isPending ? 12 : 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 4px', color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>{req.prize_name}</p>
                          <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>
                            👤 {req.username} · {req.email} · 🪙 {req.tlcoin_cost} TLCoin · {new Date(req.created_at).toLocaleDateString('tr-TR')}
                          </p>
                          {req.admin_note && (
                            <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 12, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                              Not: {req.admin_note}
                            </p>
                          )}
                        </div>
                        <span style={{ background: `${statusClr}22`, color: statusClr, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 99, border: `1px solid ${statusClr}44`, whiteSpace: 'nowrap' }}>
                          {statusLbl}
                        </span>
                      </div>
                      {isPending && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            id={noteId}
                            placeholder="Admin notu (isteğe bağlı)"
                            style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13 }}
                          />
                          <button
                            onClick={() => handlePrizeAction(req.id, 'approved', (document.getElementById(noteId) as HTMLInputElement)?.value || '')}
                            disabled={prizeActionId === req.id}
                            style={{ background: '#22c55e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 16px', cursor: 'pointer', opacity: prizeActionId === req.id ? 0.6 : 1 }}
                          >
                            ✓ Onayla
                          </button>
                          <button
                            onClick={() => handlePrizeAction(req.id, 'rejected', (document.getElementById(noteId) as HTMLInputElement)?.value || '')}
                            disabled={prizeActionId === req.id}
                            style={{ background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 16px', cursor: 'pointer', opacity: prizeActionId === req.id ? 0.6 : 1 }}
                          >
                            ✗ Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── INSTAGRAM BOOST SEKMESİ ──────────────────────────────────── */}
        {activeTab === 'instagram' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ color: '#64748b', fontSize: 13 }}>
                Oyuncuların Instagram takip istekleri. Onayla → boost aktif, Reddet → oyuncu tekrar gönderebilir.
              </p>
              <button onClick={loadIgRequests} disabled={igLoading} style={{ background: 'none', border: 'none', color: '#e1306c', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {igLoading ? '⏳' : '↻ Yenile'}
              </button>
            </div>

            {igLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Yükleniyor...</div>
            ) : igRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Henüz Instagram boost isteği yok.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {igRequests.map((req: any) => {
                  const statusClr = req.instagram_boost_active ? '#22c55e' : req.instagram_request_status === 'pending' ? '#f59e0b' : '#ef4444';
                  const statusLbl = req.instagram_boost_active ? 'AKTİF' : req.instagram_request_status === 'pending' ? 'BEKLİYOR' : 'REDDEDİLDİ';
                  const isPending = req.instagram_request_status === 'pending';
                  const isActive  = req.instagram_boost_active;
                  return (
                    <div key={req.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>
                          {req.username}
                          <span style={{ marginLeft: 8, background: `${statusClr}22`, color: statusClr, fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>{statusLbl}</span>
                        </p>
                        <p style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                          Instagram: <strong style={{ color: '#e1306c' }}>@{req.instagram_username}</strong>
                          {req.instagram_verified_at && <span style={{ marginLeft: 8, color: '#475569', fontSize: 11 }}>Onaylandı: {new Date(req.instagram_verified_at).toLocaleDateString('tr-TR')}</span>}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleIgAction(req.id, 'approve')}
                              disabled={igActionId === req.id}
                              style={{ background: '#22c55e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer', opacity: igActionId === req.id ? 0.6 : 1 }}
                            >
                              ✓ Onayla
                            </button>
                            <button
                              onClick={() => handleIgAction(req.id, 'reject')}
                              disabled={igActionId === req.id}
                              style={{ background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer', opacity: igActionId === req.id ? 0.6 : 1 }}
                            >
                              ✗ Reddet
                            </button>
                          </>
                        )}
                        {isActive && (
                          <button
                            onClick={() => handleIgAction(req.id, 'revoke')}
                            disabled={igActionId === req.id}
                            style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: '#ef4444', fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer', opacity: igActionId === req.id ? 0.6 : 1 }}
                          >
                            Boost İptal
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setEditUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'relative', background: '#1e293b', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>✏️ {editUser.username}</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{editUser.email}</p>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>OYUNCU BİLGİLERİ</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Seviye</label>
                  <input
                    type="number" min="1" max="100"
                    value={editForm.level}
                    onChange={e => setEditForm({ ...editForm, level: parseInt(e.target.value) })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Deneyim (XP)</label>
                  <input
                    type="number" min="0"
                    value={editForm.experience}
                    onChange={e => setEditForm({ ...editForm, experience: parseInt(e.target.value) })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Lig</label>
                <select
                  value={editForm.league}
                  onChange={e => setEditForm({ ...editForm, league: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14 }}
                >
                  <option>Ticaret</option>
                  <option>Üretim</option>
                  <option>Korsan</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} />
                  <span style={{ fontSize: 13 }}>Aktif Hesap</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input type="checkbox" checked={editForm.is_admin} onChange={e => setEditForm({ ...editForm, is_admin: e.target.checked })} />
                  <span style={{ fontSize: 13 }}>Admin Yetkisi</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>KAYNAKLAR</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'gold',   label: '💰 Altın',    color: '#f59e0b' },
                  { key: 'wood',   label: '🪵 Odun',     color: '#22c55e' },
                  { key: 'food',   label: '🍎 Yiyecek',  color: '#ef4444' },
                  { key: 'energy', label: '⚡ Enerji',   color: '#06b6d4' },
                ].map(r => (
                  <div key={r.key}>
                    <label style={{ fontSize: 12, color: r.color, display: 'block', marginBottom: 4 }}>{r.label}</label>
                    <input
                      type="number" min="0"
                      value={resourceForm[r.key]}
                      onChange={e => setResourceForm({ ...resourceForm, [r.key]: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: `1px solid ${r.color}44`, borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {message && (
              <div style={{ textAlign: 'center', padding: '8px', marginBottom: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 14 }}>
                {message}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={saveUser}
                disabled={saving}
                style={{ flex: 1, background: '#3b82f6', border: 'none', color: '#fff', padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
              {editUser && !editUser.is_active ? (
                <button
                  onClick={() => handleUnbanUser(editUser)}
                  disabled={banningId === editUser?.id}
                  style={{ background: '#22c55e', border: 'none', color: '#fff', padding: '12px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  {banningId === editUser?.id ? '...' : '✅ Banı Kaldır'}
                </button>
              ) : (
                <button
                  onClick={() => handleBanUser(editUser)}
                  disabled={banningId === editUser?.id}
                  style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '12px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  {banningId === editUser?.id ? '...' : '🚫 Banla'}
                </button>
              )}
              <button
                onClick={() => deleteUser(editUser)}
                title="Kalıcı Sil"
                style={{ background: '#1e293b', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}
        {/* ── BANLANAN OYUNCULAR SEKMESİ ─────────────────────────────────── */}
        {activeTab === 'banned' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ color: '#64748b', fontSize: 13 }}>
                Banlanan oyuncuların tüm verileri burda saklanır. Kanıt olarak kullanabilirsiniz.
              </p>
              <button onClick={loadBannedUsers} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Yenile
              </button>
            </div>

            {bannedLoading ? (
              <p style={{ color: '#64748b' }}>Yükleniyor...</p>
            ) : bannedUsers.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Banlanan oyuncu yok.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {['ID', 'Kullanıcı', 'Email', 'Ban Tarihi', 'Ban Sebebi', 'Sev.', 'Altın', 'Odun', 'Yiyecek', 'Ordu Gücü', 'Piyade', 'Okçu', 'Süvari', 'Savaş', 'Galibiyet', 'İşlem'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bannedUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,0,0,0.03)' }}>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{u.id}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f87171' }}>{u.username}</td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{u.email}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {u.banned_at ? new Date(u.banned_at).toLocaleString('tr-TR') : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#fbbf24', maxWidth: 200 }}>
                          {u.ban_reason || <span style={{ color: '#475569' }}>Sebep belirtilmedi</span>}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#06b6d4' }}>{u.level}</td>
                        <td style={{ padding: '8px 12px', color: '#f59e0b' }}>{Number(u.gold).toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px 12px', color: '#22c55e' }}>{Number(u.wood).toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px 12px', color: '#ef4444' }}>{Number(u.food).toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px 12px', color: '#f97316', fontWeight: 700 }}>{u.army_power}</td>
                        <td style={{ padding: '8px 12px' }}>{u.infantry_count}</td>
                        <td style={{ padding: '8px 12px' }}>{u.archer_count}</td>
                        <td style={{ padding: '8px 12px' }}>{u.cavalry_count}</td>
                        <td style={{ padding: '8px 12px' }}>{u.total_battles}</td>
                        <td style={{ padding: '8px 12px', color: '#34d399' }}>{u.battle_wins}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <button
                            onClick={() => handleUnbanUser(u)}
                            disabled={banningId === u.id}
                            style={{ background: '#22c55e', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                          >
                            {banningId === u.id ? '...' : 'Banı Kaldır'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* ── GUILD SOHBETLERİ SEKMESİ ─────────────────────────────────── */}
        {activeTab === 'guildchat' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                value={selectedGuildId}
                onChange={e => { setSelectedGuildId(e.target.value); loadGuildChats(e.target.value || undefined); }}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', padding: '8px 14px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
              >
                <option value="">Tüm Guildler</option>
                {guildList.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button onClick={() => loadGuildChats(selectedGuildId || undefined)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Yenile
              </button>
              <span style={{ color: '#64748b', fontSize: 13 }}>Son 100 mesaj gösteriliyor</span>
            </div>

            {chatLoading ? (
              <p style={{ color: '#64748b' }}>Yükleniyor...</p>
            ) : guildChats.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Mesaj bulunamadı.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {guildChats.map((msg: any) => (
                  <div key={msg.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 13 }}>{msg.username}</span>
                        <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>🏰 {msg.guild_name}</span>
                        <span style={{ color: '#475569', fontSize: 11 }}>{new Date(msg.created_at).toLocaleString('tr-TR')}</span>
                      </div>
                      <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, wordBreak: 'break-word' }}>{msg.message}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteChatMessage(msg.id)}
                      title="Mesajı sil"
                      style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                    >
                      🗑️ Sil
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}

export default AdminPage;
