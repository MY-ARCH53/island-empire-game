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
const TYPE_META: Record<string, { icon: string; color: string }> = {
  pvp_win:        { icon: '⚔️',  color: '#34d399' },
  pvp_att_loss:   { icon: '💀',  color: '#f87171' },
  pvp_def_loss:   { icon: '🏴',  color: '#f87171' },
  pvp_def_win:    { icon: '🛡️',  color: '#60a5fa' },
  pirate_win:     { icon: '🏴‍☠️', color: '#34d399' },
  pirate_loss:    { icon: '💀',  color: '#f87171' },
  trade_sell:     { icon: '💰',  color: '#fbbf24' },
  trade_buy:      { icon: '🛒',  color: '#a78bfa' },
  daily_reward:   { icon: '🎁',  color: '#38bdf8' },
  gift_sent:      { icon: '📤',  color: '#fb923c' },
  gift_received:  { icon: '📥',  color: '#86efac' },
  guild_donation: { icon: '🏰',  color: '#e879f9' },
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
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError]     = useState('');
  const [ledgerOffset, setLedgerOffset]   = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [ledgerFilter, setLedgerFilter]   = useState<'all' | 'gold' | 'battle' | 'trade'>('all');
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
      setLedgerEvents(offset === 0 ? d.events : prev => [...prev, ...d.events]);
      setLedgerOffset(offset);
      setLedgerHasMore(d.hasMore);
    } catch (e: any) {
      setLedgerError(e.response?.data?.message || 'Hata oluştu');
      if (offset === 0) { setLedgerUser(null); setLedgerEvents([]); }
    }
    setLedgerLoading(false);
  }

  function handleLedgerSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = ledgerSearch.trim();
    if (!q) return;
    setLedgerEvents([]);
    setLedgerUser(null);
    fetchLedger(q, 0);
  }

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'all') return ledgerEvents;
    if (ledgerFilter === 'gold') return ledgerEvents.filter(ev => ev.gold_delta !== 0);
    if (ledgerFilter === 'battle') return ledgerEvents.filter(ev => ev.type.startsWith('pvp') || ev.type.startsWith('pirate'));
    if (ledgerFilter === 'trade') return ledgerEvents.filter(ev => ev.type.startsWith('trade') || ev.type.startsWith('gift') || ev.type === 'guild_donation');
    return ledgerEvents;
  }, [ledgerEvents, ledgerFilter]);

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
          {/* Arama formu */}
          <form onSubmit={handleLedgerSearch}
            style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
            <input
              ref={ledgerInputRef}
              value={ledgerSearch}
              onChange={e => setLedgerSearch(e.target.value)}
              placeholder="Kullanıcı adı gir ve Enter'a bas..."
              style={{
                padding: '10px 16px', borderRadius: 8, border: '2px solid #334155',
                background: '#1e293b', color: '#e2e8f0', fontSize: 15, width: 320,
                outline: 'none',
              }}
              autoFocus
            />
            <button type="submit" disabled={ledgerLoading || !ledgerSearch.trim()}
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', fontSize: 14,
                opacity: (!ledgerSearch.trim() || ledgerLoading) ? 0.5 : 1,
              }}>
              {ledgerLoading ? 'Aranıyor...' : 'Sorgula'}
            </button>
          </form>

          {ledgerError && (
            <div style={{ background: '#450a0a', border: '1px solid #f87171', borderRadius: 8, padding: '10px 16px', color: '#f87171', marginBottom: 16 }}>
              {ledgerError}
            </div>
          )}

          {/* Kullanıcı özeti */}
          {ledgerUser && (
            <div style={{
              background: '#1e293b', borderRadius: 10, padding: '14px 20px',
              marginBottom: 16, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center',
              borderLeft: '4px solid #38bdf8',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Kullanıcı</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#e2e8f0' }}>
                  #{ledgerUser.id} {ledgerUser.username}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{ledgerUser.email}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Seviye</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fbbf24' }}>{ledgerUser.level}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Mevcut Altın</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fbbf24' }}>{fmt(ledgerUser.gold)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Odun</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#a78bfa' }}>{fmt(ledgerUser.wood)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Yiyecek</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#86efac' }}>{fmt(ledgerUser.food)}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
                {ledgerEvents.length} işlem
              </div>
            </div>
          )}

          {/* Filtre butonları */}
          {ledgerUser && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([
                { key: 'all',    label: 'Tümü' },
                { key: 'gold',   label: '🪙 Altın Etkili' },
                { key: 'battle', label: '⚔️ Savaşlar' },
                { key: 'trade',  label: '🔄 Ticaret / Hediye' },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setLedgerFilter(f.key)} style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: ledgerFilter === f.key ? '#38bdf8' : '#1e293b',
                  color: ledgerFilter === f.key ? '#0f172a' : '#94a3b8',
                  fontWeight: ledgerFilter === f.key ? 'bold' : 'normal', fontSize: 13,
                }}>
                  {f.label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12, alignSelf: 'center' }}>
                {filteredLedger.length} satır gösteriliyor
              </span>
            </div>
          )}

          {/* İşlem tablosu */}
          {ledgerUser && !ledgerLoading && filteredLedger.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1e293b' }}>
                    {['Tarih & Saat', 'İşlem', 'Detay', 'Altın', 'Odun', 'Yiyecek'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((ev, i) => {
                    const meta = TYPE_META[ev.type] || { icon: '•', color: '#94a3b8' };
                    const goldPos = ev.gold_delta > 0;
                    const goldNeg = ev.gold_delta < 0;
                    return (
                      <tr key={i}
                        style={{ background: i % 2 === 0 ? '#0f172a' : '#111827', borderBottom: '1px solid #1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1e3a5f')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#0f172a' : '#111827')}>
                        <td style={{ padding: '7px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{dt(ev.created_at)}</td>
                        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: meta.color + '22', color: meta.color,
                            borderRadius: 4, padding: '2px 8px', fontWeight: 600, fontSize: 11,
                          }}>
                            {meta.icon} {ev.label}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', color: '#94a3b8', fontSize: 11 }}>{ev.detail}</td>
                        <td style={{
                          padding: '7px 12px', textAlign: 'right', fontWeight: 'bold',
                          color: goldPos ? '#34d399' : goldNeg ? '#f87171' : '#475569',
                        }}>
                          {ev.gold_delta !== 0 ? (goldPos ? '+' : '') + fmt(ev.gold_delta) : '—'}
                        </td>
                        <td style={{
                          padding: '7px 12px', textAlign: 'right',
                          color: ev.wood_delta !== 0 ? (ev.wood_delta > 0 ? '#a78bfa' : '#fb923c') : '#475569',
                        }}>
                          {ev.wood_delta !== 0 ? (ev.wood_delta > 0 ? '+' : '') + fmt(ev.wood_delta) : '—'}
                        </td>
                        <td style={{
                          padding: '7px 12px', textAlign: 'right',
                          color: ev.food_delta !== 0 ? (ev.food_delta > 0 ? '#86efac' : '#fb923c') : '#475569',
                        }}>
                          {ev.food_delta !== 0 ? (ev.food_delta > 0 ? '+' : '') + fmt(ev.food_delta) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Daha fazla yükle */}
              {ledgerHasMore && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    onClick={() => fetchLedger(ledgerUser.username, ledgerOffset + LEDGER_LIMIT)}
                    disabled={ledgerLoading}
                    style={{
                      padding: '8px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#334155', color: '#e2e8f0', fontSize: 13,
                      opacity: ledgerLoading ? 0.5 : 1,
                    }}>
                    {ledgerLoading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                  </button>
                </div>
              )}
            </div>
          )}

          {ledgerUser && !ledgerLoading && filteredLedger.length === 0 && (
            <p style={{ color: '#64748b', fontSize: 14 }}>Bu filtre için işlem kaydı bulunamadı.</p>
          )}

          {!ledgerUser && !ledgerLoading && !ledgerError && (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#334155' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15 }}>Kullanıcı adı girerek işlem geçmişini sorgulayın</div>
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
