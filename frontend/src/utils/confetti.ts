import confetti from 'canvas-confetti';

export const fireConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#FFC107', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0'];

  (function frame() {
    confetti({
      particleCount: 12,
      angle: 60,
      spread: 70,
      origin: { x: 0 },
      colors: colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 12,
      angle: 120,
      spread: 70,
      origin: { x: 1 },
      colors: colors,
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

export const fireRewardConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6347'],
    zIndex: 9999,
  });
};

export const fireLevelUpConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 }
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};