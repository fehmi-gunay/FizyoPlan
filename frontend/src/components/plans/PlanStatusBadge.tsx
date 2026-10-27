import { PLAN_STATUS_LABELS } from '../../lib/labels';
import type { PlanStatus } from '../../types/api';
import { Badge } from '../ui';

const TONES: Record<PlanStatus, 'primary' | 'success' | 'warning' | 'danger' | undefined> = {
  draft: 'warning',
  active: 'success',
  suspended: 'danger',
  completed: undefined,
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Badge tone={TONES[status]}>{PLAN_STATUS_LABELS[status]}</Badge>;
}
