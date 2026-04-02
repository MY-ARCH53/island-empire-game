import { useState, useEffect, useMemo, useRef } from 'react';
import { admin2API } from '../services/api';

// ─── types ───────────────────────────────────────────────────────────────────
interface Player {
  id: number;
  username: string;
  email: string;
  level: number;
  experience: number;
  created_at: string;
  last_login: string | null;
  last_seen: string | null;
  is_active: boolean;
  army_power: number;
  archer_count: number;
  infantry_count: number;
  cavalry_count: number;
  gold: number;
  food: number;
  wood: number;
  total_battles: number;
  battle_wins: number;
  island_count: number;
}

interface Battle {
  id: number;
  battle_type: string;
  attacker_id: number;
  attacker_name: string;
  defender_id: number;
  defender_name: string;
  winner_id: number | null;
  winner_name: string | null;
  attacker_power: number;
  defender_power: number;
  reward_gold: number;
  reward_wood: number;
  reward_food: number;
  reward_xp: number;
  created_at: string;
}

interface LedgerEvent {
  type: string;
  label: string;
  gold_delta: number;
  wood_delta: number;
  food_delta: number;
  detail: string;
  created_at: string;
}

interface LedgerUser {
  id: number;
  username: string;
  email: string;
  level: number;
  gold: number;
  wood: number;
  food: number;
}

interface LedgerSummary {
  total_events: number;
  gold_earned: number;
  gold_spent: number;
  gold_net: number;
  wood_earned: number;
  food_earned: number;
}

interface ActivityMetrics {
  total_players: number;
  active_today: number;
  active_week: number;
  never_logged_in: number;
  registered_last_30d: number;
  online_now: number;
  top_battlers: { id: number; username: string; battle_count: number; wins: number }[];
  top_by_gold:  { id: number; username: string; gold: number }[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | string) { return Number(n).toLocaleString('tr-TR'); }
function dt(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}
function ago(s: string | null) {
  if (!s) return '—';
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Az önce';
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

type SortKey = keyof Player;

// ─── type badges ─────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: string; color: string; group: string }> = {
  pvp_win:          { icon: '⚔️',  color: '#34d399', group: 'battle' },
  pvp_att_loss:     { icon: '💀',  color: '#f87171', group: 'battle' },
  pvp_def_loss:     { icon: '🏴',  color: '#ef4444', group: 'battle' },
  pvp_def_win:      { icon: '🛡️',  color: '#60a5fa', group: 'battle' },
  pirate_win:       { icon: '🏴‍☠️', color: '#34d399', group: 'battle' },
  pirate_loss:      { icon: '💀',  color: '#f87171', group: 'battle' },
  trade_sell:       { icon: '💰',  color: '#fbbf24', group: 'trade'  },
  trade_buy:        { icon: '🛒',  color: '#a78bfa', group: 'trade'  },
  daily_reward:     { icon: '🎁',  color: '#38bdf8', group: 'trade'  },
  gift_sent:        { icon: '📤',  color: '#fb923c', group: 'trade'  },
  gift_received:    { icon: '📥',  color: '#86efac', group: 'trade'  },
  guild_donation:   { icon: '🏰',  color: '#e879f9', group: 'trade'  },
  building_collect: { icon: '🏗️',  color: '#f59e0b', group: 'building' },
  building_auto:    { icon: '⚙️',  color: '#94a3b8', group: 'building' },
};

// ─── component ───────────────────────────────────────────────────────────────
export default function Admin2Page() {
  const [tab, setTab] = useState<'players' | 'battles' | 'activity' | 'ledger'>('players');

  // players
  const [players, setPlayers]           = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [sortKey, setSortKey]           = useState<SortKey>('created_at');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [search, setSearch]             = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerDetail, setPlayerDetail] = useState<{ player: Player; battles: Battle[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // battles
  const [battles, setBattles]           = useState<Battle[]>([]);
  const [battlesTotal, setBattlesTotal] = useState(0);
  const [battlesLoading, setBattlesLoading] = useState(false);
  const [battleOffset, setBattleOffset] = useState(0);
  const BATTLE_LIMIT = 100;

  // activity
  const [activity, setActivity]         = useState<ActivityMetrics | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // ledger
  const [ledgerSearch, setLedgerSearch]   = useState('');
  const [ledgerUser, setLedgerUser]       = useState<LedgerUser | null>(null);
  const [ledgerEvents, setLedgerEvents]   = useState<LedgerEvent[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError]     = useState('');
  const [ledgerOffset, setLedgerOffset]   = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [ledgerFilter, setLedgerFilter]   = useState<'all' | 'gold' | 'battle' | 'trade' | 'building'>('all');
  const ledgerInputRef = useRef<HTMLInputElement>(null);
  const LEDGER_LIMIT = 100;

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'players' && players.length === 0) fetchPlayers();
    if (tab === 'battles' && battles.length === 0) fetchBattles(0);
    if (tab === 'activity' && !activity) fetchActivity();
  }, [tab]);

  async function fetchPlayers() {
    setPlayersLoading(true);
    try {
      const r = await admin2API.getPlayers();
      setPlayers(r.data.data.players);
    } catch { /* ignore */ }
    setPlayersLoading(false);
  }

  async function fetchBattles(offset: number) {
    setBattlesLoading(true);
    try {
      const r = await admin2API.getAllBattles(BATTLE_LIMIT, offset);
      setBattles(r.data.data.battles);
      setBattlesTotal(r.data.data.total);
      setBattleOffset(offset);
    } catch { /* ignore */ }
    setBattlesLoading(false);
  }

  async function fetchActivity() {
    setActivityLoading(true);
    try {
      const r = await admin2API.getActivityMetrics();
      setActivity(r.data.data);
    } catch { /* ignore */ }
    setActivityLoading(false);
  }

  async function fetchLedger(username: string, offset: number) {
    setLedgerLoading(true);
    setLedgerError('');
    try {
      const r = await admin2API.getUserLedger(username, LEDGER_LIMIT, offset);
      const d = r.data.data;
      setLedgerUser(d.user);
      if (offset === 0) {
        setLedgerEvents(d.events);
        setLedgerSummary(d.summary);
      } else {
        setLedgerEvents(prev => [...prev, ...d.events]);
      }
      setLedgerOffset(offset);
      setLedgerHasMore(d.hasMore);
    } catch (e: any) {
      setLedgerError(e.response?.data?.message || 'Hata oluştu');
      if (offset === 0) { setLedgerUser(null); setLedgerEvents([]); setLedgerSummary(null); }
    }
    setLedgerLoading(false);
  }

  function handleLedgerSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = ledgerSearch.trim();
    if (!q) return;
    setLedgerEvents([]);
    setLedgerUser(null);
    setLedgerSummary(null);
    setLedgerFilter('all');
    fetchLedger(q, 0);
  }

  const filteredLedger = useMemo(() => {
    switch (ledgerFilter) {
      case 'gold':     return ledgerEvents.filter(ev => ev.gold_delta !== 0);
      case 'battle':   return ledgerEvents.filter(ev => ev.type.startsWith('pvp') || ev.type.startsWith('pirate'));
      case 'trade':    return ledgerEvents.filter(ev => ev.type.startsWith('trade') || ev.type.startsWith('gift') || ev.type === 'guild_donation' || ev.type === 'daily_reward');
      case 'building': return ledgerEvents.filter(ev => ev.type.startsWith('building'));
      default:         return ledgerEvents;
    }
  }, [ledgerEvents, ledgerFilter]);

  // Running balance: en yeni event'ten geriye doğru hesapla
  const runningBalances = useMemo(() => {
    if (!ledgerUser) return [];
    const balances: number[] = [];
    let bal = ledgerUser.gold;
    for (let i = 0; i < ledgerEvents.length; i++) {
      balances.push(bal);
      bal -= ledgerEvents[i].gold_delta;
    }
    return balances;
  }, [ledgerEvents, ledgerUser]);

  // Filtre sayaçları
  const filterCounts = useMemo(() => ({
    all:      ledgerEvents.length,
    gold:     ledgerEvents.filter(ev => ev.gold_delta !== 0).length,
    battle:   ledgerEvents.filter(ev => ev.type.startsWith('pvp') || ev.type.startsWith('pirate')).length,
    trade:    ledgerEvents.filter(ev => ev.type.startsWith('trade') || ev.type.startsWith('gift') || ev.type === 'guild_donation' || ev.type === 'daily_reward').length,
    building: ledgerEvents.filter(ev => ev.type.startsWith('building')).length,
  }), [ledgerEvents]);

  async function openPlayerDetail(p: Player) {
    setSelectedPlayer(p);
    setDetailLoading(true);
    try {
      const r = await admin2API.getPlayerDetail(p.id);
      setPlayerDetail(r.data.data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  }

  // ── sort + filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return players.filter(p =>
      !q ||
      p.username.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  }, [players, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as number | string | null;
      const bv = b[sortKey] as number | string | null;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function colArrow(key: SortKey) {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#38bdf8' }}>
        Admin2 — Detayli Rapor Paneli
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['players', 'battles', 'activity', 'ledger'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? '#38bdf8' : '#1e293b', color: tab === t ? '#0f172a' : '#94a3b8',
            fontWeight: tab === t ? 'bold' : 'normal', fontSize: 14,
          }}>
            {t === 'players' ? 'Oyuncular' : t === 'battles' ? 'Savaslar' : t === 'activity' ? 'Aktivite' : '📋 İşlem Defteri'}
          </button>
        ))}
      </div>

      {/* ── PLAYERS TAB ───────────────────────────────────────────────────── */}
      {tab === 'players' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Ara: kullanici / email / ID..."
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', width: 280, fontSize: 13 }}
            />
            <span style={{ color: '#64748b', fontSize: 13 }}>{sorted.length} / {players.length} oyuncu</span>
            <button onClick={fetchPlayers} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 6, border: 'none', background: '#334155', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>
              Yenile
            </button>
          </div>

          {playersLoading ? (
            <p style={{ color: '#64748b' }}>Yukleniyor...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1e293b' }}>
                    {[
                      { label: 'ID',       key: 'id' },
                      { label: 'Kullanici', key: 'username' },
                      { label: 'Email',    key: 'email' },
                      { label: 'Seviye',   key: 'level' },
                      { label: 'XP',       key: 'experience' },
                      { label: 'Kaya',     key: 'created_at' },
                      { label: 'Son Giris', key: 'last_login' },
                      { label: 'Son Aktif', key: 'last_seen' },
                      { label: 'Piyade',   key: 'infantry_count' },
                      { label: 'Okcu',     key: 'archer_count' },
                      { label: 'Suvari',   key: 'cavalry_count' },
                      { label: 'Guc',      key: 'army_power' },
                      { label: 'Altin',    key: 'gold' },
                      { label: 'Yiyecek',  key: 'food' },
                      { label: 'Odun',     key: 'wood' },
                      { label: 'Savaslar', key: 'total_battles' },
                      { label: 'Gali',     key: 'battle_wins' },
                      { label: 'Ada',      key: 'island_count' },
                    ].map(({ label, key }) => (
                      <th key={key} onClick={() => toggleSort(key as SortKey)}
                        style={{ padding: '8px 10px', textAlign: 'left', cursor: 'pointer', whiteSpace: 'nowrap',
                          color: sortKey === key ? '#38bdf8' : '#94a3b8', userSelect: 'none' }}>
                        {label}{colArrow(key as SortKey)}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px', color: '#94a3b8' }}>Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => (
                    <tr key={p.id}
                      style={{ background: i % 2 === 0 ? '#0f172a' : '#141e2e', borderBottom: '1px solid #1e293b' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1e3a5f')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#0f172a' : '#141e2e')}>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{p.id}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#e2e8f0' }}>{p.username}</td>
                      <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{p.email}</td>
                      <td style={{ padding: '6px 10px', color: '#fbbf24', textAlign: 'right' }}>{p.level}</td>
                      <td style={{ padding: '6px 10px', color: '#94a3b8', textAlign: 'right' }}>{fmt(p.experience)}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{dt(p.created_at)}</td>
                      <td style={{ padding: '6px 10px', color: p.last_login ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>{ago(p.last_login)}</td>
                      <td style={{ padding: '6px 10px', color: p.last_seen ? '#38bdf8' : '#475569', whiteSpace: 'nowrap' }}>{ago(p.last_seen)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(p.infantry_count)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(p.archer_count)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(p.cavalry_count)}</td>
                      <td style={{ padding: '6px 10px', color: '#f59e0b', textAlign: 'right', fontWeight: 'bold' }}>{fmt(p.army_power)}</td>
                      <td style={{ padding: '6px 10px', color: '#fbbf24', textAlign: 'right' }}>{fmt(p.gold)}</td>
                      <td style={{ padding: '6px 10px', color: '#86efac', textAlign: 'right' }}>{fmt(p.food)}</td>
                      <td style={{ padding: '6px 10px', color: '#a78bfa', textAlign: 'right' }}>{fmt(p.wood)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{p.total_battles}</td>
                      <td style={{ padding: '6px 10px', color: '#34d399', textAlign: 'right' }}>{p.battle_wins}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{p.island_count}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <button onClick={() => openPlayerDetail(p)} style={{
                          padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                          background: '#1d4ed8', color: '#fff', fontSize: 11,
                        }}>Ac</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BATTLES TAB ───────────────────────────────────────────────────── */}
      {tab === 'battles' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 13 }}>
              {battles.length} / {battlesTotal} savas (sayfa {Math.floor(battleOffset / BATTLE_LIMIT) + 1})
            </span>
            <button onClick={() => fetchBattles(Math.max(0, battleOffset - BATTLE_LIMIT))}
              disabled={battleOffset === 0}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#334155', color: '#e2e8f0', fontSize: 13 }}>
              Onceki
            </button>
            <button onClick={() => fetchBattles(battleOffset + BATTLE_LIMIT)}
              disabled={battleOffset + BATTLE_LIMIT >= battlesTotal}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#334155', color: '#e2e8f0', fontSize: 13 }}>
              Sonraki
            </button>
            <button onClick={() => fetchBattles(0)} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, border: 'none', background: '#334155', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>
              Yenile
            </button>
          </div>

          {battlesLoading ? (
            <p style={{ color: '#64748b' }}>Yukleniyor...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1e293b' }}>
                    {['ID', 'Tarih', 'Tur', 'Saldiran', 'Saldiran Guc', 'Savunan', 'Savunan Guc', 'Kazanan', 'Altin', 'Odun', 'Yiyecek', 'XP'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {battles.map((b, i) => (
                    <tr key={b.id}
                      style={{ background: i % 2 === 0 ? '#0f172a' : '#141e2e', borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{b.id}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{dt(b.created_at)}</td>
                      <td style={{ padding: '6px 10px', color: '#a78bfa' }}>{b.battle_type}</td>
                      <td style={{ padding: '6px 10px', color: '#38bdf8' }}>{b.attacker_name}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#f59e0b' }}>{fmt(b.attacker_power)}</td>
                      <td style={{ padding: '6px 10px', color: '#f87171' }}>{b.defender_name}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#f59e0b' }}>{fmt(b.defender_power)}</td>
                      <td style={{ padding: '6px 10px', color: '#34d399', fontWeight: 'bold' }}>{b.winner_name || '—'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#fbbf24' }}>{fmt(b.reward_gold)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#a78bfa' }}>{fmt(b.reward_wood)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#86efac' }}>{fmt(b.reward_food)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#60a5fa' }}>{fmt(b.reward_xp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY TAB ──────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div>
          <button onClick={fetchActivity} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#334155', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>
            Yenile
          </button>

          {activityLoading ? (
            <p style={{ color: '#64748b' }}>Yukleniyor...</p>
          ) : activity ? (
            <div>
              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Toplam Oyuncu',    value: activity.total_players,       color: '#38bdf8' },
                  { label: 'Bugun Aktif',       value: activity.active_today,        color: '#34d399' },
                  { label: 'Bu Hafta Aktif',    value: activity.active_week,         color: '#86efac' },
                  { label: 'Hic Giris Yapmamis', value: activity.never_logged_in,   color: '#f87171' },
                  { label: 'Son 30 Gun Kayit',  value: activity.registered_last_30d, color: '#fbbf24' },
                  { label: 'Simdi Online',      value: activity.online_now,          color: '#a78bfa' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#1e293b', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${m.color}` }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 'bold', color: m.color }}>{fmt(m.value)}</div>
                  </div>
                ))}
              </div>

              {/* Top Tables */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Top Battlers */}
                <div style={{ background: '#1e293b', borderRadius: 10, padding: 14 }}>
                  <h3 style={{ fontSize: 14, color: '#38bdf8', marginBottom: 10 }}>En Cok Savaşan (Top 10)</h3>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 6 }}>#</th>
                        <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 6 }}>Kullanici</th>
                        <th style={{ textAlign: 'right', color: '#64748b', paddingBottom: 6 }}>Savas</th>
                        <th style={{ textAlign: 'right', color: '#64748b', paddingBottom: 6 }}>Gali</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.top_battlers.map((p, i) => (
                        <tr key={p.id} style={{ borderTop: '1px solid #334155' }}>
                          <td style={{ padding: '5px 0', color: '#64748b' }}>{i + 1}</td>
                          <td style={{ padding: '5px 4px', color: '#e2e8f0' }}>{p.username}</td>
                          <td style={{ padding: '5px 0', textAlign: 'right', color: '#f59e0b' }}>{p.battle_count}</td>
                          <td style={{ padding: '5px 0', textAlign: 'right', color: '#34d399' }}>{p.wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Top Gold */}
                <div style={{ background: '#1e293b', borderRadius: 10, padding: 14 }}>
                  <h3 style={{ fontSize: 14, color: '#fbbf24', marginBottom: 10 }}>En Fazla Altın (Top 10)</h3>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 6 }}>#</th>
                        <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 6 }}>Kullanici</th>
                        <th style={{ textAlign: 'right', color: '#64748b', paddingBottom: 6 }}>Altin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.top_by_gold.map((p, i) => (
                        <tr key={p.id} style={{ borderTop: '1px solid #334155' }}>
                          <td style={{ padding: '5px 0', color: '#64748b' }}>{i + 1}</td>
                          <td style={{ padding: '5px 4px', color: '#e2e8f0' }}>{p.username}</td>
                          <td style={{ padding: '5px 0', textAlign: 'right', color: '#fbbf24', fontWeight: 'bold' }}>{fmt(p.gold)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#f87171' }}>Veri yuklenemedi.</p>
          )}
        </div>
      )}

      {/* ── LEDGER TAB ────────────────────────────────────────────────────── */}
      {tab === 'ledger' && (
        <div>

          {/* ── Arama formu ── */}
          <form onSubmit={handleLedgerSearch} style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 16 }}>🔍</span>
              <input
                ref={ledgerInputRef}
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                placeholder="Kullanıcı adı gir..."
                style={{
                  padding: '10px 16px 10px 38px', borderRadius: 8,
                  border: '2px solid ' + (ledgerError ? '#f87171' : '#334155'),
                  background: '#1e293b', color: '#e2e8f0', fontSize: 14, width: 280,
                  outline: 'none', transition: 'border-color .2s',
                }}
                autoFocus
              />
            </div>
            <button type="submit" disabled={ledgerLoading || !ledgerSearch.trim()} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', fontSize: 14,
              opacity: (!ledgerSearch.trim() || ledgerLoading) ? 0.5 : 1,
              letterSpacing: '.3px',
            }}>
              {ledgerLoading && ledgerOffset === 0 ? '⏳ Sorgulanıyor...' : 'Sorgula'}
            </button>
            {ledgerUser && (
              <button type="button" onClick={() => { setLedgerSearch(''); setLedgerUser(null); setLedgerEvents([]); setLedgerSummary(null); setLedgerError(''); }} style={{
                padding: '10px 16px', borderRadius: 8, border: '1px solid #334155', cursor: 'pointer',
                background: 'transparent', color: '#64748b', fontSize: 13,
              }}>
                Temizle
              </button>
            )}
          </form>

          {ledgerError && (
            <div style={{ background: '#450a0a', border: '1px solid #f87171', borderRadius: 8, padding: '10px 16px', color: '#f87171', marginBottom: 16, fontSize: 13 }}>
              ⚠️ {ledgerError}
            </div>
          )}

          {/* ── Kullanıcı profil kartı ── */}
          {ledgerUser && (
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f2137 100%)',
              borderRadius: 12, padding: '16px 22px', marginBottom: 16,
              border: '1px solid #334155', borderLeft: '4px solid #38bdf8',
              display: 'grid', gridTemplateColumns: 'auto 1fr repeat(3, auto)', gap: '0 32px', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Oyuncu</div>
                <div style={{ fontSize: 17, fontWeight: 'bold', color: '#e2e8f0' }}>#{ledgerUser.id} — {ledgerUser.username}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{ledgerUser.email}</div>
              </div>
              <div />
              {[
                { label: 'Seviye',      value: String(ledgerUser.level),  color: '#fbbf24' },
                { label: 'Anlık Altın', value: fmt(ledgerUser.gold),      color: '#fbbf24' },
                { label: 'Odun',        value: fmt(ledgerUser.wood),      color: '#a78bfa' },
                { label: 'Yiyecek',     value: fmt(ledgerUser.food),      color: '#86efac' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: m.color, fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Özet istatistik bar ── */}
          {ledgerSummary && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 10, marginBottom: 16,
            }}>
              {[
                { label: 'Toplam İşlem',   value: fmt(ledgerSummary.total_events), color: '#94a3b8',  icon: '📊' },
                { label: 'Altın Kazanılan', value: '+' + fmt(ledgerSummary.gold_earned), color: '#34d399', icon: '📈' },
                { label: 'Altın Harcanan',  value: '-' + fmt(ledgerSummary.gold_spent),  color: '#f87171', icon: '📉' },
                { label: 'Net Altın',       value: (ledgerSummary.gold_net >= 0 ? '+' : '') + fmt(ledgerSummary.gold_net), color: ledgerSummary.gold_net >= 0 ? '#34d399' : '#f87171', icon: '⚖️' },
                { label: 'Odun Kazanılan',  value: '+' + fmt(ledgerSummary.wood_earned), color: '#a78bfa', icon: '🪵' },
                { label: 'Yiyecek Kazanılan', value: '+' + fmt(ledgerSummary.food_earned), color: '#86efac', icon: '🌾' },
              ].map(m => (
                <div key={m.label} style={{
                  background: '#1e293b', borderRadius: 8, padding: '10px 14px',
                  border: '1px solid #334155', borderTop: '2px solid ' + m.color,
                }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{m.icon} {m.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 'bold', color: m.color, fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Filtre sekmeleri ── */}
          {ledgerUser && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {([
                { key: 'all',      label: 'Tümü',            icon: '📋' },
                { key: 'gold',     label: 'Altın Etkili',    icon: '🪙' },
                { key: 'battle',   label: 'Savaşlar',        icon: '⚔️' },
                { key: 'trade',    label: 'Ticaret / Hediye', icon: '🔄' },
                { key: 'building', label: 'Binalar',          icon: '🏗️' },
              ] as const).map(f => {
                const count = filterCounts[f.key];
                const active = ledgerFilter === f.key;
                return (
                  <button key={f.key} onClick={() => setLedgerFilter(f.key)} style={{
                    padding: '6px 14px', borderRadius: 20, border: active ? 'none' : '1px solid #334155',
                    cursor: 'pointer', fontSize: 12, fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#38bdf8' : '#1e293b',
                    color: active ? '#0f172a' : '#94a3b8',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    transition: 'all .15s',
                  }}>
                    <span>{f.icon} {f.label}</span>
                    <span style={{
                      background: active ? 'rgba(0,0,0,.15)' : '#334155',
                      borderRadius: 10, padding: '1px 7px', fontSize: 11,
                      color: active ? '#0f172a' : '#64748b',
                    }}>{count}</span>
                  </button>
                );
              })}
              <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 11, alignSelf: 'center' }}>
                {filteredLedger.length} / {ledgerEvents.length} kayıt {ledgerHasMore ? '(daha fazla var)' : '(tümü yüklendi)'}
              </span>
            </div>
          )}

          {/* ── İşlem tablosu ── */}
          {ledgerUser && filteredLedger.length > 0 && (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #1e293b' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
                    {[
                      { label: 'Tarih & Saat',   align: 'left'  },
                      { label: 'İşlem Türü',      align: 'left'  },
                      { label: 'Detay',           align: 'left'  },
                      { label: '🪙 Altın Değişimi', align: 'right' },
                      { label: '🪵 Odun',          align: 'right' },
                      { label: '🌾 Yiyecek',       align: 'right' },
                      { label: '💰 Sonraki Bakiye', align: 'right' },
                    ].map(h => (
                      <th key={h.label} style={{
                        padding: '10px 12px', textAlign: h.align as 'left' | 'right',
                        color: '#64748b', whiteSpace: 'nowrap', fontWeight: 600,
                        fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px',
                        borderBottom: '1px solid #334155',
                      }}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((ev, fi) => {
                    // filteredLedger'daki event'in ledgerEvents'taki gerçek index'ini bul (running balance için)
                    const realIdx = ledgerEvents.indexOf(ev);
                    const balAfter = realIdx >= 0 ? runningBalances[realIdx] : null;

                    const meta   = TYPE_META[ev.type] || { icon: '•', color: '#94a3b8', group: 'other' };
                    const gPos   = ev.gold_delta > 0;
                    const gNeg   = ev.gold_delta < 0;
                    const rowBg  = fi % 2 === 0 ? '#0c1526' : '#0f172a';

                    return (
                      <tr key={fi}
                        style={{ background: rowBg, borderBottom: '1px solid #1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#172035')}
                        onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>

                        {/* Tarih */}
                        <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {dt(ev.created_at)}
                        </td>

                        {/* İşlem türü badge */}
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: meta.color + '18', color: meta.color,
                            borderRadius: 5, padding: '3px 9px', fontWeight: 600, fontSize: 11,
                            border: '1px solid ' + meta.color + '40',
                          }}>
                            {meta.icon} {ev.label}
                          </span>
                        </td>

                        {/* Detay */}
                        <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.detail}
                        </td>

                        {/* Altın değişimi */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                          {ev.gold_delta !== 0 ? (
                            <span style={{
                              color: gPos ? '#34d399' : '#f87171',
                              background: gPos ? '#052e1622' : '#450a0a22',
                              borderRadius: 4, padding: '2px 7px',
                            }}>
                              {gPos ? '+' : ''}{fmt(ev.gold_delta)}
                            </span>
                          ) : (
                            <span style={{ color: '#334155' }}>—</span>
                          )}
                        </td>

                        {/* Odun */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          color: ev.wood_delta > 0 ? '#a78bfa' : ev.wood_delta < 0 ? '#fb923c' : '#334155' }}>
                          {ev.wood_delta !== 0 ? (ev.wood_delta > 0 ? '+' : '') + fmt(ev.wood_delta) : '—'}
                        </td>

                        {/* Yiyecek */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          color: ev.food_delta > 0 ? '#86efac' : ev.food_delta < 0 ? '#fb923c' : '#334155' }}>
                          {ev.food_delta !== 0 ? (ev.food_delta > 0 ? '+' : '') + fmt(ev.food_delta) : '—'}
                        </td>

                        {/* Running balance */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {balAfter !== null ? (
                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>{fmt(balAfter)}</span>
                          ) : (
                            <span style={{ color: '#334155' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Daha fazla yükle */}
          {ledgerUser && ledgerHasMore && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => fetchLedger(ledgerUser.username, ledgerOffset + LEDGER_LIMIT)}
                disabled={ledgerLoading}
                style={{
                  padding: '9px 32px', borderRadius: 8, border: '1px solid #334155',
                  cursor: 'pointer', background: '#1e293b', color: '#e2e8f0', fontSize: 13,
                  opacity: ledgerLoading ? 0.5 : 1,
                }}>
                {ledgerLoading ? '⏳ Yükleniyor...' : `⬇ Daha Fazla Yükle (${ledgerOffset + ledgerEvents.length}/${ledgerSummary?.total_events ?? '?'} kayıt)`}
              </button>
            </div>
          )}

          {ledgerUser && !ledgerLoading && filteredLedger.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔎</div>
              <div style={{ fontSize: 13 }}>Bu filtre için işlem kaydı bulunamadı.</div>
            </div>
          )}

          {!ledgerUser && !ledgerLoading && !ledgerError && (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#1e3a5f' }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>📋</div>
              <div style={{ fontSize: 16, color: '#334155', fontWeight: 600 }}>İşlem Defteri</div>
              <div style={{ fontSize: 13, color: '#1e3a5f', marginTop: 6 }}>
                Kullanıcı adı girerek tüm kaynak hareketlerini sorgulayın
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── PLAYER DETAIL MODAL ───────────────────────────────────────────── */}
      {selectedPlayer && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 40, overflowY: 'auto',
        }} onClick={e => { if (e.target === e.currentTarget) { setSelectedPlayer(null); setPlayerDetail(null); } }}>
          <div style={{
            background: '#0f172a', borderRadius: 12, width: '90%', maxWidth: 900,
            padding: 24, border: '1px solid #334155', marginBottom: 40,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: '#38bdf8', fontSize: 18 }}>
                #{selectedPlayer.id} — {selectedPlayer.username}
              </h2>
              <button onClick={() => { setSelectedPlayer(null); setPlayerDetail(null); }}
                style={{ background: '#334155', border: 'none', color: '#e2e8f0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                Kapat
              </button>
            </div>

            {detailLoading ? (
              <p style={{ color: '#64748b' }}>Yukleniyor...</p>
            ) : playerDetail ? (
              <div>
                {/* Player info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { l: 'Email',    v: playerDetail.player.email },
                    { l: 'Seviye',   v: playerDetail.player.level },
                    { l: 'XP',       v: fmt(playerDetail.player.experience) },
                    { l: 'Kayit',    v: dt(playerDetail.player.created_at) },
                    { l: 'Son Giris', v: dt(playerDetail.player.last_login) },
                    { l: 'Altin',    v: fmt(playerDetail.player.gold) },
                    { l: 'Yiyecek', v: fmt(playerDetail.player.food) },
                    { l: 'Odun',     v: fmt(playerDetail.player.wood) },
                    { l: 'Piyade',   v: fmt(playerDetail.player.infantry_count) },
                    { l: 'Okcu',     v: fmt(playerDetail.player.archer_count) },
                    { l: 'Suvari',   v: fmt(playerDetail.player.cavalry_count) },
                    { l: 'Ordu Gucu', v: fmt(playerDetail.player.army_power) },
                  ].map(({ l, v }) => (
                    <div key={l} style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 14, color: '#e2e8f0', wordBreak: 'break-all' }}>{v ?? '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Battles */}
                <h3 style={{ color: '#94a3b8', fontSize: 14, marginBottom: 10 }}>
                  Savaslar ({playerDetail.battles.length})
                </h3>
                <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#1e293b' }}>
                      <tr>
                        {['Tarih', 'Tur', 'Saldiran', 'Saldiran Guc', 'Savunan', 'Savunan Guc', 'Kazanan', 'Altin', 'XP'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {playerDetail.battles.map((b, i) => {
                        const won = b.winner_id === selectedPlayer.id;
                        const isAttacker = b.attacker_id === selectedPlayer.id;
                        return (
                          <tr key={b.id}
                            style={{ background: i % 2 === 0 ? '#0f172a' : '#141e2e', borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '5px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{dt(b.created_at)}</td>
                            <td style={{ padding: '5px 10px', color: '#a78bfa' }}>{b.battle_type}</td>
                            <td style={{ padding: '5px 10px', color: isAttacker ? '#38bdf8' : '#94a3b8' }}>{b.attacker_name}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#f59e0b' }}>{fmt(b.attacker_power)}</td>
                            <td style={{ padding: '5px 10px', color: !isAttacker ? '#38bdf8' : '#94a3b8' }}>{b.defender_name}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#f59e0b' }}>{fmt(b.defender_power)}</td>
                            <td style={{ padding: '5px 10px', fontWeight: 'bold', color: won ? '#34d399' : '#f87171' }}>
                              {b.winner_name || '—'} {won ? '(Siz)' : ''}
                            </td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#fbbf24' }}>{fmt(b.reward_gold)}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#60a5fa' }}>{fmt(b.reward_xp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
