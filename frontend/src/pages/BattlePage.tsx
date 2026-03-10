import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { battleAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { fireRewardConfetti } from '../utils/confetti';

// ── Sabit renk/cfg ──────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  padding: 16,
  marginBottom: 14,
};

const SOLDIER_CFG: any = {
  archer:   { name: 'Okçu',   emoji: '🏹', power: 3, gold: 50,  food: 20 },
  infantry: { name: 'Piyade', emoji: '⚔️', power: 2, gold: 30,  food: 15 },
  cavalry:  { name: 'Süvari', emoji: '🐴', power: 5, gold: 100, food: 40 },
};

const DIFF_CFG: any = {
  easy:   { label: 'Kolay', color: '#22c55e' },
  medium: { label: 'Orta',  color: '#f59e0b' },
  hard:   { label: 'Zor',   color: '#ef4444' },
};

const SHIELD_OPTIONS = [
  { hours: 3,  gold: 500000,  label: '3 Saat'  },
  { hours: 8,  gold: 1000000, label: '8 Saat'  },
  { hours: 24, gold: 2400000, label: '24 Saat' },
];

// Animasyon fazları
const BATTLE_PHASES = [
  { emoji: '⚔️', text: 'Kılıçlar Çarpışıyor!', color: '#ef4444' },
  { emoji: '💥', text: 'Güçler Ölçülüyor...', color: '#f59e0b' },
  { emoji: '🎲', text: 'Kader Belirleniyor...', color: '#a78bfa' },
  { emoji: '🔥', text: 'Savaş Sürüyor!', color: '#f97316' },
];

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function timeLeft(until: string | null): string {
  if (!until) return '';
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}s ${m}d` : `${m}d`;
}

function shieldCountdown(until: string | null): string {
  if (!until) return '';
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function isShieldActive(until: string | null): boolean {
  return !!until && new Date(until).getTime() > Date.now();
}

function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Güç karşılaştırma bar bileşeni
function PowerBar({ myPower, theirPower }: { myPower: number; theirPower: number }) {
  const total = (myPower + theirPower) || 1;
  const myPct = Math.round((myPower / total) * 100);
  const theirPct = 100 - myPct;
  const myColor = myPower >= theirPower ? '#22c55e' : '#ef4444';
  const theirColor = myPower >= theirPower ? '#ef4444' : '#22c55e';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: '#94a3b8' }}>
        <span style={{ color: myColor, fontWeight: 700 }}>Sen — {myPower}</span>
        <span style={{ color: theirColor, fontWeight: 700 }}>{theirPower} — Rakip</span>
      </div>
      <div style={{ height: 10, borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 2 }}>
        <div style={{ flex: myPct, background: myColor, borderRadius: '99px 0 0 99px', transition: 'flex .4s' }} />
        <div style={{ flex: theirPct, background: theirColor, borderRadius: '0 99px 99px 0', transition: 'flex .4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#475569' }}>
        <span>{myPct}%</span>
        <span>{theirPct}%</span>
      </div>
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

function BattlePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser]               = useState<any>(null);
  const userIdRef                     = useRef<number | null>(null);
  const [army, setArmy]               = useState<any>(null);
  const [pirates, setPirates]         = useState<any[]>([]);
  const [pvpTargets, setPvpTargets]   = useState<any[]>([]);
  const [reports, setReports]         = useState<any[]>([]);
  const [tab, setTab]                 = useState<'army'|'pirates'|'pvp'|'reports'>('army');
  const [loading, setLoading]         = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Günlük PvP sayacı
  const [pvpAttacksToday, setPvpAttacksToday] = useState(0);
  const [pvpLoading, setPvpLoading] = useState(false);

  // Recruit
  const [recruitType, setRecruitType]   = useState('infantry');
  const [recruitCount, setRecruitCount] = useState(10);

  // Modals
  const [battleTarget, setBattleTarget] = useState<any>(null);
  const [battleType, setBattleType]     = useState<'pirate'|'pvp'>('pirate');
  const [battleResult, setBattleResult] = useState<any>(null);
  const [shieldModal, setShieldModal]   = useState(false);
  const [selectedShield, setSelectedShield] = useState(3);

  // Savaş animasyon fazı
  const [battlePhase, setBattlePhase] = useState(0);
  const phaseTimerRef = useRef<any>(null);

  // Kalkan geri sayım ticker'ı
  useEffect(() => {
    const ticker = setInterval(() => setArmy((prev: any) => prev ? { ...prev } : prev), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Savaş animasyonu
  useEffect(() => {
    if (loading && battleTarget) {
      setBattlePhase(0);
      phaseTimerRef.current = setInterval(() => {
        setBattlePhase(p => (p + 1) % BATTLE_PHASES.length);
      }, 900);
    } else {
      clearInterval(phaseTimerRef.current);
    }
    return () => clearInterval(phaseTimerRef.current);
  }, [loading, battleTarget]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) { navigate('/login'); return; }
    const u = JSON.parse(raw);
    setUser(u);
    userIdRef.current = u.id;
    loadAll(u.id);
  }, []);

  const loadAll = async (uid: number) => {
    try {
      const [armyRes, piratesRes, unreadRes] = await Promise.all([
        battleAPI.getArmy(uid),
        battleAPI.listPirates(),
        battleAPI.getUnreadAttacks(uid),
      ]);
      setArmy(armyRes.data.data.army);
      setPirates(piratesRes.data.data.pirates);
      setUnreadCount(unreadRes.data.data.count);
    } catch {}
  };

  const loadPvp = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    setPvpLoading(true);
    try {
      const res = await battleAPI.listPvpTargets(uid);
      setPvpTargets(res.data.data.players);
      setPvpAttacksToday(res.data.data.attacks_today ?? 0);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Rakipler yüklenemedi', 'error');
    } finally {
      setPvpLoading(false);
    }
  };

  const loadReports = async () => {
    if (!user) return;
    try {
      const res = await battleAPI.getAllReports(user.id);
      setReports(res.data.data.battles);
      await battleAPI.markAttacksSeen(user.id);
      setUnreadCount(0);
    } catch {}
  };

  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    if (t === 'pvp')     loadPvp();
    if (t === 'reports') loadReports();
  };

  // ── Asker yetiştir ──────────────────────────────────────────────────────────

  const handleRecruit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await battleAPI.recruit(user.id, recruitType, recruitCount);
      showToast(res.data.message, 'success');
      const armyRes = await battleAPI.getArmy(user.id);
      setArmy(armyRes.data.data.army);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Hata', 'error');
    } finally { setLoading(false); }
  };

  // ── Saldırı ─────────────────────────────────────────────────────────────────

  const handleAttack = async () => {
    if (!user || !battleTarget) return;
    setLoading(true);
    try {
      const res = battleType === 'pirate'
        ? await battleAPI.attackPirate(user.id, battleTarget.id)
        : await battleAPI.attackPlayer(user.id, battleTarget.id);

      if (res.data.data.winner === 'attacker') fireRewardConfetti();
      showToast(res.data.message, res.data.data.winner === 'attacker' ? 'success' : 'error');
      setBattleResult(res.data.data);

      // PvP sayacı güncelle
      if (battleType === 'pvp' && res.data.data.attacks_today !== undefined) {
        setPvpAttacksToday(res.data.data.attacks_today);
      }

      const armyRes = await battleAPI.getArmy(user.id);
      setArmy(armyRes.data.data.army);
      if (battleType === 'pvp') loadPvp();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Saldırı başarısız', 'error');
      closeBattle();
    } finally { setLoading(false); }
  };

  const closeBattle = () => { setBattleTarget(null); setBattleResult(null); };

  // ── Kalkan ──────────────────────────────────────────────────────────────────

  const handleBuyShield = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await battleAPI.buyShield(user.id, selectedShield);
      showToast(res.data.message, 'success');
      setShieldModal(false);
      const armyRes = await battleAPI.getArmy(user.id);
      setArmy(armyRes.data.data.army);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Hata', 'error');
    } finally { setLoading(false); }
  };

  // ── Tab button ───────────────────────────────────────────────────────────────

  const TabBtn = ({ id, emoji, label }: { id: typeof tab; emoji: string; label: string }) => {
    const active = tab === id;
    const isReports = id === 'reports';
    return (
      <button
        onClick={() => handleTabChange(id)}
        style={{
          flex: 1, padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
          background: active ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.05)',
          color: active ? '#fff' : '#64748b', fontWeight: 700, fontSize: 11,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 18, position: 'relative' }}>
          {emoji}
          {isReports && unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -6, background: '#ef4444',
              color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 800,
              minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span>{label}</span>
      </button>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(160deg,#0f172a 0%,#0c2a47 60%,#0f172a 100%)',
      color: '#f1f5f9',
      paddingBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px 10px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>⚔️ Savaş</h1>
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
            Ordu gücü: <strong style={{ color: '#f97316' }}>{army?.total_power ?? 0}</strong>
          </p>
        </div>
      </div>

      <div style={{ padding: '12px 14px 0' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <TabBtn id="army"    emoji="🛡️"  label="Ordum"     />
          <TabBtn id="pirates" emoji="🏴‍☠️" label="Korsanlar" />
          <TabBtn id="pvp"     emoji="👥"  label="PvP"       />
          <TabBtn id="reports" emoji="📜"  label="Raporlar"  />
        </div>

        {/* ── ORDUM ────────────────────────────────────────────────────────── */}
        {tab === 'army' && (
          <>
            {/* Asker kartları */}
            <div style={{ ...CARD }}>
              <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Ordun</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {Object.entries(SOLDIER_CFG).map(([key, cfg]: any) => {
                  const count = army?.[`${key}_count`] ?? 0;
                  return (
                    <div key={key} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>{cfg.emoji}</div>
                      <p style={{ fontWeight: 700, fontSize: 13 }}>{cfg.name}</p>
                      <p style={{ color: '#f97316', fontWeight: 800, fontSize: 20 }}>{count}</p>
                      <p style={{ color: '#64748b', fontSize: 10 }}>Güç ×{cfg.power}</p>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(249,115,22,0.2))', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>Toplam Güç</span>
                <span style={{ color: '#f97316', fontWeight: 900, fontSize: 26 }}>{army?.total_power ?? 0}</span>
              </div>
            </div>

            {/* Asker yetiştir */}
            <div style={{ ...CARD }}>
              <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Asker Yetiştir</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {Object.entries(SOLDIER_CFG).map(([key, cfg]: any) => (
                  <button
                    key={key}
                    onClick={() => setRecruitType(key)}
                    style={{
                      padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                      background: recruitType === key ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
                      border: recruitType === key ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: '#f1f5f9', textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 22 }}>{cfg.emoji}</div>
                    <p style={{ fontWeight: 700, fontSize: 12, marginTop: 4 }}>{cfg.name}</p>
                    <p style={{ color: '#64748b', fontSize: 10 }}>💰{cfg.gold} 🍎{cfg.food}</p>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <p style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Miktar (1-50)</p>
                <input
                  type="number" value={recruitCount} min={1} max={50}
                  onChange={e => setRecruitCount(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: 15, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <p style={{ color: '#94a3b8', fontSize: 12 }}>
                  💰 {SOLDIER_CFG[recruitType].gold * recruitCount} altın &nbsp;|&nbsp;
                  🍎 {SOLDIER_CFG[recruitType].food * recruitCount} yiyecek &nbsp;|&nbsp;
                  ⚔️ +{SOLDIER_CFG[recruitType].power * recruitCount} güç
                </p>
              </div>

              <button
                onClick={handleRecruit} disabled={loading}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Yetiştiriliyor...' : '⚔️ Asker Yetiştir'}
              </button>
            </div>

            {/* Kalkan kartı */}
            {(() => {
              const active = isShieldActive(army?.shield_until);
              const countdown = shieldCountdown(army?.shield_until);
              return (
                <div style={{
                  ...CARD,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: active ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: active ? '#60a5fa' : '#f1f5f9' }}>
                      🛡️ Koruma Kalkanı
                      {active && (
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.18)', padding: '2px 8px', borderRadius: 99 }}>AKTİF</span>
                      )}
                    </p>
                    {active ? (
                      <p style={{ color: '#06b6d4', fontWeight: 800, fontSize: 18, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                        ⏱ {countdown}
                      </p>
                    ) : (
                      <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>3s·500K💰 &nbsp;|&nbsp; 8s·1M💰 &nbsp;|&nbsp; 24s·2.4M💰</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShieldModal(true)}
                    style={{ padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    {active ? '➕ Süre Ekle' : 'Satın Al'}
                  </button>
                </div>
              );
            })()}
          </>
        )}

        {/* ── KORSANLAR ────────────────────────────────────────────────────── */}
        {tab === 'pirates' && (
          <div style={{ ...CARD }}>
            <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🏴‍☠️ Korsan Kampları</p>
            {pirates.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center', padding: '24px 0' }}>Korsan bulunamadı</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pirates.map((p: any) => {
                  const diff = DIFF_CFG[p.difficulty] ?? DIFF_CFG.medium;
                  const canAttack = army && army.total_power >= p.power * 0.5;
                  const powerRatio = army ? Math.min(100, Math.round((army.total_power / Math.max(1, p.power)) * 100)) : 0;
                  return (
                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 22 }}>🏴‍☠️</span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: diff.color, background: `${diff.color}22`, padding: '2px 8px', borderRadius: 99 }}>{diff.label}</span>
                          </div>
                          <p style={{ color: '#64748b', fontSize: 12 }}>⚔️ {p.power} güç &nbsp;|&nbsp; 💰 {p.reward_gold} ödül{p.reward_xp > 0 ? ` · ✨ ${p.reward_xp} XP` : ''}</p>
                        </div>
                        <button
                          disabled={!canAttack}
                          onClick={() => { setBattleTarget(p); setBattleType('pirate'); }}
                          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: canAttack ? 'pointer' : 'not-allowed', background: canAttack ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.08)', color: canAttack ? '#fff' : '#475569', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                        >
                          {canAttack ? 'Saldır' : 'Güçsüz'}
                        </button>
                      </div>
                      {/* Güç karşılaştırma bar (mini) */}
                      {army && (
                        <div>
                          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${powerRatio}%`,
                              background: powerRatio >= 100 ? '#22c55e' : powerRatio >= 70 ? '#f59e0b' : '#ef4444',
                              borderRadius: 99, transition: 'width .4s',
                            }} />
                          </div>
                          <p style={{ color: '#475569', fontSize: 10, marginTop: 3 }}>
                            Gücün: {powerRatio >= 100 ? '✅ Yeterli' : powerRatio >= 70 ? '⚠️ Riskli' : '❌ Yetersiz'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PvP ─────────────────────────────────────────────────────────── */}
        {tab === 'pvp' && (
          <div style={{ ...CARD }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>👥 Yakın Güçteki Rakipler</p>
              <button onClick={loadPvp} disabled={pvpLoading} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: pvpLoading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, opacity: pvpLoading ? 0.5 : 1 }}>
                {pvpLoading ? '⏳' : '↻ Yenile'}
              </button>
            </div>

            {/* Günlük saldırı sayacı */}
            <div style={{
              background: pvpAttacksToday >= 5 ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.08)',
              border: `1px solid ${pvpAttacksToday >= 5 ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.2)'}`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>⚔️ Günlük Saldırı</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: i < pvpAttacksToday ? '#ef4444' : 'rgba(255,255,255,0.15)',
                    border: `1px solid ${i < pvpAttacksToday ? '#ef4444' : 'rgba(255,255,255,0.2)'}`,
                  }} />
                ))}
                <span style={{
                  marginLeft: 6, fontSize: 12, fontWeight: 700,
                  color: pvpAttacksToday >= 5 ? '#ef4444' : '#f97316',
                }}>
                  {pvpAttacksToday}/5
                </span>
              </div>
            </div>

            {pvpAttacksToday >= 5 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#ef4444' }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>🚫</p>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Günlük limit doldu</p>
                <p style={{ color: '#64748b', fontSize: 12 }}>Yarın tekrar saldırabilirsin</p>
              </div>
            ) : pvpTargets.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center', padding: '24px 0' }}>Yakın güçte rakip bulunamadı</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pvpTargets.map((p: any) => {
                  const shielded = p.shield_until && new Date(p.shield_until) > new Date();
                  const canAttack = army && army.total_power > 0 && !shielded && pvpAttacksToday < 5;
                  return (
                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${shielded ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                            {p.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 14 }}>{p.username}</p>
                            <p style={{ color: '#64748b', fontSize: 11 }}>Sv.{p.level} • ⚔️ {p.army_power}</p>
                          </div>
                          {shielded && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', padding: '2px 8px', borderRadius: 99 }}>
                              🛡️ {timeLeft(p.shield_until)}
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#64748b', fontSize: 11 }}>💰 ~{Math.floor((p.gold_amount || 0) * 0.15)} yağma</p>
                      </div>
                      <button
                        disabled={!canAttack}
                        onClick={() => { setBattleTarget(p); setBattleType('pvp'); }}
                        style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: canAttack ? 'pointer' : 'not-allowed', background: canAttack ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : 'rgba(255,255,255,0.08)', color: canAttack ? '#fff' : '#475569', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        {shielded ? '🛡️' : '⚔️ Saldır'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── RAPORLAR ─────────────────────────────────────────────────────── */}
        {tab === 'reports' && (
          <div style={{ ...CARD }}>
            <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>📜 Savaş Raporları</p>
            {reports.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center', padding: '24px 0' }}>Henüz savaş raporu yok</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reports.map((b: any) => {
                  const isAttack  = b.role === 'attack';
                  const isWin     = (isAttack && b.winner === 'attacker') || (!isAttack && b.winner === 'defender');
                  const opponent  = isAttack
                    ? (b.battle_type === 'pirate' ? b.pirate_name : b.defender_name)
                    : b.attacker_name;
                  return (
                    <div key={b.id} style={{
                      background: isWin ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${isWin ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      borderRadius: 12, padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 16 }}>{isWin ? '✅' : '❌'}</span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: isWin ? '#22c55e' : '#ef4444' }}>
                              {isWin ? 'ZAFER' : 'MAĞLUBİYET'}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: isAttack ? '#f97316' : '#3b82f6', background: isAttack ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.15)', padding: '1px 7px', borderRadius: 99 }}>
                              {isAttack ? 'Saldırı' : 'Savunma'}
                            </span>
                          </div>
                          <p style={{ color: '#94a3b8', fontSize: 12 }}>
                            {isAttack ? '→' : '←'} <strong>{opponent ?? 'Bilinmeyen'}</strong>
                          </p>
                          <p style={{ color: '#475569', fontSize: 11 }}>⚔️ {b.attacker_power} vs {b.defender_power}</p>
                          <p style={{ color: '#334155', fontSize: 10, marginTop: 2 }}>{formatReportDate(b.created_at)}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {/* Kazanınca: ödüller */}
                          {isWin && b.reward_gold > 0 && (
                            <>
                              <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>+{b.reward_gold}💰</p>
                              {b.reward_wood > 0 && <p style={{ color: '#22c55e', fontSize: 11 }}>+{b.reward_wood}🌲</p>}
                              {b.reward_food > 0 && <p style={{ color: '#ef4444', fontSize: 11 }}>+{b.reward_food}🍎</p>}
                            </>
                          )}
                          {/* XP */}
                          {isWin && b.reward_xp > 0 && (
                            <p style={{ color: '#a78bfa', fontSize: 11 }}>+{b.reward_xp}✨</p>
                          )}
                          {/* Kaybedince (savunma): yağmalanan kaynaklar */}
                          {!isWin && !isAttack && (b.reward_gold > 0 || b.reward_wood > 0 || b.reward_food > 0) && (
                            <>
                              {b.reward_gold > 0 && <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>-{b.reward_gold}💰</p>}
                              {b.reward_wood > 0 && <p style={{ color: '#ef4444', fontSize: 11 }}>-{b.reward_wood}🌲</p>}
                              {b.reward_food > 0 && <p style={{ color: '#ef4444', fontSize: 11 }}>-{b.reward_food}🍎</p>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SAVAŞ MODAL ──────────────────────────────────────────────────────── */}
      {battleTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => { if (!battleResult && !loading) closeBattle(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'relative', zIndex: 1, background: '#0f172a', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '20px 18px 32px' }}>

            {/* Savaş animasyonu (yükleme sırasında) */}
            {loading && !battleResult ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 12, transition: 'all .3s' }}>
                  {BATTLE_PHASES[battlePhase].emoji}
                </div>
                <p style={{
                  fontWeight: 800, fontSize: 20,
                  color: BATTLE_PHASES[battlePhase].color,
                  transition: 'color .3s',
                }}>
                  {BATTLE_PHASES[battlePhase].text}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20, fontSize: 32 }}>
                  <span style={{ opacity: battlePhase % 2 === 0 ? 1 : 0.3, transition: 'opacity .3s' }}>🏰</span>
                  <span style={{ fontSize: 18, alignSelf: 'center', color: '#ef4444' }}>⚡</span>
                  <span style={{ opacity: battlePhase % 2 === 1 ? 1 : 0.3, transition: 'opacity .3s' }}>
                    {battleType === 'pirate' ? '🏴‍☠️' : '👤'}
                  </span>
                </div>
              </div>
            ) : !battleResult ? (
              <>
                <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 12, textAlign: 'center' }}>⚔️ Savaşa Hazır mısın?</h2>

                {/* Güç karşılaştırma */}
                <div style={{ marginBottom: 8 }}>
                  <PowerBar
                    myPower={army?.total_power ?? 0}
                    theirPower={battleTarget.power ?? battleTarget.army_power ?? 0}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32 }}>🏰</div>
                    <p style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>Sen</p>
                    <p style={{ color: '#f97316', fontWeight: 800 }}>{army?.total_power ?? 0}</p>
                  </div>
                  <span style={{ fontSize: 24, color: '#ef4444' }}>⚡</span>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32 }}>{battleType === 'pirate' ? '🏴‍☠️' : '👤'}</div>
                    <p style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{battleTarget.name ?? battleTarget.username}</p>
                    <p style={{ color: '#ef4444', fontWeight: 800 }}>{battleTarget.power ?? battleTarget.army_power ?? 0}</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f59e0b' }}>
                  {battleType === 'pirate'
                    ? `Ödül: 💰 ${battleTarget.reward_gold}${battleTarget.reward_wood > 0 ? ` · 🌲 ${battleTarget.reward_wood}` : ''}${battleTarget.reward_xp > 0 ? ` · ✨ ${battleTarget.reward_xp} XP` : ''}`
                    : `Yağma: 💰 ~${Math.floor((battleTarget.gold_amount || 0) * 0.15)}`}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeBattle} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>İptal</button>
                  <button onClick={handleAttack} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                    ⚔️ Saldır!
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 52 }}>{battleResult.winner === 'attacker' ? '🎉' : '💀'}</div>
                  <h2 style={{ fontWeight: 900, fontSize: 24, color: battleResult.winner === 'attacker' ? '#22c55e' : '#ef4444', margin: '8px 0' }}>
                    {battleResult.winner === 'attacker' ? 'ZAFER!' : 'MAĞLUBİYET!'}
                  </h2>
                </div>

                {/* Güç sonuçları */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>Güç Karşılaştırması</span>
                    <span style={{ color: '#64748b', fontSize: 11 }}>
                      {battleResult.battle?.attacker_power ?? 0} vs {battleResult.battle?.defender_power ?? 0}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', display: 'flex', gap: 2 }}>
                    {(() => {
                      const a = battleResult.battle?.attacker_power ?? 0;
                      const d = battleResult.battle?.defender_power ?? 0;
                      const total = (a + d) || 1;
                      const pct = Math.round((a / total) * 100);
                      return (
                        <>
                          <div style={{ flex: pct, background: battleResult.winner === 'attacker' ? '#22c55e' : '#ef4444', borderRadius: '99px 0 0 99px' }} />
                          <div style={{ flex: 100 - pct, background: battleResult.winner === 'attacker' ? '#ef4444' : '#22c55e', borderRadius: '0 99px 99px 0' }} />
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {(battleResult.losses || battleResult.attacker_losses) && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 14px' }}>
                      <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Kayıpların</p>
                      <p style={{ color: '#94a3b8', fontSize: 13 }}>
                        🏹 {battleResult.losses?.archer ?? battleResult.attacker_losses?.archer ?? 0} &nbsp;
                        ⚔️ {battleResult.losses?.infantry ?? battleResult.attacker_losses?.infantry ?? 0} &nbsp;
                        🐴 {battleResult.losses?.cavalry ?? battleResult.attacker_losses?.cavalry ?? 0}
                      </p>
                    </div>
                  )}
                  {battleResult.winner === 'attacker' && battleResult.rewards && (
                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '10px 14px' }}>
                      <p style={{ color: '#22c55e', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Ödüller</p>
                      <p style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700 }}>
                        💰 {battleResult.rewards.gold ?? 0}
                        {(battleResult.rewards.wood ?? 0) > 0 && ` · 🌲 ${battleResult.rewards.wood}`}
                        {(battleResult.rewards.food ?? 0) > 0 && ` · 🍎 ${battleResult.rewards.food}`}
                      </p>
                      {(battleResult.rewards.xp ?? 0) > 0 && (
                        <p style={{ color: '#a78bfa', fontSize: 13, marginTop: 4 }}>✨ +{battleResult.rewards.xp} XP kazandın!</p>
                      )}
                    </div>
                  )}

                  {/* PvP kalan saldırı */}
                  {battleType === 'pvp' && battleResult.attacks_today !== undefined && (
                    <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Kalan günlük saldırı</span>
                      <span style={{ color: battleResult.attacks_today >= 5 ? '#ef4444' : '#f97316', fontWeight: 700, fontSize: 14 }}>
                        {5 - battleResult.attacks_today}/5
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={closeBattle} style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  Tamam
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── KALKAN MODAL ─────────────────────────────────────────────────────── */}
      {shieldModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setShieldModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'relative', zIndex: 1, background: '#0f172a', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '20px 18px 32px' }}>
            <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>🛡️ Koruma Kalkanı</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              {isShieldActive(army?.shield_until)
                ? `Mevcut süreye eklenir · Aktif: ${shieldCountdown(army?.shield_until)}`
                : 'Süresi boyunca hiç kimse sana saldıramaz.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {SHIELD_OPTIONS.map(opt => (
                <button
                  key={opt.hours}
                  onClick={() => setSelectedShield(opt.hours)}
                  style={{
                    padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: selectedShield === opt.hours ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                    outline: selectedShield === opt.hours ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                    color: '#f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>🛡️ {opt.label}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>💰 {opt.gold}</span>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShieldModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>İptal</button>
              <button onClick={handleBuyShield} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Alınıyor...' : '🛡️ Satın Al'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BattlePage;
