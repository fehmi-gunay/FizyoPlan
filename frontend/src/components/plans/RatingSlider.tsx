import { useId } from 'react';

const FACES = ['😀', '🙂', '😐', '😕', '😣', '😖'];

function face(value: number, min: number, max: number) {
  const ratio = (value - min) / (max - min);
  return FACES[Math.min(FACES.length - 1, Math.round(ratio * (FACES.length - 1)))];
}

// 0-10 / 1-10 kaydırıcı: yüz ifadesi + sayı, eşik aşılınca kırmızı uyarı
export function RatingSlider({
  label,
  value,
  onChange,
  min,
  max,
  lowLabel,
  highLabel,
  threshold,
  describe,
}: {
  label: string;
  value: number;
  onChange(v: number): void;
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
  threshold: number;
  describe(v: number): string;
}) {
  const id = useId();
  const over = value >= threshold;
  return (
    <div className={`rating${over ? ' danger' : ''}`}>
      <div className="rating-head">
        <label htmlFor={id} className="label" style={{ fontWeight: 600 }}>
          {label}
        </label>
        <span className="rating-value" aria-hidden="true">
          <span className="rating-face">{face(value, min, max)}</span>
          {value}/{max}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} / ${max}, ${describe(value)}`}
        aria-describedby={over ? `${id}-warn` : undefined}
      />
      <div className="rating-scale" aria-hidden="true">
        <span>
          {min} – {lowLabel}
        </span>
        <span>
          {max} – {highLabel}
        </span>
      </div>
      {over && (
        <div className="alert alert-danger small" id={`${id}-warn`} role="alert">
          Bu değerle planınız güvenliğiniz için askıya alınacak.
        </div>
      )}
    </div>
  );
}
