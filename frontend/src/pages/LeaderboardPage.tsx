import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { leaderboardAPI } from '../services/api';

// ── Lig yapılandırması ────────────────────────────────────────────────────────

const LEAGUES = [
  { key: 'Bronz', emoji: '🥉', color: '#f97316', min: 0,     label: '0 – 1.999'    },
  { key: 'Gumus', emoji: '🥈', color: '#94a3b8', min: 2000,  label: '2.000 – 4.999' },
  { key: 'Altin', emoji: '🥇', color: '#f59e0b', min: 5000,  label: '5.000 – 9.999' },
  { key: 'Elmas', emoji: '💎', color: '#06b6d4', min: 10000, label: '10.000+'        },
];

function leagueFor(gold: number) {
  return LEAGUES.slice().reverse().find(l => gold >= l.min) ?? LEAGUES[0];
}

const PODIUM_H = [140, 108, 88]; // 1. 2. 3. sütun yüksekliği

// ── Bileşen ───────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank,    setUserRank]    = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) { navigate('/login'); return; }
      const u = JSON.parse(raw);
      setCurrentUser(u);

      const [lbRes, rankRes] = await Promise.all([
        leaderboardAPI.getLeaderboard(),
        leaderboardAPI.getUserRank(u.id),
      ]);

      setLeaderboard(lbRes.data.data.leaderboard);
      setUserRank(rankRes.data.data.userRank);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#93c5fd', fontWeight: 600 }}>Sıralama yükleniyor...</p>
      </div>
    </div>
  );

  const top3   = leaderboard.slice(0, 3);
  const rest   = leaderboard.slice(3);
  // Podium görsel sırası: sol=2., orta=1., sağ=3.
  const podium = [top3[1], top3[0], top3[2]];
  const myLeague = userRank ? leagueFor(userRank.gold) : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100svh', background: 'linear-gradient(160deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>🏆 Liderlik Tablosu</h1>
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Ölçüt: 💰 Altın miktarı</p>
        </div>
      </header>

      {/* ── ANA İÇERİK ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>

        {/* Kendi sıralama kartı */}
        {userRank && myLeague && (
          <div style={{
            background: `linear-gradient(135deg,${myLeague.color}22,${myLeague.color}0a)`,
            border: `1px solid ${myLeague.color}50`,
            borderRadius: 18, padding: '14px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 36 }}>{myLeague.emoji}</span>
              <div>
                <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Senin Sıralaman</p>
                <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 30, lineHeight: 1.1 }}>#{userRank.rank}</p>
                <p style={{ color: myLeague.color, fontSize: 12, fontWeight: 600, marginTop: 2 }}>{myLeague.emoji} {myLeague.key} Ligi</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#64748b', fontSize: 11 }}>Toplam Altın</p>
              <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 20 }}>💰 {userRank.gold.toLocaleString()}</p>
              <p style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>{userRank.island_count} Ada</p>
            </div>
          </div>
        )}

        {/* Podium — Top 3 */}
        {top3.length >= 3 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, textAlign: 'center' }}>👑 Şampiyonlar</p>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
              {podium.map((player, i) => {
                if (!player) return null;
                const vRank = i === 0 ? 2 : i === 1 ? 1 : 3;
                const h = PODIUM_H[vRank - 1];
                const c: any = {
                  1: { top: 'linear-gradient(180deg,#f59e0b,#d97706)', glow: '#f59e0b44' },
                  2: { top: 'linear-gradient(180deg,#94a3b8,#64748b)', glow: '#94a3b822' },
                  3: { top: 'linear-gradient(180deg,#f97316,#ea580c)', glow: '#f9731622' },
                }[vRank];
                const isMe = currentUser && player.id === currentUser.id;

                return (
                  <div key={player.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    {/* Taç sadece 1. */}
                    {vRank === 1 && <span style={{ fontSize: 20 }}>👑</span>}

                    {/* Avatar dairesi */}
                    <div style={{
                      width: vRank === 1 ? 52 : 44, height: vRank === 1 ? 52 : 44,
                      borderRadius: '50%', background: c.top,
                      border: `3px solid ${isMe ? '#60a5fa' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: vRank === 1 ? 22 : 18,
                      boxShadow: `0 0 14px ${c.glow}`,
                    }}>
                      {player.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Sütun */}
                    <div style={{
                      width: '100%', height: h, background: c.top,
                      borderRadius: '10px 10px 0 0',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                      paddingTop: 10, gap: 3,
                      border: isMe ? '2px solid #60a5fa' : 'none',
                    }}>
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: vRank === 1 ? 22 : 17 }}>#{vRank}</span>
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 600, maxWidth: '88%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.username}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.70)', fontSize: 10 }}>
                        💰 {player.gold.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tam liste */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', marginBottom: 20 }}>
          <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '12px 16px 8px' }}>🎖️ Tüm Sıralama</p>

          {leaderboard.length === 0 && (
            <p style={{ color: '#475569', textAlign: 'center', padding: 24, fontSize: 14 }}>Henüz kayıt yok.</p>
          )}

          {leaderboard.map((player, idx) => {
            const isMe = currentUser && player.id === currentUser.id;
            const pl   = leagueFor(player.gold);

            return (
              <div
                key={player.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px',
                  background: isMe ? 'rgba(59,130,246,0.10)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  borderLeft: isMe ? '3px solid #3b82f6' : '3px solid transparent',
                }}
              >
                {/* Sıra numarası */}
                <div style={{ width: 34, textAlign: 'center', flexShrink: 0 }}>
                  {player.rank === 1 ? <span style={{ fontSize: 20 }}>🥇</span>
                  : player.rank === 2 ? <span style={{ fontSize: 20 }}>🥈</span>
                  : player.rank === 3 ? <span style={{ fontSize: 20 }}>🥉</span>
                  : <span style={{ color: '#475569', fontWeight: 700, fontSize: 13 }}>#{player.rank}</span>}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg,${pl.color}80,${pl.color}30)`,
                  border: `2px solid ${pl.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                }}>
                  {player.username.charAt(0).toUpperCase()}
                </div>

                {/* Kullanıcı bilgisi */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <p style={{ color: isMe ? '#60a5fa' : '#f1f5f9', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {player.username}
                    </p>
                    {isMe && (
                      <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.25)', color: '#60a5fa', padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>SEN</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ color: pl.color, fontSize: 11, fontWeight: 600 }}>{pl.emoji} {pl.key}</span>
                    <span style={{ color: '#1e293b', fontSize: 11 }}>·</span>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Sv.{player.level}</span>
                    <span style={{ color: '#1e293b', fontSize: 11 }}>·</span>
                    <span style={{ color: '#64748b', fontSize: 11 }}>{player.island_count} ada</span>
                  </div>
                </div>

                {/* Altın */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14 }}>💰 {player.gold.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lig kılavuzu */}
        <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>📊 Lig Sistemi</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {LEAGUES.map(lg => (
            <div key={lg.key} style={{
              background: `${lg.color}14`, border: `1px solid ${lg.color}40`,
              borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 28 }}>{lg.emoji}</span>
              <div>
                <p style={{ color: lg.color, fontWeight: 700, fontSize: 14 }}>{lg.key}</p>
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>💰 {lg.label}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
