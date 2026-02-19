import { X, Gift, Calendar } from 'lucide-react';
import { fireLevelUpConfetti } from '../utils/confetti';

interface DailyRewardModalProps {
  day: number;
  reward: { gold: number; wood: number };
  onClaim: () => void;
  onClose: () => void;
}

function DailyRewardModal({ day, reward, onClaim, onClose }: DailyRewardModalProps) {
  const handleClaim = () => {
    fireLevelUpConfetti();
    onClaim();
  };

  const allRewards = [
    { day: 1, gold: 100, wood: 0 },
    { day: 2, gold: 150, wood: 50 },
    { day: 3, gold: 200, wood: 100 },
    { day: 4, gold: 250, wood: 150 },
    { day: 5, gold: 300, wood: 200 },
    { day: 6, gold: 400, wood: 250 },
    { day: 7, gold: 500, wood: 300 }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="glass-card max-w-lg w-full animate-slideInLeft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gift className="w-7 h-7 text-yellow-500" />
            Günlük Ödül!
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-6 mb-4 animate-pulse-slow shadow-2xl">
            <Calendar className="w-16 h-16 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-800 mb-2">
            Gün {day} Ödülü!
          </p>
          <div className="flex items-center justify-center gap-4 text-2xl font-bold">
            <span className="text-yellow-600">💰 {reward.gold}</span>
            {reward.wood > 0 && (
              <>
                <span className="text-gray-400">+</span>
                <span className="text-green-600">🌲 {reward.wood}</span>
              </>
            )}
          </div>
        </div>

        {/* 7 Günlük Takvim */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3 text-center font-medium">
            7 Gün Üst Üste Giriş Yap, Büyük Ödüller Kazan!
          </p>
          <div className="grid grid-cols-7 gap-2">
            {allRewards.map((r) => (
              <div
                key={r.day}
                className={`text-center p-2 rounded-lg border-2 transition ${
                  r.day === day
                    ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                    : r.day < day
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <p className="text-xs font-bold text-gray-700 mb-1">Gün {r.day}</p>
                <p className="text-xs text-yellow-600 font-semibold">💰{r.gold}</p>
                {r.wood > 0 && (
                  <p className="text-xs text-green-600 font-semibold">🌲{r.wood}</p>
                )}
                {r.day < day && (
                  <div className="text-green-500 text-lg">✓</div>
                )}
                {r.day === day && (
                  <div className="text-yellow-500 text-lg animate-pulse">🎁</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleClaim}
          className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold text-lg transition-all btn-modern shadow-2xl"
        >
          🎁 Ödülü Al!
        </button>

        <p className="text-xs text-center text-gray-500 mt-3">
          * Her gün giriş yap ve ardışık streak'ini sürdür!
        </p>
      </div>
    </div>
  );
}

export default DailyRewardModal;