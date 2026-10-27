import { useState } from 'react';
import { ApiError, errorMessage } from '../../api/client';
import { useGeneratePlan } from '../../api/hooks';
import type { PlanType } from '../../types/api';
import { Alert, Button } from '../ui';

function generateErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'NO_SUITABLE_EXERCISES' || err.code === 'NO_SUITABLE_PLAN') {
      return `${err.message}. Sağlık anketinizi kontrol edin; sorun sürerse bir fizyoterapiste danışın.`;
    }
    if (err.status === 502 || err.status === 504) return `${err.message}. Lütfen biraz sonra tekrar deneyin.`;
  }
  return errorMessage(err);
}

// Haftalık/günlük seçimi + plan oluştur (sonuca göre yönlendirme useGeneratePlan içinde)
export function GeneratePlanPanel({ title = 'Yeni plan oluştur' }: { title?: string }) {
  const [type, setType] = useState<PlanType>('weekly');
  const generate = useGeneratePlan();

  return (
    <div className="stack">
      <div>
        <h3 className="mb-0">{title}</h3>
        <p className="muted mb-0">
          Planınız sağlık anketinize göre, yalnızca uzman onaylı egzersizlerden oluşturulur. Oluşturulan planı başlamadan önce
          inceleyip onaylarsınız.
        </p>
      </div>
      <div className="segmented" role="group" aria-label="Plan türü">
        <button type="button" aria-pressed={type === 'weekly'} onClick={() => setType('weekly')}>
          Haftalık (7 gün)
        </button>
        <button type="button" aria-pressed={type === 'daily'} onClick={() => setType('daily')}>
          Günlük
        </button>
      </div>
      {generate.isError && <Alert tone="danger">{generateErrorText(generate.error)}</Alert>}
      <div>
        <Button onClick={() => generate.mutate(type)} loading={generate.isPending}>
          Planımı oluştur
        </Button>
      </div>
    </div>
  );
}
