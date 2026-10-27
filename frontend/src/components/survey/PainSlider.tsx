import { useId } from 'react';
import { painInfo, REFERRAL_PAIN } from '../../lib/survey';

// 0-10 ağrı şiddeti kaydırıcısı: sayı + yüz ifadesi + sözel karşılık
export function PainSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  const info = painInfo(value);

  return (
    <div className="pain-slider">
      <div className="row-between">
        <label htmlFor={id} className="label">
          {label} – ağrı şiddeti
        </label>
        <span className="pain-value" aria-hidden="true">
          <span className="pain-face">{info.face}</span> {value}/10 · {info.label}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} / 10, ${info.label}`}
        className="range"
      />
      <div className="range-scale" aria-hidden="true">
        <span>0 Ağrı yok</span>
        <span>5</span>
        <span>10 En kötü</span>
      </div>
      {value >= REFERRAL_PAIN && (
        <p className="pain-warning small" role="status">
          {REFERRAL_PAIN}/10 ve üzeri ağrıda plan oluşturulmaz; sizi bir uzmana yönlendiririz.
        </p>
      )}
    </div>
  );
}
