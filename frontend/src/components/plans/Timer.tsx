import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui';

// Tutma süresi zamanlayıcısı (geri sayım) – sesli uyarı yok, bitince ekran okuyucuya duyurulur
export function HoldTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  const reset = () => {
    setRunning(false);
    setLeft(seconds);
  };

  return (
    <div className="stack-sm">
      <div className="label" style={{ fontWeight: 600 }}>
        Tutma süresi
      </div>
      <div className="timer-display" aria-hidden="true">
        {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
      </div>
      {/* Her saniye değil, yalnızca durum değişince duyur */}
      <span className="sr-only" aria-live="polite">
        {left === 0 ? 'Süre doldu' : running ? '' : `${left} saniye`}
      </span>
      <div className="row">
        {left === 0 ? (
          <Button variant="secondary" onClick={reset}>
            Yeniden başlat
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setRunning((r) => !r)}>
            {running ? 'Duraklat' : 'Başlat'}
          </Button>
        )}
        <Button variant="ghost" onClick={reset} disabled={left === seconds && !running}>
          Sıfırla
        </Button>
      </div>
    </div>
  );
}

export function SetCounter({ total }: { total: number }) {
  const [done, setDone] = useState(0);
  return (
    <div className="stack-sm">
      <div className="label" style={{ fontWeight: 600 }}>
        Setler
      </div>
      <div className="set-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`set-dot${i < done ? ' filled' : ''}`}>
            {i + 1}
          </span>
        ))}
      </div>
      <p className="mb-0" aria-live="polite">
        {done} / {total} set tamamlandı
      </p>
      <div className="row">
        <Button variant="secondary" onClick={() => setDone((d) => Math.min(total, d + 1))} disabled={done >= total}>
          Set bitti
        </Button>
        <Button variant="ghost" onClick={() => setDone((d) => Math.max(0, d - 1))} disabled={done === 0}>
          Geri al
        </Button>
      </div>
    </div>
  );
}
