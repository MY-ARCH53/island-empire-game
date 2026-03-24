import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, TreePine, Apple, Zap, Sword, Shield, Trophy, Calendar, CheckSquare, Flame, MapPin } from 'lucide-react';
import { authAPI } from '../services/api';

const ISLAND_RANKS = ['Köylü', 'Çırak', 'Tüccar', 'Usta', 'Baron', 'Lord', 'Efsane'];
const RANK_COLORS: Record<string, string> = {
  Köylü:  '#94a3b8',
  Çırak:  '#22c55e',
  Tüccar: '#3b82f6',
  Usta:   '#a855f7',
  Baron:  '#f59e0b',
  Lord:   '#ef4444',
  Efsane: '#ec4899',
};

const AVATAR_EMOJIS = ['⛵','🏴‍☠️','🦁','🐉','🦅','🌊','⚡','🔥','💎','🏆'];

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: `${color}14`,
      border: `1px solid ${color}35`,
      borderRadius: 14, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ color, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ color: '#94a3b8', fontSize: 10, margin: 0 }}>{label}</p>
        <p style={{ color, fontWeight: 700, fontSize: 15, margin: 0 }}>{value}</p>
      </div>
    </div>
  );
}

function ProfilePage() {
  const navigate  = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarIdx, setAvatarIdx] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const u = JSON.parse(userData);

    // Kayıtlı avatar
    const saved = localStorage.getItem(`avatar_${u.id}`);
    if (saved) setAvatarIdx(parseInt(saved));

    authAPI.getProfile(u.id)
      .then(res => { setProfile(res.data.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const handleAvatarChange = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const u = JSON.parse(userData);
    const next = (avatarIdx + 1) % AVATAR_EMOJIS.length;
    setAvatarIdx(next);
    localStorage.setItem(`avatar_${u.id}`, String(next));
  };

  if (loading) return (
    <div style={{ minHeight: '100svh', background: 'linear-gradient(160deg,#0f172a,#1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b', fontSize: 14 }}>Yükleniyor...</p>
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight: '100svh', background: 'linear-gradient(160deg,#0f172a,#1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ef4444', fontSize: 14 }}>Profil yüklenemedi.</p>
    </div>
  );

  const { user, islandCount, resources, battles, completedTasks, bestStreak, totalLogins, daysSince } = profile;
  const rankColor  = RANK_COLORS[user.rank] || '#94a3b8';
  const xpPct      = Math.min(100, (user.experience / Math.max(1, user.experience + 50)) * 100);
  const winRate    = battles.totalAttacks > 0 ? Math.round((battles.attackWins / battles.totalAttacks) * 100) : 0;

  return (
    <div style={{ minHeight: '100svh', background: 'linear-gradient(160deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/home')}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Profil</p>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', paddingBottom: 40 }}>

        {/* Profil kartı */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20, padding: 24, marginBottom: 16, textAlign: 'center',
        }}>
          {/* Avatar */}
          <button
            onClick={handleAvatarChange}
            title="Avatarı değiştir"
            style={{
              width: 80, height: 80, borderRadius: 20, border: `3px solid ${rankColor}`,
              background: `linear-gradient(135deg,${rankColor}40,${rankColor}20)`,
              fontSize: 38, cursor: 'pointer', marginBottom: 12,
              boxShadow: `0 0 20px ${rankColor}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {AVATAR_EMOJIS[avatarIdx]}
          </button>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: 0 }}>{user.username}</p>
          <p style={{ color: rankColor, fontWeight: 700, fontSize: 13, marginTop: 4 }}>{user.rank}</p>
          <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{daysSince} gündür oynuyor</p>

          {/* Level + XP */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 13 }}>Sv. {user.level}</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>{user.experience} XP</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg,#6366f1,#a78bfa)', borderRadius: 99, transition: 'width .4s' }} />
            </div>
          </div>
        </div>

        {/* Kaynaklar */}
        <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>💰 KAYNAKLAR</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <StatCard icon={<Coins size={18}/>}    label="Altın"    value={resources.gold?.toLocaleString() ?? 0}   color="#f59e0b" />
          <StatCard icon={<TreePine size={18}/>} label="Odun"     value={resources.wood?.toLocaleString() ?? 0}   color="#10b981" />
          <StatCard icon={<Apple size={18}/>}    label="Yiyecek"  value={resources.food?.toLocaleString() ?? 0}   color="#ef4444" />
          <StatCard icon={<Zap size={18}/>}      label="Enerji"   value={resources.energy?.toLocaleString() ?? 0} color="#06b6d4" />
        </div>

        {/* Ada & Görev istatistikleri */}
        <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🏝️ İSTATİSTİKLER</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <StatCard icon={<MapPin size={18}/>}     label="Ada Sayısı"       value={islandCount}      color="#8b5cf6" />
          <StatCard icon={<CheckSquare size={18}/>} label="Görev Tamamlandı" value={completedTasks}   color="#22c55e" />
          <StatCard icon={<Flame size={18}/>}       label="En Uzun Seri"     value={`${bestStreak} gün`} color="#f97316" />
          <StatCard icon={<Calendar size={18}/>}    label="Toplam Giriş"     value={`${totalLogins} gün`} color="#06b6d4" />
        </div>

        {/* Savaş istatistikleri */}
        <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>⚔️ SAVAŞ</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <StatCard icon={<Sword size={18}/>}  label="Toplam Saldırı"  value={battles.totalAttacks}  color="#ef4444" />
          <StatCard icon={<Trophy size={18}/>} label="Saldırı Galibi"  value={battles.attackWins}    color="#f59e0b" />
          <StatCard icon={<Shield size={18}/>} label="Toplam Savunma"  value={battles.totalDefenses} color="#3b82f6" />
          <StatCard icon={<Trophy size={18}/>} label="Savunma Galibi"  value={battles.defenseWins}   color="#22c55e" />
        </div>

        {/* Kazanma oranı */}
        {battles.totalAttacks > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>Saldırı Kazanma Oranı</span>
              <span style={{ color: winRate >= 50 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{winRate}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${winRate}%`, background: winRate >= 50 ? '#22c55e' : '#ef4444', borderRadius: 99, transition: 'width .4s' }} />
            </div>
          </div>
        )}

        {/* Avatar ipucu */}
        <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          💡 Avatara tıklayarak değiştirebilirsin
        </p>
      </main>
    </div>
  );
}

export default ProfilePage;
