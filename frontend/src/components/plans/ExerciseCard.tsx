import { Link } from 'react-router';
import { DIFFICULTY_LABELS, formatDuration } from '../../lib/labels';
import type { PlanItem } from '../../types/api';
import { Badge } from '../ui';

const DIFFICULTY_TONE = { easy: 'success', medium: 'warning', hard: 'danger' } as const;

// Plan kalemi kartı: egzersiz detayına (kalem ve plan bağlamıyla) gider
export function ExerciseCard({ item, planId, completed }: { item: PlanItem; planId: number; completed?: boolean }) {
  const last = item.feedback?.at(-1);
  return (
    <Link
      to={`/egzersiz/${item.exercise.id}?kalem=${item.id}&plan=${planId}`}
      className={`card card-link exercise-card${completed ? ' done' : ''}`}
    >
      <span className="exercise-card-check" aria-hidden="true">
        {completed ? '✓' : ''}
      </span>
      <div className="exercise-card-body">
        <h3>
          {item.exercise.title}
          {completed && <span className="sr-only"> (bugün tamamlandı)</span>}
        </h3>
        <div className="dose">
          <Badge tone={DIFFICULTY_TONE[item.exercise.difficulty]}>{DIFFICULTY_LABELS[item.exercise.difficulty]}</Badge>
          <span>
            {item.sets} set × {item.reps} tekrar
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(item.durationSec)} tutma</span>
        </div>
        {last && (
          <p className="feedback-mini muted mb-0" style={{ marginTop: 'var(--space-2)' }}>
            Son bildirim: ağrı {last.pain}/10, zorluk {last.difficulty}/10
          </p>
        )}
      </div>
    </Link>
  );
}
