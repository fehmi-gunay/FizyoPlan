import type { KeyboardEvent } from 'react';
import { REGION_LABELS } from '../../lib/labels';
import type { RegionCode } from '../../types/api';

// Basit ön görünüm vücut şeması. Bölgeler tıklanabilir ve klavyeyle (Tab + Boşluk/Enter) seçilebilir.
export function BodyMap({ selected, onToggle }: { selected: RegionCode[]; onToggle: (code: RegionCode) => void }) {
  const isOn = (c: RegionCode) => selected.includes(c);

  const regionProps = (code: RegionCode) => ({
    role: 'checkbox',
    tabIndex: 0,
    'aria-checked': isOn(code),
    'aria-label': REGION_LABELS[code],
    className: `body-region${isOn(code) ? ' is-on' : ''}`,
    onClick: () => onToggle(code),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onToggle(code);
      }
    },
  });

  return (
    <svg className="body-map" viewBox="0 0 200 400" role="group" aria-label="Vücut şeması: ağrı bölgesi seçin">
      {/* Gövde silueti (dekoratif) */}
      <g className="body-shape" aria-hidden="true">
        <circle cx="100" cy="38" r="24" />
        <rect x="88" y="58" width="24" height="24" rx="6" />
        <rect x="58" y="78" width="84" height="146" rx="24" />
        <rect x="32" y="86" width="22" height="124" rx="11" />
        <rect x="146" y="86" width="22" height="124" rx="11" />
        <rect x="64" y="216" width="32" height="170" rx="15" />
        <rect x="104" y="216" width="32" height="170" rx="15" />
      </g>

      <g {...regionProps('neck')}>
        <title>{REGION_LABELS.neck}</title>
        <rect x="86" y="58" width="28" height="22" rx="7" />
      </g>
      <g {...regionProps('shoulder')}>
        <title>{REGION_LABELS.shoulder}</title>
        <circle cx="56" cy="92" r="17" />
        <circle cx="144" cy="92" r="17" />
      </g>
      <g {...regionProps('lower_back')}>
        <title>{REGION_LABELS.lower_back}</title>
        <rect x="64" y="168" width="72" height="42" rx="14" />
      </g>
      <g {...regionProps('knee')}>
        <title>{REGION_LABELS.knee}</title>
        <circle cx="80" cy="300" r="15" />
        <circle cx="120" cy="300" r="15" />
      </g>
    </svg>
  );
}
