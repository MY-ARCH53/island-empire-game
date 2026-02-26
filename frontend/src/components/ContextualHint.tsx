import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const HINTS: Record<string, { emoji: string; title: string; desc: string; action: string }> = {
  'auto-production': {
    emoji: '⚡',
    title: 'Otomatik Üretim Hazır!',
    desc: '1000 enerji biriktirdin. 4 saat boyunca tüm binaları otomatik üret!',
    action: 'Etkinleştir →',
  },
  'island-discovery': {
    emoji: '🏝️',
    title: 'Yeni Ada Keşfedebilirsin!',
    desc: 'Yeterli kaynağın var. İmparatorluğunu yeni bir adayla genişlet!',
    action: 'Keşfet →',
  },
  'tlcoin': {
    emoji: '🪙',
    title: '3. Gün Ödülü — TLCoin!',
    desc: 'Altınını gerçek ödüle dönüştür. TLCoin biriktirmeye başla!',
    action: 'İncele →',
  },
};

interface Props {
  hintKey: string;
  onAction: () => void;
  onDismiss: () => void;
}

export default function ContextualHint({ hintKey, onAction, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const hint = HINTS[hintKey];

  useEffect(() => {
    // Slide-in animasyonu için kısa gecikme
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [hintKey]);

  if (!hint) return null;

  const handleAction = () => {
    setVisible(false);
    setTimeout(onAction, 250);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 250);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: visible ? 82 : 40,
      left: 12, right: 12,
      zIndex: 9990,
      opacity: visible ? 1 : 0,
      transition: 'bottom 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
      background: 'linear-gradient(135deg,#1e293b,#0f172a)',
      border: '1px solid rgba(99,102,241,0.45)',
      borderRadius: 18,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Sol: emoji + içerik */}
      <span style={{ fontSize: 32, flexShrink: 0 }}>{hint.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, margin: 0 }}>{hint.title}</p>
        <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{hint.desc}</p>
      </div>

      {/* Sağ: aksiyon + kapat */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleAction}
          style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 700, fontSize: 11,
            padding: '7px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {hint.action}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10, color: '#64748b',
            padding: '5px 0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
