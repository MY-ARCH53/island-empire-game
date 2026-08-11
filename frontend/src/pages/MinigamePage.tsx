import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

export default function MinigamePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'minigame_result') return;
      const { goldEarned, message } = e.data;
      if (goldEarned > 0) {
        showToast(`🧛 Kan Adası: +${goldEarned.toLocaleString('tr-TR')} altın!`, 'success');
      } else if (message) {
        showToast(message, 'info');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [showToast]);

  if (!ready) return null;

  const token = localStorage.getItem('token') || '';
  const gameUrl = `/minigame/index.html?token=${encodeURIComponent(token)}`;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0410',
      display: 'flex', flexDirection: 'column',
      zIndex: 9999
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', flexShrink: 0,
        background: 'linear-gradient(135deg,rgba(30,10,40,0.98),rgba(10,4,16,0.98))',
        borderBottom: '2px solid #4a1d5c',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid #6b2d7a',
              color: '#c9a3d9', borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontSize: 13
            }}
          >
            ← Geri
          </button>
          <span style={{ color: '#e94560', fontWeight: 700, fontSize: 15 }}>
            🧛 Kan Adası
          </span>
        </div>
        <a
          href={gameUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            background: 'linear-gradient(135deg,#8b2fb5,#e94560)',
            color: '#fff', padding: '6px 16px', borderRadius: 8,
            textDecoration: 'none', fontSize: 13, fontWeight: 700
          }}
        >
          ↗ Tam Ekran
        </a>
      </div>

      <iframe
        src={gameUrl}
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
        title="Kan Adası"
        allow="autoplay"
      />
    </div>
  );
}
