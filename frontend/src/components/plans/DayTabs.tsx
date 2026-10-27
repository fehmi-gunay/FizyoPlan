import { useRef, type KeyboardEvent } from 'react';
import type { PlanItem } from '../../types/api';

// Haftalık plan için 7 gün sekmesi (ok tuşlarıyla gezinme, WAI-ARIA tabs)
export function DayTabs({
  items,
  selected,
  onSelect,
  panelId,
  today,
}: {
  items: PlanItem[];
  selected: number;
  onSelect(day: number): void;
  panelId: string;
  today?: number | null;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const days = [1, 2, 3, 4, 5, 6, 7];

  const onKey = (e: KeyboardEvent, day: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = day === 7 ? 1 : day + 1;
    if (e.key === 'ArrowLeft') next = day === 1 ? 7 : day - 1;
    if (e.key === 'Home') next = 1;
    if (e.key === 'End') next = 7;
    if (next) {
      e.preventDefault();
      onSelect(next);
      refs.current[next - 1]?.focus();
    }
  };

  return (
    <div className="day-tabs" role="tablist" aria-label="Plan günleri">
      {days.map((day) => {
        const count = items.filter((i) => i.day === day).length;
        return (
          <button
            key={day}
            ref={(el) => {
              refs.current[day - 1] = el;
            }}
            type="button"
            role="tab"
            id={`${panelId}-tab-${day}`}
            aria-selected={selected === day}
            aria-controls={panelId}
            tabIndex={selected === day ? 0 : -1}
            className="day-tab"
            aria-label={`${day}. gün, ${count} egzersiz${today === day ? ', bugün' : ''}`}
            onClick={() => onSelect(day)}
            onKeyDown={(e) => onKey(e, day)}
          >
            <span className="day-num" aria-hidden="true">
              {day}
            </span>
            <span className="day-count" aria-hidden="true">
              {today === day ? 'Bugün · ' : ''}
              {count} egz.
            </span>
          </button>
        );
      })}
    </div>
  );
}
