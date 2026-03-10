/**
 * GuildsPageV2 — Prototip / Tasarım Testi
 * Onaylanınca GuildsPage.tsx ile değiştirilecek.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { guildAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { fireConfetti, fireRewardConfetti } from '../utils/confetti';

// ── Sabit veriler ────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  leader:  { label: 'Lider',     color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  icon: '👑' },
  officer: { label: 'Yardımcı', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: '⭐' },
  member:  { label: 'Üye',       color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '👤' },
};

const RES_META: Record<string, { icon: string; label: string; color: string }> = {
  gold:   { icon: '💰', label: 'Altın',    color: '#fbbf24' },
  wood:   { icon: '🌲', label: 'Odun',     color: '#86efac' },
  food:   { icon: '🍎', label: 'Yiyecek',  color: '#f87171' },
  energy: { icon: '⚡', label: 'Enerji',   color: '#a78bfa' },
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'şimdi';
  if (m < 60) return `${m}d önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

// ── Bileşenler ───────────────────────────────────────────────────────────────

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

function StatPill({ label, value, color = '#60a5fa' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ── Ana Sayfa ────────────────────────────────────────────────────────────────

type Tab = 'my-guild' | 'list' | 'create';
type SubTab = 'info' | 'members' | 'chat' | 'storage';

function GuildsPageV2() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser]             = useState<any>(null);
  const [tab, setTab]               = useState<Tab>('my-guild');
  const [subTab, setSubTab]         = useState<SubTab>('info');

  const [myGuild, setMyGuild]       = useState<any>(null);
  const [details, setDetails]       = useState<any>(null);
  const [guilds, setGuilds]         = useState<any[]>([]);
  const [apps, setApps]             = useState<any[]>([]);
  const [chat, setChat]             = useState<any[]>([]);
  const chatBottomRef               = useRef<HTMLDivElement>(null);

  // forms
  const [guildName, setGuildName]   = useState('');
  const [guildDesc, setGuildDesc]   = useState('');
  const [chatMsg, setChatMsg]       = useState('');
  const [applyMsg, setApplyMsg]     = useState('');
  const [selGuild, setSelGuild]     = useState<any>(null);

  const [donateRes, setDonateRes]   = useState('gold');
  const [donateAmt, setDonateAmt]   = useState(1000);
  const [showDonate, setShowDonate] = useState(false);
  const [showApply, setShowApply]   = useState(false);
  const [loading, setLoading]       = useState(false);

  // ── Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    const u = JSON.parse(raw);
    setUser(u);
    loadMyGuild(u.id);
  }, []);

  useEffect(() => {
    if (!myGuild) return;
    loadDetails(myGuild.id);
    loadChat(myGuild.id);
    const interval = setInterval(() => loadChat(myGuild.id), 10000);
    return () => clearInterval(interval);
  }, [myGuild]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadMyGuild = async (userId: number) => {
    try {
      const r = await guildAPI.getUserGuild(userId);
      const g = r.data.data.guild;
      setMyGuild(g);
      if (!g) { setTab('list'); loadGuilds(); }
    } catch {}
  };

  const loadDetails = async (guildId: number) => {
    try {
      const r = await guildAPI.getDetails(guildId);
      setDetails(r.data.data);
      if (myGuild?.role === 'leader' || myGuild?.role === 'officer') {
        const ar = await guildAPI.getApplications(guildId);
        setApps(ar.data.data.applications);
      }
    } catch {}
  };

  const loadGuilds = async () => {
    try {
      const r = await guildAPI.list();
      setGuilds(r.data.data.guilds);
    } catch {}
  };

  const loadChat = async (guildId: number) => {
    try {
      const r = await guildAPI.getChatMessages(guildId);
      setChat(r.data.data.messages);
    } catch {}
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!user || guildName.length < 3) { showToast('Guild adı en az 3 karakter', 'warning'); return; }
    setLoading(true);
    try {
      await guildAPI.create(guildName, guildDesc, user.id);
      fireConfetti();
      showToast('Guild oluşturuldu!', 'success');
      setGuildName(''); setGuildDesc('');
      await loadMyGuild(user.id);
      setTab('my-guild');
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
    finally { setLoading(false); }
  };

  const handleApply = async () => {
    if (!user || !selGuild) return;
    try {
      await guildAPI.apply(selGuild.id, user.id, applyMsg);
      showToast('Başvuru gönderildi', 'success');
      setShowApply(false); setSelGuild(null); setApplyMsg('');
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleAccept = async (appId: number) => {
    if (!myGuild) return;
    try { await guildAPI.acceptApplication(appId, myGuild.id); fireRewardConfetti(); showToast('Kabul edildi', 'success'); loadDetails(myGuild.id); }
    catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleReject = async (appId: number) => {
    try { await guildAPI.rejectApplication(appId); showToast('Reddedildi', 'info'); if (myGuild) loadDetails(myGuild.id); }
    catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleLeave = async () => {
    if (!user || !myGuild) return;
    if (!confirm("Guild'den ayrılmak istiyor musun?")) return;
    try { await guildAPI.leave(user.id, myGuild.id); showToast('Ayrıldın', 'info'); loadMyGuild(user.id); setTab('list'); }
    catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleDonate = async () => {
    if (!user || !myGuild) return;
    try {
      await guildAPI.donate(user.id, myGuild.id, donateRes, donateAmt);
      fireRewardConfetti(); showToast('Bağış yapıldı!', 'success');
      setShowDonate(false); loadDetails(myGuild.id);
    } catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  const handleSendMsg = async () => {
    if (!user || !myGuild || !chatMsg.trim()) return;
    try { await guildAPI.sendMessage(myGuild.id, user.id, chatMsg); setChatMsg(''); loadChat(myGuild.id); }
    catch (e: any) { showToast(e.response?.data?.message || 'Hata', 'error'); }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const S = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#0a0f1e 0%,#0d1526 60%,#0a1020 100%)',
      color: '#f1f5f9',
      fontFamily: 'system-ui,sans-serif',
      paddingBottom: 40,
    } as React.CSSProperties,

    header: {
      padding: '16px 18px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', gap: 12,
    } as React.CSSProperties,

    backBtn: {
      background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
      borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 14,
      display: 'flex', alignItems: 'center', gap: 6,
    } as React.CSSProperties,

    card: {
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 18, padding: '18px 18px',
    } as React.CSSProperties,
  };

  const tabBtn = (id: Tab) => ({
    flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
    borderRadius: 12, fontWeight: 700, fontSize: 13, transition: 'all .18s',
    background: tab === id ? 'rgba(139,92,246,0.22)' : 'transparent',
    color: tab === id ? '#a78bfa' : '#64748b',
    borderBottom: tab === id ? '2px solid #a78bfa' : '2px solid transparent',
  } as React.CSSProperties);

  const subBtn = (id: SubTab) => ({
    flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
    borderRadius: 10, fontWeight: 600, fontSize: 12, transition: 'all .18s',
    background: subTab === id ? 'rgba(139,92,246,0.18)' : 'transparent',
    color: subTab === id ? '#c4b5fd' : '#475569',
  } as React.CSSProperties);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>

      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/')}>← Geri</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>⚔️ Guild</div>
          {myGuild && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {ROLE_META[myGuild.role].icon} {myGuild.name} · {ROLE_META[myGuild.role].label}
            </div>
          )}
        </div>
        {myGuild && (
          <div style={{
            background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: 10, padding: '5px 12px', fontSize: 12, color: '#a78bfa', fontWeight: 700,
          }}>
            Seviye {details?.guild?.level ?? '—'}
          </div>
        )}
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {myGuild && <button style={tabBtn('my-guild')} onClick={() => setTab('my-guild')}>🏰 Guild'im</button>}
        <button style={tabBtn('list')} onClick={() => { setTab('list'); loadGuilds(); }}>🔍 Guilds</button>
        {!myGuild && <button style={tabBtn('create')} onClick={() => setTab('create')}>➕ Oluştur</button>}
      </div>

      <div style={{ padding: '16px 14px', maxWidth: 640, margin: '0 auto' }}>

        {/* ════════════════════════════════════════════════════════════════
            MY GUILD TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'my-guild' && myGuild && details && (() => {
          const g = details.guild;
          const members: any[] = details.members ?? [];
          const storage: any[] = details.storage ?? [];
          const rmeta = ROLE_META[myGuild.role];
          const isLeader = myGuild.role === 'leader' || myGuild.role === 'officer';
          const expPct = Math.min(100, Math.round(((g.experience ?? 0) / Math.max(1, g.exp_required ?? 1000)) * 100));

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ── Guild Banner ───────────────────────────────────────── */}
              <div style={{
                ...S.card,
                background: 'linear-gradient(135deg,rgba(88,28,235,0.18) 0%,rgba(139,92,246,0.08) 100%)',
                border: '1px solid rgba(139,92,246,0.25)',
              }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <GuildEmblem name={g.name} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 2 }}>{g.name}</div>
                    {g.description && (
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{g.description}</div>
                    )}
                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <StatPill label="Üye" value={`${members.length}/${g.member_limit}`} />
                      <StatPill label="Puan" value={fmt(g.total_points ?? 0)} color="#fbbf24" />
                      <StatPill label="Seviye" value={g.level ?? 1} color="#a78bfa" />
                    </div>
                  </div>
                  {/* Role badge + leave */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{
                      background: rmeta.bg, color: rmeta.color,
                      borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    }}>
                      {rmeta.icon} {rmeta.label}
                    </div>
                    {myGuild.role !== 'leader' && (
                      <button onClick={handleLeave} style={{
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#f87171', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                      }}>Ayrıl</button>
                    )}
                  </div>
                </div>

                {/* XP Bar */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                    <span>XP İlerlemesi</span>
                    <span>{g.experience ?? 0} / {g.exp_required ?? 1000}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${expPct}%`,
                      background: 'linear-gradient(90deg,#7c3aed,#a78bfa)',
                      borderRadius: 99, transition: 'width .5s',
                    }} />
                  </div>
                </div>
              </div>

              {/* ── Pending Applications (leader/officer) ─────────────── */}
              {isLeader && apps.length > 0 && (
                <div style={{ ...S.card, border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fbbf24', marginBottom: 10 }}>
                    📨 Bekleyen Başvurular ({apps.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {apps.map((a: any) => (
                      <div key={a.id} style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0,
                        }}>
                          {a.username.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{a.username}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Seviye {a.level}</div>
                          {a.message && <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>"{a.message}"</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleAccept(a.id)} style={{
                            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                            color: '#22c55e', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                          }}>✓</button>
                          <button onClick={() => handleReject(a.id)} style={{
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                          }}>✗</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Sub-tabs ──────────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
                {(['info','members','chat','storage'] as SubTab[]).map(id => {
                  const labels: Record<SubTab,string> = { info:'📋 Bilgi', members:'👥 Üyeler', chat:'💬 Sohbet', storage:'🏦 Depo' };
                  return <button key={id} style={subBtn(id)} onClick={() => setSubTab(id)}>{labels[id]}</button>;
                })}
              </div>

              {/* ── Info Sub-tab ──────────────────────────────────────── */}
              {subTab === 'info' && (
                <div style={S.card}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Guild Bilgileri</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Lider', value: members.find((m: any) => m.role === 'leader')?.username ?? '—' },
                      { label: 'Toplam Güç', value: fmt(members.reduce((s: number, m: any) => s + (m.total_power ?? 0), 0)) },
                      { label: 'Toplam Üye', value: `${members.length} / ${g.member_limit}` },
                      { label: 'Guild Seviyesi', value: g.level ?? 1 },
                      { label: 'Guild Puanı', value: fmt(g.total_points ?? 0) },
                      { label: 'Kuruluş', value: g.created_at ? new Date(g.created_at).toLocaleDateString('tr-TR') : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Members Sub-tab ───────────────────────────────────── */}
              {subTab === 'members' && (
                <div style={S.card}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                    👥 Üyeler ({members.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {members
                      .sort((a: any, b: any) => {
                        const order: Record<string, number> = { leader: 0, officer: 1, member: 2 };
                        return (order[a.role] ?? 3) - (order[b.role] ?? 3);
                      })
                      .map((m: any, i: number) => {
                        const rm = ROLE_META[m.role] ?? ROLE_META.member;
                        return (
                          <div key={m.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                            borderRadius: 12, padding: '9px 10px',
                          }}>
                            <div style={{ width: 20, textAlign: 'center', color: '#475569', fontSize: 12 }}>{i + 1}</div>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: `linear-gradient(135deg,${rm.color}99,${rm.color}44)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0,
                            }}>
                              {m.username.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.username}</span>
                                <span style={{ background: rm.bg, color: rm.color, borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                                  {rm.icon} {rm.label}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
                                Sv. {m.level} · Katkı {fmt(m.contribution_points ?? 0)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#f87171' }}>
                                ⚔️ {fmt(m.total_power ?? 0)}
                              </div>
                              <div style={{ fontSize: 11, color: '#475569' }}>güç</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── Chat Sub-tab ──────────────────────────────────────── */}
              {subTab === 'chat' && (
                <div style={S.card}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>💬 Guild Sohbeti</div>

                  {/* Messages */}
                  <div style={{
                    height: 320, overflowY: 'auto',
                    background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 10,
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    {chat.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#475569', marginTop: 60, fontSize: 14 }}>
                        Henüz mesaj yok. İlk mesajı gönder!
                      </div>
                    ) : (
                      chat.map((msg: any) => {
                        const isMe = msg.user_id === user?.id;
                        return (
                          <div key={msg.id} style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}>
                            {!isMe && (
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, marginLeft: 4 }}>
                                {msg.username}
                              </div>
                            )}
                            <div style={{
                              maxWidth: '78%', padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              background: isMe ? 'rgba(139,92,246,0.28)' : 'rgba(255,255,255,0.07)',
                              fontSize: 14, lineHeight: 1.4,
                            }}>
                              {msg.message}
                            </div>
                            <div style={{ fontSize: 10, color: '#334155', marginTop: 2, marginLeft: 4, marginRight: 4 }}>
                              {timeAgo(msg.created_at)}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      value={chatMsg}
                      onChange={e => setChatMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMsg()}
                      placeholder="Mesajını yaz..."
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none',
                      }}
                    />
                    <button onClick={handleSendMsg} style={{
                      background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                      border: 'none', borderRadius: 12, padding: '10px 18px',
                      color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 16,
                    }}>➤</button>
                  </div>
                </div>
              )}

              {/* ── Storage Sub-tab ───────────────────────────────────── */}
              {subTab === 'storage' && (
                <div style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🏦 Guild Deposu</div>
                    <button onClick={() => setShowDonate(true)} style={{
                      background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.08))',
                      border: '1px solid rgba(34,197,94,0.35)', color: '#22c55e',
                      borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    }}>+ Bağış Yap</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {storage.map((s: any) => {
                      const rm = RES_META[s.resource_type] ?? { icon: '?', label: s.resource_type, color: '#94a3b8' };
                      return (
                        <div key={s.resource_type} style={{
                          background: 'rgba(255,255,255,0.04)', border: `1px solid ${rm.color}33`,
                          borderRadius: 14, padding: '14px 16px', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 28 }}>{rm.icon}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{rm.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: rm.color, marginTop: 4 }}>
                            {fmt(s.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contribution leaderboard */}
                  <div style={{ marginTop: 16, fontWeight: 700, fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                    En Çok Bağış Yapanlar
                  </div>
                  {[...members]
                    .sort((a: any, b: any) => (b.contribution_points ?? 0) - (a.contribution_points ?? 0))
                    .slice(0, 5)
                    .map((m: any, i: number) => (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                        borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <div style={{ width: 22, textAlign: 'center', fontSize: 14 }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                        </div>
                        <div style={{ flex: 1, fontSize: 14 }}>{m.username}</div>
                        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>
                          {fmt(m.contribution_points ?? 0)}
                        </div>
                      </div>
                    ))}
                </div>
              )}

            </div>
          );
        })()}

        {/* ════════════════════════════════════════════════════════════════
            GUILD LIST TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#94a3b8', padding: '0 2px' }}>
              🔍 Tüm Guild'ler ({guilds.length})
            </div>
            {guilds.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', color: '#475569', padding: '48px 24px' }}>
                <div style={{ fontSize: 48 }}>🏰</div>
                <div style={{ marginTop: 12, fontSize: 15 }}>Henüz guild yok</div>
              </div>
            ) : (
              guilds.map((g: any, i: number) => (
                <div key={g.id} style={{
                  ...S.card,
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: i % 2 === 0 ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.03)',
                }}>
                  <GuildEmblem name={g.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{g.name}</div>
                    {g.description && (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: '#475569' }}>
                      <span>👑 {g.leader_name}</span>
                      <span>·</span>
                      <span>Sv.{g.level}</span>
                      <span>·</span>
                      <span>👥 {g.member_count}/{g.member_limit}</span>
                      <span>·</span>
                      <span style={{ color: '#fbbf24' }}>⭐ {fmt(g.total_points)}</span>
                    </div>
                  </div>
                  {!myGuild && (
                    <button
                      onClick={() => { setSelGuild(g); setShowApply(true); }}
                      disabled={g.member_count >= g.member_limit}
                      style={{
                        background: g.member_count >= g.member_limit
                          ? 'rgba(100,116,139,0.12)' : 'rgba(139,92,246,0.2)',
                        border: `1px solid ${g.member_count >= g.member_limit ? 'rgba(100,116,139,0.2)' : 'rgba(139,92,246,0.4)'}`,
                        color: g.member_count >= g.member_limit ? '#475569' : '#a78bfa',
                        borderRadius: 10, padding: '7px 14px', cursor: g.member_count >= g.member_limit ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}
                    >
                      {g.member_count >= g.member_limit ? 'Dolu' : 'Başvur'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CREATE GUILD TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'create' && !myGuild && (
          <div style={S.card}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>🏰 Yeni Guild Oluştur</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>Guild Adı *</div>
                <input
                  value={guildName}
                  onChange={e => setGuildName(e.target.value)}
                  placeholder="Örn: Kuzey Korsanları"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, padding: '12px 14px', color: '#f1f5f9', fontSize: 15, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>Açıklama</div>
                <textarea
                  value={guildDesc}
                  onChange={e => setGuildDesc(e.target.value)}
                  placeholder="Guild'iniz hakkında kısa bir tanıtım..."
                  rows={3}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, padding: '12px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={loading || guildName.length < 3}
                style={{
                  background: loading || guildName.length < 3
                    ? 'rgba(100,116,139,0.2)' : 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                  border: 'none', borderRadius: 14, padding: '14px',
                  color: loading || guildName.length < 3 ? '#475569' : '#fff',
                  fontWeight: 800, fontSize: 16, cursor: loading || guildName.length < 3 ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Oluşturuluyor...' : '⚔️ Guild Kur'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Apply Modal */}
      {showApply && selGuild && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowApply(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
          <div style={{
            position: 'relative', zIndex: 1, background: '#0f172a',
            borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '22px 18px 36px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <GuildEmblem name={selGuild.name} size={42} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{selGuild.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Başvuru gönder</div>
              </div>
            </div>
            <textarea
              value={applyMsg}
              onChange={e => setApplyMsg(e.target.value)}
              placeholder="Başvuru mesajı (opsiyonel)"
              rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '12px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none',
                resize: 'none', boxSizing: 'border-box', marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowApply(false); setSelGuild(null); setApplyMsg(''); }} style={{
                flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: 15,
              }}>İptal</button>
              <button onClick={handleApply} style={{
                flex: 1, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                border: 'none', borderRadius: 12, padding: 12,
                color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15,
              }}>Başvur</button>
            </div>
          </div>
        </div>
      )}

      {/* Donate Modal */}
      {showDonate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowDonate(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
          <div style={{
            position: 'relative', zIndex: 1, background: '#0f172a',
            borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '22px 18px 36px',
          }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>🎁 Bağış Yap</div>

            {/* Resource selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
              {Object.entries(RES_META).map(([key, rm]) => (
                <button key={key} onClick={() => setDonateRes(key)} style={{
                  border: `2px solid ${donateRes === key ? rm.color : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 12, padding: '10px 4px', cursor: 'pointer',
                  background: donateRes === key ? `${rm.color}18` : 'rgba(255,255,255,0.04)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 22 }}>{rm.icon}</span>
                  <span style={{ fontSize: 11, color: donateRes === key ? rm.color : '#475569', fontWeight: 700 }}>{rm.label}</span>
                </button>
              ))}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Miktar</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {[100, 500, 1000, 5000].map(v => (
                  <button key={v} onClick={() => setDonateAmt(v)} style={{
                    background: donateAmt === v ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${donateAmt === v ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    color: donateAmt === v ? '#a78bfa' : '#64748b', fontWeight: 700, fontSize: 13,
                  }}>{fmt(v)}</button>
                ))}
              </div>
              <input
                type="number"
                value={donateAmt}
                onChange={e => setDonateAmt(parseInt(e.target.value) || 0)}
                min="1"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: '10px 14px', color: '#f1f5f9', fontSize: 15, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDonate(false)} style={{
                flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: 12, color: '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: 15,
              }}>İptal</button>
              <button onClick={handleDonate} style={{
                flex: 2, background: 'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(34,197,94,0.12))',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: 12, padding: 12, color: '#22c55e', cursor: 'pointer', fontWeight: 800, fontSize: 15,
              }}>
                {fmt(donateAmt)} {RES_META[donateRes]?.icon} Bağış Yap
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GuildsPageV2;
