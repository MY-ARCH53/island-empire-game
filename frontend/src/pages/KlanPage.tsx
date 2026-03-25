import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { guildAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

// ── Sabitler ────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; icon: string }> = {
  'leader':    { label: 'Kurucu',     color: '#fbbf24', icon: '👑' },
  'co-leader': { label: 'Ko-Lider',   color: '#f97316', icon: '🔱' },
  'officer':   { label: 'Yetkili',    color: '#60a5fa', icon: '⭐' },
  'member':    { label: 'Üye',        color: '#94a3b8', icon: '👤' },
};

const RES_META: Record<string, { icon: string; label: string; color: string }> = {
  gold:   { icon: '💰', label: 'Altın',   color: '#fbbf24' },
  wood:   { icon: '🌲', label: 'Odun',    color: '#86efac' },
  food:   { icon: '🍎', label: 'Yiyecek', color: '#f87171' },
  energy: { icon: '⚡', label: 'Enerji',  color: '#a78bfa' },
};

const CASTLE_LEVELS = [
  { level: 0, name: 'Yıkık Kale',   emoji: '🏚️', color: '#64748b' },
  { level: 1, name: 'Ahşap Kale',   emoji: '🏠', color: '#92400e' },
  { level: 2, name: 'Taş Kale',     emoji: '🏰', color: '#475569' },
  { level: 3, name: 'Güçlü Kale',   emoji: '🏯', color: '#1d4ed8' },
  { level: 4, name: 'Dev Kale',     emoji: '🗼', color: '#7c3aed' },
  { level: 5, name: 'Efsane Kale',  emoji: '⚔️', color: '#b45309' },
];

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n ?? 0);
}

function GuildEmblem({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: `linear-gradient(135deg, hsl(${hue},70%,40%), hsl(${hue + 40},70%,30%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: size * 0.36, color: '#fff',
      flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)',
    }}>
      {initials}
    </div>
  );
}

// ── Ana Sayfa ────────────────────────────────────────────────────────────────

type Tab = 'my' | 'list' | 'create';
type MyTab = 'overview' | 'members' | 'castle' | 'troops' | 'war' | 'chat';

export default function KlanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (!token || !userData) { navigate('/'); return null; }
  const me = JSON.parse(userData);

  const [tab, setTab] = useState<Tab>('my');
  const [myTab, setMyTab] = useState<MyTab>('overview');
  const [loading, setLoading] = useState(true);

  // Veri
  const [myGuild, setMyGuild] = useState<any>(null);
  const [guildDetails, setGuildDetails] = useState<any>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [castle, setCastle] = useState<any>(null);
  const [troops, setTroops] = useState<any>(null);
  const [activeWar, setActiveWar] = useState<any>(null);
  const [warHistory, setWarHistory] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Formlar
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [donateType, setDonateType] = useState('gold');
  const [donateAmount, setDonateAmount] = useState(100);
  const [chatInput, setChatInput] = useState('');
  const [recruitType, setRecruitType] = useState('infantry');
  const [recruitCount, setRecruitCount] = useState(10);
  const [bulletinEdit, setBulletinEdit] = useState('');
  const [showBulletin, setShowBulletin] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [showRename, setShowRename] = useState(false);
  const [warTarget, setWarTarget] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applyGuildId, setApplyGuildId] = useState<number | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMyGuild(); loadGuilds(); }, []);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (myGuild && myTab === 'chat') {
      loadChat();
      const iv = setInterval(loadChat, 5000);
      return () => clearInterval(iv);
    }
  }, [myTab, myGuild]);

  useEffect(() => {
    if (myGuild) {
      loadDetails();
      loadCastle();
      loadTroops();
      loadWar();
    }
  }, [myGuild]);

  const loadMyGuild = async () => {
    try {
      const r = await guildAPI.getUserGuild();
      setMyGuild(r.data.data.guild);
      if (!r.data.data.guild) setTab('list');
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const loadGuilds = async () => {
    try { const r = await guildAPI.list(); setGuilds(r.data.data.guilds); } catch { /* ignore */ }
  };

  const loadDetails = async () => {
    if (!myGuild) return;
    try {
      const r = await guildAPI.getDetails(myGuild.id);
      setGuildDetails(r.data.data);
      setApplications([]);
      if (['leader', 'co-leader', 'officer'].includes(myGuild.role)) {
        const ar = await guildAPI.getApplications(myGuild.id);
        setApplications(ar.data.data.applications);
      }
    } catch { /* ignore */ }
  };

  const loadCastle = async () => {
    if (!myGuild) return;
    try { const r = await guildAPI.getCastle(myGuild.id); setCastle(r.data.data); } catch { /* ignore */ }
  };

  const loadTroops = async () => {
    if (!myGuild) return;
    try { const r = await guildAPI.getTroops(myGuild.id); setTroops(r.data.data.troops); } catch { /* ignore */ }
  };

  const loadWar = async () => {
    if (!myGuild) return;
    try {
      const r = await guildAPI.getActiveWar(myGuild.id);
      setActiveWar(r.data.data.war);
      const hr = await guildAPI.getWarHistory(myGuild.id);
      setWarHistory(hr.data.data.history);
    } catch { /* ignore */ }
  };

  const loadChat = async () => {
    if (!myGuild) return;
    try { const r = await guildAPI.getChatMessages(myGuild.id); setChatMessages(r.data.data.messages); } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      await guildAPI.create(createName.trim(), createDesc.trim());
      showToast('Klan oluşturuldu! 🏰', 'success');
      await loadMyGuild();
      setTab('my');
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleApply = async (guildId: number) => {
    try {
      await guildAPI.apply(guildId, applyMsg);
      showToast('Başvuru gönderildi! 📨', 'success');
      setApplyGuildId(null);
      setApplyMsg('');
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleLeave = async () => {
    if (!confirm('Klandan ayrılmak istediğinize emin misiniz?')) return;
    try {
      await guildAPI.leave(myGuild.id);
      showToast('Klandan ayrıldınız', 'info');
      setMyGuild(null); setGuildDetails(null); setTab('list');
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleDisband = async () => {
    if (!confirm('Klanı dağıtmak istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    try {
      await guildAPI.disband(myGuild.id);
      showToast('Klan dağıtıldı', 'info');
      setMyGuild(null); setGuildDetails(null); setTab('list'); loadGuilds();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleDonate = async () => {
    try {
      await guildAPI.donate(myGuild.id, donateType, donateAmount);
      showToast(`${fmt(donateAmount)} ${donateType} bağışlandı! 🎁`, 'success');
      loadDetails(); loadCastle();
    } catch (e: any) { showToast(e.response?.data?.message || 'Yetersiz kaynak', 'error'); }
  };

  const handleRecruit = async () => {
    try {
      await guildAPI.recruitTroops(myGuild.id, recruitType, recruitCount);
      showToast(`${recruitCount} asker üretildi!`, 'success');
      loadTroops(); loadDetails();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    try {
      await guildAPI.sendMessage(myGuild.id, chatInput.trim());
      setChatInput('');
      loadChat();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleAccept = async (appId: number) => {
    try {
      await guildAPI.acceptApplication(appId, myGuild.id);
      showToast('Kabul edildi! 🎉', 'success');
      loadDetails();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleReject = async (appId: number) => {
    try {
      await guildAPI.rejectApplication(appId);
      showToast('Reddedildi', 'info');
      loadDetails();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleRename = async () => {
    try {
      await guildAPI.rename(myGuild.id, renameInput.trim());
      showToast('Klan adı değiştirildi!', 'success');
      setShowRename(false); loadMyGuild();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleBulletin = async () => {
    try {
      await guildAPI.updateBulletin(myGuild.id, bulletinEdit);
      showToast('İlan tahtası güncellendi', 'success');
      setShowBulletin(false); loadMyGuild(); loadDetails();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleStartWar = async () => {
    const targetId = parseInt(warTarget);
    if (!targetId) return showToast('Hedef klan ID giriniz', 'error');
    try {
      await guildAPI.startWar(myGuild.id, targetId);
      showToast('Savaş ilanı gönderildi! ⚔️', 'success');
      setWarTarget(''); loadWar();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleKick = async (targetId: number) => {
    if (!confirm('Üyeyi klandan çıkarmak istiyor musunuz?')) return;
    try {
      await guildAPI.kick(myGuild.id, targetId);
      showToast('Üye çıkarıldı', 'info');
      loadDetails();
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const S = {
    page: { minHeight: '100vh', background: 'linear-gradient(160deg,#0f172a,#1a1040,#0f172a)', color: '#e2e8f0', fontFamily: "'Segoe UI',sans-serif" } as React.CSSProperties,
    header: { background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 } as React.CSSProperties,
    container: { maxWidth: 900, margin: '0 auto', padding: '20px 16px' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 16 } as React.CSSProperties,
    btn: (color = '#3b82f6') => ({ background: `linear-gradient(135deg,${color},${color}cc)`, border: 'none', borderRadius: 10, color: '#fff', padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 } as React.CSSProperties),
    outBtn: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#94a3b8', padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 } as React.CSSProperties,
    input: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
    tabBar: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' } as React.CSSProperties,
    tabBtn: (active: boolean) => ({ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: active ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : '#64748b' } as React.CSSProperties),
  };

  if (loading) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 32 }}>⚔️</span></div>;

  const myRole = myGuild?.role;
  const isLeader = myRole === 'leader';
  const isCoLeader = myRole === 'co-leader';
  const isOfficer = myRole === 'officer';
  const canManage = isLeader || isCoLeader || isOfficer;
  const castleInfo = CASTLE_LEVELS[Math.min(castle?.level ?? 1, CASTLE_LEVELS.length - 1)];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 22 }}>⚔️</span>
        <span style={{ fontWeight: 800, fontSize: 20 }}>Klan</span>
        {myGuild && (
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>
            {myGuild.name} — {ROLE_META[myRole]?.icon} {ROLE_META[myRole]?.label}
          </span>
        )}
      </div>

      <div style={S.container}>
        {/* Üst sekmeler */}
        <div style={S.tabBar}>
          {myGuild && <button style={S.tabBtn(tab === 'my')} onClick={() => setTab('my')}>🏰 Klanım</button>}
          <button style={S.tabBtn(tab === 'list')} onClick={() => { setTab('list'); loadGuilds(); }}>🔍 Klanları Keşfet</button>
          {!myGuild && <button style={S.tabBtn(tab === 'create')} onClick={() => setTab('create')}>➕ Klan Kur</button>}
        </div>

        {/* ── KLANIM ── */}
        {tab === 'my' && myGuild && (
          <>
            {/* Alt sekmeler */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' as const }}>
              {(['overview','members','castle','troops','war','chat'] as MyTab[]).map(t => {
                const labels: Record<MyTab, string> = { overview: '📊 Genel', members: '👥 Üyeler', castle: '🏰 Kale', troops: '⚔️ Askerler', war: '🔥 Savaş', chat: '💬 Sohbet' };
                return <button key={t} style={S.tabBtn(myTab === t)} onClick={() => setMyTab(t)}>{labels[t]}</button>;
              })}
            </div>

            {/* GENEL */}
            {myTab === 'overview' && (
              <>
                {/* Klan başlık kartı */}
                <div style={{ ...S.card, background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.15))', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <GuildEmblem name={myGuild.name} size={64} />
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{myGuild.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{myGuild.description || 'Açıklama yok'}</div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <span style={{ fontSize: 13, color: '#fbbf24' }}>⭐ {myGuild.weekly_stars ?? 0} haftalık yıldız</span>
                        <span style={{ fontSize: 13, color: '#94a3b8' }}>🏆 {myGuild.total_stars ?? 0} toplam</span>
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                      <div style={{ fontSize: 28 }}>{castleInfo?.emoji ?? '🏰'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Lv {castle?.level ?? 1} Kale</div>
                    </div>
                  </div>

                  {/* İlan tahtası */}
                  {(myGuild.bulletin || isLeader || isCoLeader) && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, marginBottom: 4 }}>📌 İlan Tahtası</div>
                      <div style={{ fontSize: 14, color: '#e2e8f0' }}>{myGuild.bulletin || 'Henüz ilan yok'}</div>
                      {(isLeader || isCoLeader) && (
                        <button style={{ ...S.outBtn, marginTop: 8, fontSize: 12, padding: '5px 12px' }} onClick={() => { setBulletinEdit(myGuild.bulletin || ''); setShowBulletin(true); }}>Düzenle</button>
                      )}
                    </div>
                  )}

                  {showBulletin && (
                    <div style={{ marginBottom: 12 }}>
                      <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' as const }} value={bulletinEdit} onChange={e => setBulletinEdit(e.target.value)} maxLength={300} placeholder="İlan yazısı..." />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button style={S.btn('#f59e0b')} onClick={handleBulletin}>Kaydet</button>
                        <button style={S.outBtn} onClick={() => setShowBulletin(false)}>İptal</button>
                      </div>
                    </div>
                  )}

                  {/* Lider butonları */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {isLeader && (
                      <>
                        <button style={S.btn('#8b5cf6')} onClick={() => { setRenameInput(myGuild.name); setShowRename(true); }}>✏️ Adı Değiştir</button>
                        <button style={S.btn('#ef4444')} onClick={handleDisband}>🗑️ Klanı Dağıt</button>
                      </>
                    )}
                    {!isLeader && (
                      <button style={S.btn('#ef4444')} onClick={handleLeave}>🚪 Klandan Ayrıl</button>
                    )}
                  </div>

                  {showRename && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <input style={{ ...S.input, flex: 1, width: 'auto' }} value={renameInput} onChange={e => setRenameInput(e.target.value)} placeholder="Yeni klan adı" maxLength={30} />
                      <button style={S.btn('#8b5cf6')} onClick={handleRename}>Kaydet</button>
                      <button style={S.outBtn} onClick={() => setShowRename(false)}>İptal</button>
                    </div>
                  )}
                </div>

                {/* Klan deposu */}
                <div style={S.card}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>🏦 Klan Deposu</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {guildDetails?.storage?.map((s: any) => {
                      const rm = RES_META[s.resource_type];
                      return (
                        <div key={s.resource_type} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 8px' }}>
                          <div style={{ fontSize: 24 }}>{rm?.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: rm?.color }}>{fmt(s.amount)}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{rm?.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bağış formu */}
                  <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    <select style={{ ...S.input, width: 'auto', flex: 1 }} value={donateType} onChange={e => setDonateType(e.target.value)}>
                      {Object.entries(RES_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <input type="number" style={{ ...S.input, width: 100 }} value={donateAmount} onChange={e => setDonateAmount(parseInt(e.target.value) || 0)} min={1} max={10000} />
                    <button style={S.btn('#10b981')} onClick={handleDonate}>🎁 Bağışla</button>
                  </div>
                </div>

                {/* Bekleyen başvurular */}
                {canManage && applications.length > 0 && (
                  <div style={S.card}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>📋 Bekleyen Başvurular ({applications.length})</div>
                    {applications.map((app: any) => (
                      <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                          {app.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{app.username} <span style={{ color: '#94a3b8', fontSize: 12 }}>Lv{app.level}</span></div>
                          {app.message && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{app.message}</div>}
                        </div>
                        <button style={S.btn('#10b981')} onClick={() => handleAccept(app.id)}>✓ Kabul</button>
                        <button style={S.btn('#ef4444')} onClick={() => handleReject(app.id)}>✕ Red</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ÜYELER */}
            {myTab === 'members' && (
              <div style={S.card}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>👥 Üyeler ({guildDetails?.members?.length ?? 0})</div>
                {guildDetails?.members?.map((m: any) => {
                  const rm = ROLE_META[m.role];
                  return (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                        {m.username?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{m.username} <span style={{ fontSize: 12, color: '#94a3b8' }}>Lv{m.level}</span></div>
                        <div style={{ fontSize: 12, color: rm?.color }}>{rm?.icon} {rm?.label} · 💎 {fmt(m.contribution_points)} katkı</div>
                      </div>
                      {/* Rol değiştir / at butonları */}
                      {(isLeader || isCoLeader) && m.user_id !== me.id && m.role !== 'leader' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', padding: '4px 8px', fontSize: 12 }}
                            value={m.role}
                            onChange={async (e) => {
                              try {
                                await guildAPI.changeRole(myGuild.id, m.user_id, e.target.value);
                                showToast('Rol güncellendi', 'success');
                                loadDetails();
                              } catch (err: any) { showToast(err.response?.data?.message || 'Hata', 'error'); }
                            }}
                          >
                            {isLeader && <option value="co-leader">Ko-Lider</option>}
                            <option value="officer">Yetkili</option>
                            <option value="member">Üye</option>
                          </select>
                          <button style={{ ...S.btn('#ef4444'), padding: '4px 10px', fontSize: 12 }} onClick={() => handleKick(m.user_id)}>At</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* KALE */}
            {myTab === 'castle' && (
              <div style={S.card}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 64 }}>{castleInfo?.emoji ?? '🏰'}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: castleInfo?.color }}>{castleInfo?.name ?? 'Kale'}</div>
                  <div style={{ color: '#94a3b8', marginTop: 4 }}>Seviye {castle?.level ?? 1}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24 }}>🛡️</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{fmt(castle?.defPower ?? 0)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Savunma Gücü</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24 }}>💎</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{fmt(castle?.totalDonations ?? 0)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Toplam Bağış</div>
                  </div>
                </div>

                {castle?.nextLevelCost && (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Sonraki Seviye İçin</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, height: 12, marginBottom: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg,#7c3aed,#4f46e5)', width: `${castle?.progress ?? 0}%`, transition: 'width 0.5s', borderRadius: 10 }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>{fmt(castle?.totalDonations ?? 0)} / {fmt(castle?.nextLevelCost)} bağış gerekli</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Bağış yapıldıkça kale otomatik yükselir</div>
                  </>
                )}
                {!castle?.nextLevelCost && <div style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 700 }}>🏆 Maksimum seviye!</div>}
              </div>
            )}

            {/* ASKERLER */}
            {myTab === 'troops' && (
              <div style={S.card}>
                <div style={{ fontWeight: 700, marginBottom: 16 }}>⚔️ Klan Askerleri</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { key: 'infantry', icon: '🗡️', label: 'Piyade',  cost: '50🌲 30🍎 /10' },
                    { key: 'archer',   icon: '🏹', label: 'Okçu',    cost: '80🌲 20🍎 /10' },
                    { key: 'cavalry',  icon: '🐎', label: 'Süvari',  cost: '100🍎 50💰 /10' },
                  ].map(t => (
                    <div key={t.key} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 32 }}>{t.icon}</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{t.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', marginTop: 6 }}>{troops?.[t.key] ?? 0}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Maliyet: {t.cost}</div>
                    </div>
                  ))}
                </div>

                {canManage && (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 10 }}>Asker Üret</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      <select style={{ ...S.input, width: 'auto', flex: 1 }} value={recruitType} onChange={e => setRecruitType(e.target.value)}>
                        <option value="infantry">🗡️ Piyade</option>
                        <option value="archer">🏹 Okçu</option>
                        <option value="cavalry">🐎 Süvari</option>
                      </select>
                      <input type="number" style={{ ...S.input, width: 90 }} value={recruitCount} onChange={e => setRecruitCount(parseInt(e.target.value) || 10)} min={10} step={10} />
                      <button style={S.btn('#7c3aed')} onClick={handleRecruit}>Üret</button>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Kaynaklar klan deposundan kesilir</div>
                  </>
                )}
              </div>
            )}

            {/* SAVAŞ */}
            {myTab === 'war' && (
              <>
                {activeWar ? (
                  <div style={{ ...S.card, background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(185,28,28,0.1))', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16, color: '#ef4444' }}>⚔️ Aktif Savaş</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <GuildEmblem name={activeWar.attacker_name} size={52} />
                        <div style={{ fontWeight: 700, marginTop: 8 }}>{activeWar.attacker_name}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', marginTop: 4 }}>⭐{activeWar.attacker_stars}</div>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>VS</div>
                      <div style={{ textAlign: 'center' }}>
                        <GuildEmblem name={activeWar.defender_name} size={52} />
                        <div style={{ fontWeight: 700, marginTop: 8 }}>{activeWar.defender_name}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', marginTop: 4 }}>⭐{activeWar.defender_stars}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Durum: <span style={{ color: activeWar.status === 'active' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {activeWar.status === 'preparation' ? '⏳ Hazırlık' : activeWar.status === 'active' ? '⚔️ Savaş Devam Ediyor' : '✅ Bitti'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={S.card}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>🔥 Savaş Başlat</div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                      Klan listesinden hedef klanın ID'sini girin. Savaş 24 saat hazırlık sonrası başlar.
                    </div>
                    {(isLeader || isCoLeader) ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input style={{ ...S.input, flex: 1, width: 'auto' }} type="number" placeholder="Hedef Klan ID" value={warTarget} onChange={e => setWarTarget(e.target.value)} />
                        <button style={S.btn('#ef4444')} onClick={handleStartWar}>⚔️ Savaş İlan Et</button>
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: 13 }}>Savaş ilan etmek için Ko-Lider veya Kurucu yetkisi gerekli</div>
                    )}
                  </div>
                )}

                {/* Savaş geçmişi */}
                {warHistory.length > 0 && (
                  <div style={S.card}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>📜 Savaş Geçmişi</div>
                    {warHistory.map((w: any) => {
                      const won = myGuild.id === w.attacker_guild_id ? w.attacker_stars > w.defender_stars : w.defender_stars > w.attacker_stars;
                      return (
                        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: 24 }}>{won ? '🏆' : '💔'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{w.attacker_name} vs {w.defender_name}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>⭐{w.attacker_stars} - ⭐{w.defender_stars}</div>
                          </div>
                          <span style={{ color: won ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 13 }}>{won ? 'Zafer' : 'Mağlubiyet'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* SOHBET */}
            {myTab === 'chat' && (
              <div style={{ ...S.card, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', minHeight: 400 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>💬 Klan Sohbeti</div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {chatMessages.length === 0 && <p style={{ color: '#475569', textAlign: 'center', marginTop: 20 }}>Henüz mesaj yok</p>}
                  {chatMessages.map((msg: any) => {
                    const isMe = msg.user_id === me.id;
                    return (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {msg.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          {!isMe && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{msg.username}</div>}
                          <div style={{ background: isMe ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.08)', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', fontSize: 14, maxWidth: 280, wordBreak: 'break-word' }}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <input style={{ ...S.input, flex: 1, width: 'auto' }} placeholder="Mesaj yaz..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleChat(); }} maxLength={200} />
                  <button style={S.btn('#7c3aed')} onClick={handleChat}>Gönder</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── KLAN LİSTESİ ── */}
        {tab === 'list' && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>🔍 Klanları Keşfet</div>
              {!myGuild && <button style={S.btn('#7c3aed')} onClick={() => setTab('create')}>➕ Klan Kur</button>}
            </div>

            {/* Haftalık sıralama banner */}
            <div style={{ ...S.card, background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(234,179,8,0.1))', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>🏆 Haftalık Ödül</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>En çok yıldız toplayan klanın tüm üyeleri <strong style={{ color: '#fbbf24' }}>50.000 altın</strong> kazanır! Pazartesi sıfırlanır.</div>
            </div>

            {guilds.map((g: any, i: number) => (
              <div key={g.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#475569', width: 28, textAlign: 'center' }}>
                  {i + 1}
                </div>
                <GuildEmblem name={g.name} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{g.description || 'Açıklama yok'}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>👥 {g.member_count}/{g.member_limit}</span>
                    <span style={{ fontSize: 12, color: '#fbbf24' }}>⭐ {g.weekly_stars} haftalık</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>🏆 {g.total_stars} toplam</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>🏰 Kale Lv{g.castle_level}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Kurucu: {g.leader_name}</span>
                  </div>
                </div>
                {!myGuild && (
                  <div>
                    {applyGuildId === g.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input style={{ ...S.input, width: 180, fontSize: 13 }} placeholder="Başvuru mesajı (opsiyonel)" value={applyMsg} onChange={e => setApplyMsg(e.target.value)} maxLength={100} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={S.btn('#10b981')} onClick={() => handleApply(g.id)}>Gönder</button>
                          <button style={S.outBtn} onClick={() => setApplyGuildId(null)}>İptal</button>
                        </div>
                      </div>
                    ) : (
                      <button style={S.btn('#7c3aed')} onClick={() => setApplyGuildId(g.id)}>Başvur</button>
                    )}
                  </div>
                )}
                {myGuild && <div style={{ color: '#475569', fontSize: 12 }}>ID: {g.id}</div>}
              </div>
            ))}
          </>
        )}

        {/* ── KLAN KUR ── */}
        {tab === 'create' && !myGuild && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 20, textAlign: 'center' }}>⚔️ Yeni Klan Kur</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Klan Adı *</label>
                <input style={S.input} placeholder="En az 3 karakter" value={createName} onChange={e => setCreateName(e.target.value)} maxLength={30} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Açıklama</label>
                <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' as const }} placeholder="Klanınız hakkında..." value={createDesc} onChange={e => setCreateDesc(e.target.value)} maxLength={200} />
              </div>
              <button style={{ ...S.btn('#7c3aed'), width: '100%', padding: '12px' }} onClick={handleCreate}>🏰 Klanı Kur</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
