import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, TreePine, Apple, Zap, LogOut, Play, Package, X } from 'lucide-react';
import { gameAPI, productionAPI, taskAPI, dailyRewardAPI, autoProductionAPI, battleAPI, tradeAPI, spinAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { fireConfetti, fireRewardConfetti, fireLevelUpConfetti } from '../utils/confetti';
import DailyRewardModal from '../components/DailyRewardModal';

// ── Sabit veri ──────────────────────────────────────────────────────────────

const RESOURCE_CFG: any = {
  gold:   { icon: Coins,    color: '#f59e0b', label: 'Altın'   },
  wood:   { icon: TreePine, color: '#10b981', label: 'Odun'    },
  food:   { icon: Apple,    color: '#ef4444', label: 'Yiyecek' },
  energy: { icon: Zap,      color: '#06b6d4', label: 'Enerji'  },
};

const BUILDING_CFG: any = {
  trafo:          { emoji: '⚡', color: '#06b6d4', label: 'Enerji',  bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.35)'  },
  tarla:          { emoji: '🌾', color: '#22c55e', label: 'Yiyecek', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)'  },
  odun_fabrikasi: { emoji: '🪵', color: '#f59e0b', label: 'Odun',   bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  maden:          { emoji: '⛏️', color: '#eab308', label: 'Altın',   bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)'  },
};

const NAV_ITEMS = [
  { key: 'tasks',       emoji: '📋', label: 'Görevler'  },
  { key: 'discover',    emoji: '🗺️', label: 'Keşif'    },
  { key: 'spin',        emoji: '🎰', label: 'Çark'      },
  { key: 'battle',      emoji: '⚔️', label: 'Savaş'    },
  { key: 'trade',       emoji: '🔄', label: 'Ticaret'   },
  { key: 'market',      emoji: '🏪', label: 'Pazar'     },
  { key: 'leaderboard', emoji: '🏆', label: 'Liderlik'  },
  { key: 'friends',     emoji: '👥', label: 'Arkadaş'   },
  { key: 'guild',       emoji: '🏰', label: 'Guild'     },
];

const TRADE_RATES = [
  { type: 'energy', emoji: '⚡', label: 'Enerji',   per: 100, gold: 10,  color: '#06b6d4' },
  { type: 'food',   emoji: '🍎', label: 'Yiyecek',  per: 100, gold: 15,  color: '#ef4444' },
  { type: 'wood',   emoji: '🌲', label: 'Odun',     per: 100, gold: 20,  color: '#10b981' },
];

const ISLAND_RANKS = ['Köylü', 'Çırak', 'Tüccar', 'Usta', 'Baron', 'Lord', 'Efsane'];
function getIslandRank(islandCount: number): string {
  return ISLAND_RANKS[Math.min(Math.max(islandCount - 1, 0), ISLAND_RANKS.length - 1)] ?? 'Köylü';
}

// ── Yardımcı: MM:SS timer ───────────────────────────────────────────────────

function formatTimer(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Bileşen ─────────────────────────────────────────────────────────────────

function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser]               = useState<any>(null);
  const [islands, setIslands]         = useState<any[]>([]);
  const [resources, setResources]     = useState<any[]>([]);
  const [buildings, setBuildings]     = useState<any[]>([]);
  const [productions, setProductions] = useState<any>({});
  const [discoverableIslands, setDiscoverableIslands] = useState<any[]>([]);
  const [tasks, setTasks]             = useState<any[]>([]);
  const [selectedIslandId, setSelectedIslandId] = useState<number | null>(null);
  const selectedIslandIdRef = useRef<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null); // 'tasks' | 'discover'
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [dailyRewardData, setDailyRewardData] = useState<any>(null);
  const [streakAtRisk, setStreakAtRisk]       = useState(false);
  const [streakCount, setStreakCount]         = useState(0);
  const [dailyCanClaim, setDailyCanClaim]     = useState(false);
  const [autoProduction, setAutoProduction]   = useState<{ active: boolean; endsAt: string | null; remainingMs: number }>({ active: false, endsAt: null, remainingMs: 0 });
  const [attackNotifications, setAttackNotifications] = useState(0);
  const [tradeAmounts, setTradeAmounts] = useState<Record<string, number>>({ energy: 100, food: 100, wood: 100 });
  const [tradingType, setTradingType]   = useState<string | null>(null);
  const [xpBar, setXpBar]               = useState<{ xp: number; xpNeeded: number } | null>(null);
  const [spinStatus, setSpinStatus]     = useState<{ canSpin: boolean; nextSpinAt: string | null; baseGold: number } | null>(null);
  const [spinning, setSpinning]         = useState(false);
  const [spinResult, setSpinResult]     = useState<{ multiplier: number; goldEarned: number } | null>(null);
  const [spinDisplay, setSpinDisplay]   = useState<number>(2);

  // Saniye ticker → bina timer + oto-üretim geri sayım
  useEffect(() => {
    const ticker = setInterval(() => {
      setBuildings(prev => [...prev]);
      setAutoProduction(prev => prev.active && prev.remainingMs > 0
        ? { ...prev, remainingMs: Math.max(0, prev.remainingMs - 1000) }
        : prev
      );
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Veri yükleme döngüsü
  useEffect(() => {
    loadGameData();
    const interval = setInterval(loadGameData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Upgrade otomatik tamamlama
  useEffect(() => {
    buildings.forEach(b => {
      if (b.status === 'upgrading' && b.upgrade_completes_at) {
        if (new Date() >= new Date(b.upgrade_completes_at)) {
          handleCompleteUpgrade(b.id);
        }
      }
    });
  }, [buildings]);

  // ── Veri yükleme ──────────────────────────────────────────────────────────

  const loadGameData = async () => {
    try {
      const token    = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (!token || !userData) { navigate('/login'); return; }

      const u = JSON.parse(userData);
      setUser(u);

      const [islandsRes, resourcesRes, discoverableRes, tasksRes] = await Promise.all([
        gameAPI.getIslands(u.id),
        gameAPI.getResources(u.id),
        gameAPI.getDiscoverableIslands(u.id),
        taskAPI.getTasks(u.id),
      ]);

      const islandsData = islandsRes.data.data.islands;
      setIslands(islandsData);
      setResources(resourcesRes.data.data.resources);
      setDiscoverableIslands(discoverableRes.data.data.islands);
      setTasks(tasksRes.data.data.tasks);

      if (islandsData.length > 0) {
        const currentId = selectedIslandIdRef.current || islandsData[0].id;
        selectedIslandIdRef.current = currentId;
        setSelectedIslandId(currentId);
        await loadIslandBuildings(currentId);
      }

      try {
        const dr = await dailyRewardAPI.check(u.id);
        const drData = dr.data.data;
        setStreakCount(drData.streakCount ?? 0);
        setDailyCanClaim(drData.canClaim ?? false);
        if (drData.canClaim) {
          setDailyRewardData(drData);
          setShowDailyReward(true);
          setStreakAtRisk(drData.streakAtRisk ?? false);
        }
      } catch {}

      // Otomatik üretim: durum al + tick işlet
      try {
        const apRes = await autoProductionAPI.getStatus(u.id);
        const apData = apRes.data.data;
        setAutoProduction(apData);
        if (apData.active) {
          await autoProductionAPI.tick(u.id);
        }
      } catch {}

      // Savaş bildirimi: saldırıya uğrama sayısı
      try {
        const unreadRes = await battleAPI.getUnreadAttacks(u.id);
        setAttackNotifications(unreadRes.data.data.count);
      } catch {}

      setLoading(false);
    } catch { setLoading(false); }
  };

  const loadIslandBuildings = async (islandId: number) => {
    const buildingsRes = await gameAPI.getBuildings(islandId);
    const bList = buildingsRes.data.data.buildings;
    setBuildings(bList);

    const prodsData: any = {};
    const prodResults = await Promise.all(
      bList.map((b: any) => productionAPI.getBuildingProductions(b.id))
    );
    prodResults.forEach((prodRes: any, i: number) => {
      const active = prodRes.data.data.productions.find((p: any) => !p.collected);
      if (active) prodsData[bList[i].id] = active;
    });
    setProductions(prodsData);
  };

  const handleIslandChange = async (id: number) => {
    selectedIslandIdRef.current = id;
    setSelectedIslandId(id);
    await loadIslandBuildings(id);
  };

  // ── Level-up işleyici ─────────────────────────────────────────────────────
  const handleXP = (xpResult: any) => {
    if (!xpResult) return;
    // XP barını güncelle
    setXpBar({ xp: xpResult.xp, xpNeeded: xpResult.xpNeeded });
    // User level'ını güncelle (state + localStorage)
    if (xpResult.leveledUp) {
      setUser((prev: any) => {
        if (!prev) return prev;
        const updated = { ...prev, level: xpResult.newLevel };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
      fireLevelUpConfetti();
      showToast(`🎉 LEVEL ${xpResult.newLevel}! +${xpResult.goldReward?.toLocaleString()} altın!`, 'success');
    }
  };

  // ── Üretim işlemleri ──────────────────────────────────────────────────────

  const handleStartProduction = async (buildingId: number) => {
    // userId production controller'a iletilir (görev takibi için)
    try {
      const res = await productionAPI.startProduction(buildingId, user?.id);
      showToast('Üretim başladı!', 'success');
      handleXP(res.data.data?.xp);
      const prod = res.data.data.production;
      setBuildings((prev: any[]) => prev.map(b => b.id === buildingId ? { ...b, status: 'producing' } : b));
      setProductions((prev: any) => ({ ...prev, [buildingId]: prod }));
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Üretim başlatılamadı', 'error');
    }
  };

  const handleCollectProduction = async (productionId: number) => {
    if (!user) return;
    try {
      const res = await productionAPI.collectProduction(productionId, user.id);
      showToast(res.data.message, 'success');
      handleXP(res.data.data?.xp);
      // Sadece bina durumunu ve kaynakları güncelle
      const buildingId = Object.keys(productions).find(
        (key: any) => productions[key]?.id === productionId
      );
      if (buildingId) {
        setBuildings((prev: any[]) => prev.map(b => b.id === parseInt(buildingId) ? { ...b, status: 'idle' } : b));
        setProductions((prev: any) => { const next = { ...prev }; delete next[parseInt(buildingId)]; return next; });
      }
      // Sadece kaynakları yenile
      gameAPI.getResources(user.id).then(r => setResources(r.data.data.resources)).catch(() => {});
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Toplanamadı', 'error');
    }
  };

  const handleUpgradeBuilding = async (buildingId: number) => {
    if (!user) return;
    try {
      const res = await gameAPI.upgradeBuilding(buildingId, user.id);
      showToast(res.data.message, 'success');
      handleXP(res.data.data?.xp);
      loadGameData();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Yükseltme başarısız', 'error');
    }
  };

  const handleCompleteUpgrade = async (buildingId: number) => {
    try { await gameAPI.completeUpgrade(buildingId); loadGameData(); } catch {}
  };

  // ── Ada keşfi ─────────────────────────────────────────────────────────────

  const handleDiscoverIsland = async (island: any) => {
    if (!user) return;
    try {
      const res = await gameAPI.discoverIsland(user.id, island.name, island.type, island.specialty, island.bonus);
      setActivePanel(null);
      showToast(`🏝️ ${island.name} keşfedildi!`, 'success');
      setTimeout(() => { fireConfetti(); fireRewardConfetti(); }, 100);
      handleXP(res.data.data?.xp);
      loadGameData();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Keşif başarısız', 'error');
    }
  };

  // ── Görevler ──────────────────────────────────────────────────────────────

  const handleClaimReward = async (taskId: number) => {
    if (!user) return;
    try {
      const res = await taskAPI.claimReward(taskId, user.id);
      fireRewardConfetti();
      showToast(res.data.message, 'success');
      loadGameData();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Ödül toplanamadı', 'error');
    }
  };

  const handleClaimDailyReward = async () => {
    if (!user) return;
    try {
      const res = await dailyRewardAPI.claim(user.id);
      showToast(res.data.message, 'success');
      setShowDailyReward(false);
      loadGameData();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Ödül alınamadı', 'error');
    }
  };

  const handleActivateAutoProduction = async () => {
    if (!user) return;
    try {
      const res = await autoProductionAPI.activate(user.id);
      showToast(res.data.message, 'success');
      fireConfetti();
      loadGameData();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Otomatik üretim başlatılamadı', 'error');
    }
  };

  // ── Üretim durumu ─────────────────────────────────────────────────────────

  const getProductionStatus = (building: any) => {
    const prod = productions[building.id];
    if (!prod) return { status: 'idle', timerText: '', canCollect: false, percent: 0, productionId: null };

    const now        = Date.now();
    const completesAt = new Date(prod.completes_at).getTime();
    const startedAt  = new Date(prod.started_at).getTime();
    const remaining  = completesAt - now;
    const total      = completesAt - startedAt;
    const percent    = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));

    if (remaining <= 0) return { status: 'ready', timerText: 'Hazır!', canCollect: true, percent: 100, productionId: prod.id };
    return { status: 'producing', timerText: formatTimer(remaining), canCollect: false, percent, productionId: null };
  };

  const getUpgradeTimerText = (building: any): string | null => {
    if (building.status !== 'upgrading' || !building.upgrade_completes_at) return null;
    const remaining = new Date(building.upgrade_completes_at).getTime() - Date.now();
    return remaining <= 0 ? 'Hazır!' : formatTimer(remaining);
  };

  const getUpgradePercent = (building: any): number => {
    if (building.status !== 'upgrading' || !building.upgrade_completes_at || !building.upgrade_started_at) return 0;
    const remaining = new Date(building.upgrade_completes_at).getTime() - Date.now();
    const total     = new Date(building.upgrade_completes_at).getTime() - new Date(building.upgrade_started_at).getTime();
    return Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  };

  // ── Nav aksiyonu ──────────────────────────────────────────────────────────

  const handleNavAction = (key: string) => {
    if (key === 'tasks' || key === 'discover' || key === 'trade' || key === 'spin') {
      if (key === 'spin' && !spinStatus && user) {
        spinAPI.getStatus(user.id).then(r => setSpinStatus(r.data.data)).catch(() => {});
      }
      setActivePanel(activePanel === key ? null : key);
      if (key === 'spin') setSpinResult(null);
    } else if (key === 'market')       navigate('/marketplace');
    else if (key === 'leaderboard')    navigate('/leaderboard');
    else if (key === 'battle')         navigate('/battle');
    else if (key === 'friends')        navigate('/friends');
    else if (key === 'guild')          navigate('/guilds');
  };

  const handleSpin = async () => {
    if (!user || spinning || !spinStatus?.canSpin) return;
    setSpinning(true);
    setSpinResult(null);

    // Animasyon: 2.5 saniye boyunca hızlı sayı döndür
    const multis = [2, 3, 4, 5, 6, 8, 10];
    let tick = 0;
    const anim = setInterval(() => {
      setSpinDisplay(multis[tick % multis.length]);
      tick++;
    }, 120);

    try {
      const res = await spinAPI.spin(user.id);
      const { multiplier, goldEarned, xp } = res.data.data;

      setTimeout(() => {
        clearInterval(anim);
        setSpinDisplay(multiplier);
        setSpinResult({ multiplier, goldEarned });
        setSpinStatus(prev => prev ? { ...prev, canSpin: false } : prev);
        setSpinning(false);
        handleXP(xp);
        if (multiplier >= 5) { fireConfetti(); fireRewardConfetti(); }
        else { fireRewardConfetti(); }
        // Kaynakları güncelle
        gameAPI.getResources(user.id).then(r => setResources(r.data.data.resources)).catch(() => {});
      }, 2500);
    } catch (e: any) {
      clearInterval(anim);
      setSpinning(false);
      showToast(e.response?.data?.message || 'Hata oluştu', 'error');
    }
  };

  const handleTrade = async (resourceType: string) => {
    const amount = tradeAmounts[resourceType];
    setTradingType(resourceType);
    try {
      const res = await tradeAPI.convert(user.id, resourceType, amount);
      const { gold_earned, resource_spent } = res.data.data;
      setResources(res.data.data.resources);
      showToast(`+${gold_earned}💰 kazandın! (${resource_spent} ${resourceType === 'energy' ? '⚡' : resourceType === 'food' ? '🍎' : '🌲'} harcandı)`, 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Ticaret başarısız', 'error');
    } finally {
      setTradingType(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#93c5fd', fontWeight: 600 }}>Yükleniyor...</p>
      </div>
    </div>
  );

  if (!user) return null;

  const currentIsland = islands.find(i => i.id === selectedIslandId) || islands[0];
  const activeTasks   = tasks.filter(t => !t.claimed).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100svh', background: 'linear-gradient(160deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* ════════════ HEADER ════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 16px 0',
      }}>
        {/* Üst satır: Avatar + kullanıcı + çıkış */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 0 12px rgba(245,158,11,0.4)',
            }}>⛵</div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{user.username}</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                <Pill color="#3b82f6">Sv.{user.level}</Pill>
                <Pill color="#8b5cf6">{getIslandRank(islands.length)}</Pill>
                <Pill color="#10b981">{islands.length} Ada</Pill>
                {(streakCount > 0 || dailyCanClaim) && (
                  <button
                    onClick={() => setShowDailyReward(true)}
                    style={{
                      background: streakAtRisk
                        ? 'linear-gradient(90deg,#dc2626,#ea580c)'
                        : dailyCanClaim
                        ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                        : 'rgba(251,146,60,0.20)',
                      border: (streakAtRisk || dailyCanClaim) ? 'none' : '1px solid rgba(251,146,60,0.40)',
                      borderRadius: 99, padding: '2px 8px', cursor: 'pointer',
                      fontSize: 10, fontWeight: 700,
                      color: (streakAtRisk || dailyCanClaim) ? '#fff' : '#fb923c',
                      animation: (streakAtRisk || dailyCanClaim) ? 'pulse 1.5s infinite' : 'none',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {streakCount > 0 ? `🔥 ${streakCount}` : '🎁 Ödül!'}
                  </button>
                )}
              </div>
              {xpBar && (
                <div style={{ marginTop: 5, width: 160 }}>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${Math.min(100, (xpBar.xp / xpBar.xpNeeded) * 100)}%`,
                      background: 'linear-gradient(90deg,#a78bfa,#6366f1)',
                      transition: 'width .4s ease',
                    }} />
                  </div>
                  <p style={{ color: '#7c3aed', fontSize: 9, marginTop: 2 }}>{xpBar.xp} / {xpBar.xpNeeded} XP</p>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('/tlcoin')}
              style={{
                background: 'linear-gradient(135deg,#e11d48,#be123c)',
                border: 'none', borderRadius: 10,
                padding: '8px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: '0 0 14px rgba(225,29,72,0.50)',
              }}
            >
              <span style={{ fontSize: 15 }}>🪙</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>TLCoin</span>
            </button>
            <button
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Kaynaklar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, paddingBottom: 10 }}>
          {['gold', 'wood', 'food', 'energy'].map(type => {
            const res = resources.find((r: any) => r.resource_type === type);
            const cfg = RESOURCE_CFG[type];
            if (!cfg || !res) return null;
            const Icon = cfg.icon;
            return (
              <div key={type} style={{
                background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`,
                borderRadius: 10, padding: '6px 8px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Icon size={14} color={cfg.color} style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1 }}>{cfg.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: cfg.color, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {Math.floor(res.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* ════════════ ANA İÇERİK ════════════ */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 100 }}>

        {/* Streak tehlikede banner */}
        {streakAtRisk && (
          <button
            onClick={() => setShowDailyReward(true)}
            style={{
              width: '100%', marginBottom: 12,
              background: 'linear-gradient(90deg,#dc2626,#ea580c)',
              border: 'none', borderRadius: 12, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              animation: 'pulse 2s infinite',
            }}
          >
            <span style={{ fontSize: 22 }}>🔥</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>Streak kırılacak! Bugün ödülünü al</p>
              <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: 11, margin: 0 }}>Almadan çıkarsan serin sıfırlanır → Dokun!</p>
            </div>
          </button>
        )}

        {/* Ada sekmeleri */}
        {islands.length > 1 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
            {islands.map(island => (
              <button
                key={island.id}
                onClick={() => handleIslandChange(island.id)}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  ...(island.id === selectedIslandId
                    ? { background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#fff', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }
                    : { background: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.10)' }),
                }}
              >
                🏝️ {island.name}
              </button>
            ))}
          </div>
        )}

        {/* Seçili ada başlığı */}
        {currentIsland && (
          <div style={{
            background: 'linear-gradient(135deg,rgba(59,130,246,0.18),rgba(6,182,212,0.12))',
            border: '1px solid rgba(59,130,246,0.30)', borderRadius: 16,
            padding: '12px 14px', marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>🏝️ {currentIsland.name}</p>
              <p style={{ color: '#93c5fd', fontSize: 12, marginTop: 2 }}>{currentIsland.specialty}</p>
            </div>
            <span style={{ background: 'rgba(59,130,246,0.25)', color: '#93c5fd', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>
              Sv.{currentIsland.level}
            </span>
          </div>
        )}

        {/* ── Otomatik Üretim Kartı ── */}
        <div style={{
          background: autoProduction.active
            ? 'linear-gradient(135deg,rgba(6,182,212,0.15),rgba(59,130,246,0.10))'
            : 'rgba(255,255,255,0.03)',
          border: autoProduction.active
            ? '1px solid rgba(6,182,212,0.45)'
            : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>⚡</span>
            <div>
              <p style={{ color: autoProduction.active ? '#06b6d4' : '#94a3b8', fontWeight: 700, fontSize: 13 }}>
                Otomatik Üretim
                {autoProduction.active && (
                  <span style={{ marginLeft: 6, background: 'rgba(6,182,212,0.25)', color: '#06b6d4', fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>AKTİF</span>
                )}
              </p>
              {autoProduction.active ? (
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  Kalan: {(() => {
                    const totalSec = Math.ceil(autoProduction.remainingMs / 1000);
                    const h = Math.floor(totalSec / 3600);
                    const m = Math.floor((totalSec % 3600) / 60);
                    const s = totalSec % 60;
                    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                  })()}
                </p>
              ) : (
                <p style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>💡 1000 enerji · ⏱ 4 saat</p>
              )}
            </div>
          </div>
          {!autoProduction.active && (
            <button
              onClick={handleActivateAutoProduction}
              style={{
                background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', border: 'none', borderRadius: 10,
                color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Etkinleştir
            </button>
          )}
        </div>

        {/* Bina kartları 2×2 */}
        {buildings.length > 0 && (
          <>
            <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Binalar</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {buildings.map(building => {
                const ps  = getProductionStatus(building);
                const upgradeText    = getUpgradeTimerText(building);
                const upgradePercent = getUpgradePercent(building);
                const cfg = BUILDING_CFG[building.type] || { emoji: '🏠', color: '#64748b', label: building.production_type, bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.30)' };
                const UPGRADE_COSTS = [
                  {gold:0,wood:0},{gold:0,wood:0},{gold:350,wood:175},{gold:612,wood:306},
                  {gold:1072,wood:536},{gold:1876,wood:938},{gold:3283,wood:1641},{gold:5745,wood:2872},
                  {gold:10053,wood:5027},{gold:17593,wood:8796},{gold:30787,wood:15394},{gold:53878,wood:26939},
                  {gold:94286,wood:47143},{gold:165001,wood:82501},{gold:288752,wood:144376},{gold:505316,wood:252658},
                  {gold:884302,wood:442151},{gold:1547529,wood:773764},{gold:2708176,wood:1354088},
                  {gold:4739307,wood:2369654},{gold:8293788,wood:4146894},
                ];
                const cost = building.level >= 20 ? {gold:0,wood:0} : (UPGRADE_COSTS[building.level + 1] || {gold:0,wood:0});

                return (
                  <div key={building.id} style={{
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    borderRadius: 18, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    {/* Emoji + isim + seviye */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 26, lineHeight: 1 }}>{cfg.emoji}</span>
                        <div>
                          <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{building.name}</p>
                          <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>+{Math.floor(building.production_rate)} {cfg.label}/s</p>
                        </div>
                      </div>
                      <span style={{ background: 'rgba(255,255,255,0.10)', color: '#94a3b8', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>
                        Sv.{building.level}
                      </span>
                    </div>

                    {/* Durum rozeti */}
                    <div>
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                        ...(ps.status === 'ready'
                          ? { background: 'rgba(34,197,94,0.25)', color: '#4ade80' }
                          : ps.status === 'producing'
                          ? { background: 'rgba(249,115,22,0.20)', color: '#fb923c' }
                          : building.status === 'upgrading'
                          ? { background: 'rgba(168,85,247,0.20)', color: '#c084fc' }
                          : { background: 'rgba(100,116,139,0.20)', color: '#94a3b8' }),
                      }}>
                        {building.status === 'upgrading' && upgradeText
                          ? `🔨 ${upgradeText}`
                          : ps.status === 'ready' ? '✅ Hazır!'
                          : ps.status === 'producing' ? `⏳ ${ps.timerText}`
                          : 'Boşta'}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {(ps.status === 'producing' || building.status === 'upgrading') && (
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: building.status === 'upgrading' ? '#a855f7' : cfg.color,
                          width: `${building.status === 'upgrading' ? upgradePercent : ps.percent}%`,
                          transition: 'width 1s linear',
                        }} />
                      </div>
                    )}

                    {/* Aksiyon butonları */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {building.status !== 'upgrading' && ps.status === 'idle' && (
                        <>
                          <button
                            onClick={() => handleStartProduction(building.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#22c55e', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 0', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                          >
                            <Play size={14} /> Üret
                          </button>
                          <button
                            onClick={() => handleUpgradeBuilding(building.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(168,85,247,0.20)', border: '1px solid rgba(168,85,247,0.40)', borderRadius: 12, color: '#c084fc', fontWeight: 600, fontSize: 11, padding: '7px 0', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                          >
                            ⬆️ {cost.gold}💰 {cost.wood}🌲
                          </button>
                        </>
                      )}

                      {ps.canCollect && (
                        <button
                          onClick={() => handleCollectProduction(ps.productionId)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 0', cursor: 'pointer', animation: 'pulse 1.5s infinite', WebkitTapHighlightColor: 'transparent' }}
                        >
                          <Package size={14} /> Topla!
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {islands.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏝️</div>
            <p style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>Henüz adan yok!</p>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>Oyunu yeniden başlat.</p>
          </div>
        )}
      </main>

      {/* ════════════ PANEL: GÖREVLER ════════════ */}
      {activePanel === 'tasks' && (() => {
        const dailyTasks  = tasks.filter((t: any) => !t.is_weekly);
        const weeklyTasks = tasks.filter((t: any) => t.is_weekly);
        const renderTask  = (task: any) => {
          const pct = Math.min(100, (task.progress / task.target) * 100);
          const isWeekly = task.is_weekly;
          return (
            <div key={task.id} style={{
              background: task.claimed ? 'rgba(255,255,255,0.04)' : task.completed ? (isWeekly ? 'rgba(168,85,247,0.12)' : 'rgba(34,197,94,0.10)') : 'rgba(255,255,255,0.06)',
              border: `1px solid ${task.claimed ? 'rgba(255,255,255,0.06)' : task.completed ? (isWeekly ? 'rgba(168,85,247,0.35)' : 'rgba(34,197,94,0.30)') : (isWeekly ? 'rgba(168,85,247,0.20)' : 'rgba(255,255,255,0.10)')}`,
              borderRadius: 14, padding: 14, opacity: task.claimed ? 0.5 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{task.description}</p>
                  <p style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{task.progress} / {task.target}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginLeft: 10, flexShrink: 0 }}>
                  <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>💰{task.reward_gold.toLocaleString()}</span>
                  <span style={{ color: '#a78bfa', fontSize: 10 }}>+{task.reward_experience} XP</span>
                </div>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: task.completed ? (isWeekly ? '#a855f7' : '#22c55e') : (isWeekly ? '#7c3aed' : '#3b82f6'), transition: 'width .5s' }} />
              </div>
              {task.claimed
                ? <span style={{ color: '#475569', fontSize: 12 }}>✅ Tamamlandı</span>
                : task.completed
                ? <button onClick={() => handleClaimReward(task.id)} style={{ background: isWeekly ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#22c55e', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 16px', cursor: 'pointer' }}>🎁 Ödül Topla</button>
                : <span style={{ color: '#64748b', fontSize: 12 }}>🔄 Devam ediyor...</span>
              }
            </div>
          );
        };
        return (
          <BottomPanel title={`📋 Görevler (${activeTasks} aktif)`} onClose={() => setActivePanel(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Günlük */}
              <p style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700, margin: 0 }}>📅 GÜNLÜK GÖREVLER</p>
              {dailyTasks.length === 0
                ? <p style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>Görev bulunamadı.</p>
                : dailyTasks.map(renderTask)
              }
              {/* Haftalık */}
              <p style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, margin: '10px 0 0' }}>🏆 HAFTALIK GÖREVLER</p>
              {weeklyTasks.length === 0
                ? <p style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>Görev bulunamadı.</p>
                : weeklyTasks.map(renderTask)
              }
            </div>
          </BottomPanel>
        );
      })()}

      {/* ════════════ PANEL: ADA KEŞFİ ════════════ */}
      {activePanel === 'discover' && (
        <BottomPanel title={`🗺️ Ada Keşfi (${islands.length}/7)`} onClose={() => setActivePanel(null)}>
          {islands.length >= 7
            ? <p style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>Maksimum ada sayısına ulaştın!</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {discoverableIslands.map(island => (
                  <div key={island.id} style={{
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.30)',
                    borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>{island.name}</p>
                      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>{island.specialty}</p>
                      <p style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600, marginTop: 4 }}>💰{island.cost.gold} &nbsp;🌲{island.cost.wood}</p>
                    </div>
                    <button
                      onClick={() => handleDiscoverIsland(island)}
                      style={{ flexShrink: 0, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 16px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                    >
                      Keşfet
                    </button>
                  </div>
                ))}
              </div>
            )
          }
        </BottomPanel>
      )}

      {/* ════════════ PANEL: ÇARK ════════════ */}
      {activePanel === 'spin' && (
        <BottomPanel title="🎰 Günlük Çark" onClose={() => setActivePanel(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '10px 0' }}>

            {/* Çark görseli */}
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: spinning
                ? 'conic-gradient(#f59e0b,#ef4444,#8b5cf6,#06b6d4,#22c55e,#f59e0b)'
                : spinResult
                ? spinResult.multiplier >= 5
                  ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
                  : 'linear-gradient(135deg,#3b82f6,#8b5cf6)'
                : 'linear-gradient(135deg,#1e293b,#334155)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: spinning ? '0 0 40px rgba(245,158,11,0.6)' : '0 0 20px rgba(99,102,241,0.3)',
              transition: 'box-shadow .3s',
              animation: spinning ? 'spin360 0.4s linear infinite' : 'none',
            }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                x{spinDisplay}
              </span>
            </div>

            {/* CSS animasyon */}
            <style>{`@keyframes spin360 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            {/* Sonuç */}
            {spinResult && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#fbbf24', fontWeight: 800, fontSize: 22 }}>
                  🎉 x{spinResult.multiplier} — +{spinResult.goldEarned.toLocaleString()} 💰
                </p>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Yarın tekrar çevirebilirsin!</p>
              </div>
            )}

            {/* Çevirme butonu / durum */}
            {!spinStatus ? (
              <p style={{ color: '#64748b' }}>Yükleniyor...</p>
            ) : spinStatus.canSpin ? (
              <button
                onClick={handleSpin}
                disabled={spinning}
                style={{
                  background: spinning ? '#334155' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
                  border: 'none', borderRadius: 16, color: '#fff', fontWeight: 800,
                  fontSize: 16, padding: '14px 40px', cursor: spinning ? 'not-allowed' : 'pointer',
                  boxShadow: spinning ? 'none' : '0 0 20px rgba(245,158,11,0.5)',
                  transition: 'all .3s',
                }}
              >
                {spinning ? '⏳ Dönüyor...' : '🎰 Çarkı Çevir!'}
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 13 }}>Bugün çevrildi ✅</p>
                {spinStatus.nextSpinAt && (
                  <p style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                    Sonraki: {new Date(spinStatus.nextSpinAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            )}

            {/* Ödül tablosu */}
            <div style={{ width: '100%' }}>
              <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>
                Baz ödül: {spinStatus?.baseGold?.toLocaleString() ?? '...'} altın
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {[2,3,4,5,6,8,10].map(m => (
                  <div key={m} style={{
                    background: spinResult?.multiplier === m ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${spinResult?.multiplier === m ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 8, padding: '6px 2px', textAlign: 'center',
                  }}>
                    <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>x{m}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BottomPanel>
      )}

      {/* ════════════ PANEL: TİCARET ════════════ */}
      {activePanel === 'trade' && (
        <BottomPanel title="🔄 Ticaret — Kaynak → Altın" onClose={() => setActivePanel(null)}>
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>
            Fazla kaynaklarını altına çevir. Miktar 100'ün katı olmalı.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TRADE_RATES.map(rate => {
              const res = resources.find((r: any) => r.resource_type === rate.type);
              const balance = res ? Math.floor(res.amount) : 0;
              const amount  = tradeAmounts[rate.type];
              const goldOut = Math.floor((amount / rate.per) * rate.gold);
              const canTrade = balance >= amount && amount >= rate.per && amount % rate.per === 0;
              return (
                <div key={rate.type} style={{
                  background: `rgba(${rate.color === '#06b6d4' ? '6,182,212' : rate.color === '#ef4444' ? '239,68,68' : '16,185,129'},0.08)`,
                  border: `1px solid ${rate.color}44`, borderRadius: 14, padding: 14,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={{ color: rate.color, fontWeight: 700, fontSize: 14 }}>{rate.emoji} {rate.label}</p>
                    <p style={{ color: '#64748b', fontSize: 12 }}>Bakiye: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{balance.toLocaleString()}</span></p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <input
                      type="number" min={rate.per} step={rate.per}
                      value={amount}
                      onChange={e => setTradeAmounts(prev => ({ ...prev, [rate.type]: Number(e.target.value) }))}
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none',
                      }}
                    />
                    <span style={{ color: '#475569', fontSize: 16 }}>→</span>
                    <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '9px 14px', minWidth: 70, textAlign: 'center' }}>
                      <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14 }}>💰 {goldOut}</p>
                    </div>
                  </div>
                  <p style={{ color: '#475569', fontSize: 11, marginBottom: 8 }}>
                    Oran: {rate.per} {rate.emoji} = {rate.gold} 💰
                  </p>
                  <button
                    onClick={() => handleTrade(rate.type)}
                    disabled={!canTrade || tradingType === rate.type}
                    style={{
                      width: '100%',
                      background: !canTrade ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${rate.color},${rate.color}bb)`,
                      border: !canTrade ? '1px solid rgba(255,255,255,0.10)' : 'none',
                      borderRadius: 10, color: !canTrade ? '#475569' : '#fff',
                      fontWeight: 700, fontSize: 13, padding: '10px 0',
                      cursor: !canTrade ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {tradingType === rate.type ? 'İşleniyor...' : !canTrade ? 'Yetersiz kaynak' : `${rate.emoji} Sat → 💰 ${goldOut} Altın`}
                  </button>
                </div>
              );
            })}
          </div>
        </BottomPanel>
      )}

      {/* ════════════ ALT NAVİGASYON ════════════ */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)' }}>
          {NAV_ITEMS.map(item => {
            const isActive = activePanel === item.key;
            const hasBadge = (item.key === 'tasks' && activeTasks > 0) || (item.key === 'battle' && attackNotifications > 0);
            const badgeCount = item.key === 'battle' ? attackNotifications : activeTasks;
            return (
              <button
                key={item.key}
                onClick={() => handleNavAction(item.key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent', position: 'relative',
                }}
              >
                {/* Aktif çizgi */}
                {isActive && (
                  <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, background: '#3b82f6', borderRadius: '0 0 2px 2px' }} />
                )}
                <span style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji}</span>
                <span style={{ fontSize: 10, marginTop: 3, fontWeight: 600, color: isActive ? '#60a5fa' : '#475569' }}>{item.label}</span>
                {/* Görev rozeti */}
                {hasBadge && (
                  <span style={{
                    position: 'absolute', top: 6, right: '18%',
                    background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700,
                    borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>{badgeCount > 9 ? '9+' : badgeCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ════════════ GÜNLÜK ÖDÜL MODAL ════════════ */}
      {showDailyReward && dailyRewardData && (
        <DailyRewardModal
          day={dailyRewardData.day}
          reward={dailyRewardData.reward}
          streakCount={streakCount}
          streakAtRisk={streakAtRisk}
          onClaim={handleClaimDailyReward}
          onClose={() => setShowDailyReward(false)}
        />
      )}
    </div>
  );
}

// ── Alt panel bileşeni ────────────────────────────────────────────────────────

function BottomPanel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Arka plan karartma */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '75svh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Tutma çubuğu */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
        </div>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 10px' }}>
          <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{title}</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {/* İçerik */}
        <div style={{ overflowY: 'auto', padding: '0 16px 16px', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Küçük rozet bileşeni ──────────────────────────────────────────────────────

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      background: `${color}22`, color, fontSize: 10, fontWeight: 600,
      padding: '2px 7px', borderRadius: 20,
    }}>
      {children}
    </span>
  );
}

export default HomePage;
