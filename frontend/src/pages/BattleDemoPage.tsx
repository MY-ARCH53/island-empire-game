import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { battleAPI } from '../services/api';

export default function BattleDemoPage() {
  const navigate = useNavigate();
  const [army, setArmy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const user = JSON.parse(userData);

    battleAPI.getArmy(user.id)
      .then((res: any) => {
        // backend: { data: { army: {...} } }
        setArmy(res.data.data.army ?? res.data.data ?? {});
        setLoading(false);
      })
      .catch(() => {
        // API hata verse de fallback sayılarla devam et
        setArmy({ infantry_count: 20, archer_count: 15, cavalry_count: 8, total_power: 0 });
        setLoading(false);
      });
  }, [navigate]);

  const inf = army?.infantry_count ?? 20;
  const arc = army?.archer_count ?? 15;
  const cav = army?.cavalry_count ?? 8;
  const gameUrl = `/game/index.html?infantry=${inf}&archer=${arc}&cavalry=${cav}&_=${Date.now()}`;

  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#080c16',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#ffd700', fontFamily: 'sans-serif', fontSize: 18, zIndex: 9999
    }}>
      ⚔️ Ordu verisi yükleniyor...
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#080c16',
      display: 'flex', flexDirection: 'column',
      zIndex: 9999
    }}>
      {/* Üst bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', flexShrink: 0,
        background: 'linear-gradient(135deg,rgba(15,22,41,0.98),rgba(8,12,22,0.98))',
        borderBottom: '2px solid #1c2844',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid #334155',
              color: '#94a3b8', borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontSize: 13
            }}
          >
            ← Geri
          </button>
          <span style={{ color: '#ffd700', fontWeight: 700, fontSize: 15 }}>
            ⚔️ 3D Savaş Demo
          </span>
          <span style={{
            background: '#7c3aed', color: '#fff', fontSize: 11,
            padding: '2px 8px', borderRadius: 4, fontWeight: 700
          }}>
            DEMO
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: '#60a5fa', fontSize: 13 }}>🛡️ Piyade: <b>{inf}</b></span>
          <span style={{ color: '#10b981', fontSize: 13 }}>🏹 Okçu: <b>{arc}</b></span>
          <span style={{ color: '#8b5cf6', fontSize: 13 }}>🐴 Süvari: <b>{cav}</b></span>
          {army?.total_power > 0 && (
            <span style={{ color: '#f97316', fontSize: 13 }}>⚡ Güç: <b>{army.total_power}</b></span>
          )}
          <a
            href={gameUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'linear-gradient(135deg,#e94560,#c2185b)',
              color: '#fff', padding: '6px 16px', borderRadius: 8,
              textDecoration: 'none', fontSize: 13, fontWeight: 700
            }}
          >
            ↗ Tam Ekran
          </a>
        </div>
      </div>

      {/* Oyun iframe */}
      <iframe
        src={gameUrl}
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
        title="3D Savaş"
        allow="autoplay"
      />
    </div>
  );
}
