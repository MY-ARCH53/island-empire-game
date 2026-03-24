import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { tlcoinAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const PRIZES = [
  {
    id: 'iphone',
    name: 'iPhone 17',
    cost: 100000,
    emoji: '📱',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&h=300&q=80',
    description: 'Apple iPhone 17 256GB',
    stock: 3,
    color: '#3b82f6',
    badge: '🏆 Büyük Ödül',
  },
  {
    id: 'laptop',
    name: 'Laptop',
    cost: 50000,
    emoji: '💻',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&h=300&q=80',
    description: 'i5 işlemci, 16GB RAM, 512GB SSD',
    stock: 5,
    color: '#8b5cf6',
    badge: '⭐ Popüler',
  },
  {
    id: 'desktop',
    name: 'Masaüstü PC',
    cost: 30000,
    emoji: '🖥️',
    image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=400&h=300&q=80',
    description: 'Gaming PC, RTX 3060, 32GB RAM',
    stock: 4,
    color: '#f59e0b',
    badge: '🎮 Gaming',
  },
  {
    id: 'giftcard',
    name: 'Hediye Çeki 10.000₺',
    cost: 10000,
    emoji: '🎁',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&h=300&q=80',
    description: 'İstediğin markette kullanabileceğin hediye çeki',
    stock: 1,
    color: '#22c55e',
    badge: '🔥 Son 1 Adet',
  },
];

const statusColor = (s: string) =>
  s === 'approved' ? '#22c55e' : s === 'rejected' ? '#ef4444' : '#f59e0b';
const statusLabel = (s: string) =>
  s === 'approved' ? 'Onaylandı ✓' : s === 'rejected' ? 'Reddedildi ✗' : 'Beklemede...';

export default function TLCoinPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (!token || !userData) {
    navigate('/landing');
    return null;
  }
  const user = JSON.parse(userData);

  const [tlcoinBalance, setTlcoinBalance] = useState(0);
  const [lastConvertAt, setLastConvertAt] = useState<string | null>(null);
  const [goldToConvert, setGoldToConvert] = useState(1000);
  const [converting, setConverting] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        tlcoinAPI.getBalance(user.id),
        tlcoinAPI.getMyRequests(user.id),
      ]);
      setTlcoinBalance(balRes.data.data.tlcoin_balance);
      setLastConvertAt(balRes.data.data.last_convert_at || null);
      setMyRequests(reqRes.data.data.requests);
    } catch {
      showToast('Veri yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (goldToConvert < 1000 || goldToConvert % 1000 !== 0) {
      showToast("1000'in katı giriniz (min: 1000)", 'error');
      return;
    }
    setConverting(true);
    try {
      const res = await tlcoinAPI.convertGold(user.id, goldToConvert);
      const { tlcoin_earned, tlcoin_balance } = res.data.data;
      setTlcoinBalance(tlcoin_balance);
      showToast(`+${tlcoin_earned} TLCoin kazandınız! 🪙`, 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Dönüşüm başarısız', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleRequestPrize = async (prize: typeof PRIZES[0]) => {
    if (tlcoinBalance < prize.cost) {
      showToast('Yetersiz TLCoin bakiyesi', 'error');
      return;
    }
    setRequesting(prize.id);
    try {
      await tlcoinAPI.requestPrize(user.id, prize.id, prize.name, prize.cost);
      setTlcoinBalance(prev => prev - prize.cost);
      showToast('Ödül talebiniz gönderildi! Admin onaylayacak. 🎉', 'success');
      await loadData();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Talep gönderilemedi', 'error');
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100svh', background: 'linear-gradient(160deg,#0f172a,#1e3a5f,#0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: 16 }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: 'linear-gradient(160deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>🪙 TLCoin</p>
          <p style={{ color: '#64748b', fontSize: 11 }}>Altını TLCoin'e çevir, gerçek ödüller kazan</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#e11d48,#be123c)', borderRadius: 14, padding: '10px 16px', textAlign: 'center', boxShadow: '0 0 18px rgba(225,29,72,0.40)' }}>
          <p style={{ color: '#fda4af', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>BAKİYE</p>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>🪙 {tlcoinBalance}</p>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Dönüşüm Kartı */}
        {(() => {
          const canConvertNow = !lastConvertAt || (Date.now() - new Date(lastConvertAt).getTime()) >= 7 * 24 * 60 * 60 * 1000;
          const nextConvertDate = lastConvertAt
            ? new Date(new Date(lastConvertAt).getTime() + 7 * 24 * 60 * 60 * 1000)
            : null;
          return (
        <div style={{ background: 'linear-gradient(135deg,rgba(225,29,72,0.12),rgba(190,18,60,0.06))', border: '1px solid rgba(225,29,72,0.30)', borderRadius: 18, padding: 20 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>💰 Altın → TLCoin Dönüşümü</p>
          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>1.000 Altın = 1 🪙 TLCoin</p>

          {/* Haftalık limit bilgisi */}
          <div style={{
            background: canConvertNow ? 'rgba(34,197,94,0.10)' : 'rgba(245,158,11,0.10)',
            border: `1px solid ${canConvertNow ? 'rgba(34,197,94,0.30)' : 'rgba(245,158,11,0.30)'}`,
            borderRadius: 10, padding: '8px 12px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{canConvertNow ? '✅' : '⏳'}</span>
            <div>
              <p style={{ color: canConvertNow ? '#86efac' : '#fcd34d', fontSize: 12, fontWeight: 600 }}>
                {canConvertNow ? 'Bu hafta dönüşüm hakkın mevcut' : 'Bu haftaki dönüşüm hakkın kullanıldı'}
              </p>
              <p style={{ color: '#64748b', fontSize: 11 }}>
                {canConvertNow
                  ? 'Haftada 1 kez dönüşüm yapabilirsin'
                  : `Sonraki hak: ${nextConvertDate?.toLocaleDateString('tr-TR')}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Altın Miktarı</p>
              <input
                type="number"
                min={1000}
                step={1000}
                value={goldToConvert}
                onChange={e => setGoldToConvert(Number(e.target.value))}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                  padding: '11px 14px', color: '#fff', fontSize: 16, fontWeight: 700,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ color: '#475569', fontSize: 20, paddingTop: 18 }}>→</div>
            <div style={{ textAlign: 'center', paddingTop: 18 }}>
              <p style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Kazanacaksın</p>
              <div style={{ background: 'rgba(225,29,72,0.20)', border: '1px solid rgba(225,29,72,0.40)', borderRadius: 12, padding: '11px 18px' }}>
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>🪙 {Math.floor(goldToConvert / 1000)}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleConvert}
            disabled={converting || !canConvertNow}
            style={{
              width: '100%',
              background: (converting || !canConvertNow) ? 'rgba(225,29,72,0.30)' : 'linear-gradient(135deg,#e11d48,#be123c)',
              border: 'none', borderRadius: 13, color: '#fff',
              fontWeight: 700, fontSize: 15, padding: '14px 0',
              cursor: (converting || !canConvertNow) ? 'not-allowed' : 'pointer',
              boxShadow: (converting || !canConvertNow) ? 'none' : '0 4px 18px rgba(225,29,72,0.40)',
            }}
          >
            {converting ? 'Dönüştürülüyor...' : !canConvertNow ? `⏳ ${nextConvertDate?.toLocaleDateString('tr-TR')} tarihinde açılır` : '🪙 Dönüştür'}
          </button>
        </div>
          );
        })()}

        {/* Sezon 1 Ödül Kataloğu */}
        <div>
          {/* Sezon Başlık Banner */}
          <div style={{
            background: 'linear-gradient(135deg,#92400e,#d97706,#92400e)',
            borderRadius: 16, padding: '16px 20px', marginBottom: 16,
            border: '1px solid rgba(251,191,36,0.4)',
            boxShadow: '0 4px 24px rgba(217,119,6,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: '#fef3c7', fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>🏅 Sezon 1</p>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>Ödül Kataloğu</p>
              <p style={{ color: '#fcd34d', fontSize: 11, marginTop: 2 }}>Sınırlı stok — Hemen talep et!</p>
            </div>
            <div style={{ fontSize: 48 }}>🏆</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {PRIZES.map(prize => {
              const canAfford = tlcoinBalance >= prize.cost;
              const hasImgError = imgErrors[prize.id];
              const outOfStock = prize.stock <= 0;
              return (
                <div key={prize.id} style={{
                  background: 'linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))',
                  border: `1px solid ${prize.color}44`,
                  borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  boxShadow: `0 4px 24px rgba(0,0,0,0.35), 0 0 0 0px ${prize.color}33`,
                  transition: 'transform 0.15s',
                }}>
                  {/* Görsel */}
                  <div style={{ position: 'relative', aspectRatio: '4/3', flexShrink: 0 }}>
                    {hasImgError ? (
                      <div style={{
                        width: '100%', height: '100%',
                        background: `linear-gradient(135deg,${prize.color}33,rgba(15,23,42,0.85))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 54,
                      }}>
                        {prize.emoji}
                      </div>
                    ) : (
                      <>
                        <img
                          src={prize.image}
                          alt={prize.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={() => setImgErrors(prev => ({ ...prev, [prize.id]: true }))}
                        />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to bottom,transparent 30%,rgba(10,18,35,0.85) 100%)',
                        }} />
                      </>
                    )}
                    {/* Fiyat etiketi */}
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: `${prize.color}ee`,
                      backdropFilter: 'blur(6px)',
                      borderRadius: 99,
                      padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#fff',
                      boxShadow: `0 2px 10px ${prize.color}66`,
                    }}>
                      🪙 {prize.cost.toLocaleString()}
                    </div>
                    {/* Badge */}
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(6px)',
                      borderRadius: 99,
                      padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {prize.badge}
                    </div>
                    {/* Stok göstergesi */}
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      background: outOfStock ? 'rgba(239,68,68,0.9)' : prize.stock <= 2 ? 'rgba(245,158,11,0.9)' : 'rgba(34,197,94,0.9)',
                      borderRadius: 99, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {outOfStock ? '❌ Stok Tükendi' : `📦 Stok: ${prize.stock}`}
                    </div>
                  </div>

                  {/* İçerik */}
                  <div style={{ padding: '12px 12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>
                      {prize.emoji} {prize.name}
                    </p>
                    <p style={{ color: '#64748b', fontSize: 10, lineHeight: 1.45, flex: 1 }}>
                      {prize.description}
                    </p>
                    {/* İlerleme çubuğu */}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#475569', fontSize: 9 }}>Bakiyen</span>
                        <span style={{ color: canAfford ? '#22c55e' : '#ef4444', fontSize: 9, fontWeight: 700 }}>
                          {canAfford ? '✓ Yeterli' : `${(prize.cost - tlcoinBalance).toLocaleString()} eksik`}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (tlcoinBalance / prize.cost) * 100)}%`,
                          background: canAfford ? '#22c55e' : prize.color,
                          borderRadius: 99, transition: 'width 0.5s',
                        }} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRequestPrize(prize)}
                      disabled={requesting === prize.id || !canAfford || outOfStock}
                      style={{
                        marginTop: 8,
                        background: outOfStock
                          ? 'rgba(239,68,68,0.15)'
                          : !canAfford
                          ? 'rgba(255,255,255,0.05)'
                          : `linear-gradient(135deg,${prize.color},${prize.color}cc)`,
                        border: (!canAfford || outOfStock) ? `1px solid rgba(255,255,255,0.10)` : 'none',
                        borderRadius: 10,
                        color: outOfStock ? '#ef4444' : !canAfford ? '#475569' : '#fff',
                        fontWeight: 700, fontSize: 11, padding: '9px 0',
                        cursor: (!canAfford || outOfStock) ? 'not-allowed' : 'pointer',
                        boxShadow: (!canAfford || outOfStock) ? 'none' : `0 2px 12px ${prize.color}55`,
                      }}
                    >
                      {requesting === prize.id
                        ? 'Gönderiliyor...'
                        : outOfStock
                        ? 'Stok Tükendi'
                        : !canAfford
                        ? `🪙 ${prize.cost.toLocaleString()} gerekli`
                        : 'Talep Et →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Taleplerim */}
        {myRequests.length > 0 && (
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 12 }}>📋 Taleplerim</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myRequests.map(req => (
                <div key={req.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{req.prize_name}</p>
                      <p style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>
                        🪙 {req.tlcoin_cost} · {new Date(req.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <span style={{
                      background: `${statusColor(req.status)}22`,
                      color: statusColor(req.status),
                      fontSize: 11, fontWeight: 700, padding: '4px 10px',
                      borderRadius: 99, border: `1px solid ${statusColor(req.status)}44`,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {statusLabel(req.status)}
                    </span>
                  </div>
                  {req.admin_note && (
                    <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, borderLeft: '3px solid rgba(255,255,255,0.15)' }}>
                      Admin Notu: {req.admin_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
