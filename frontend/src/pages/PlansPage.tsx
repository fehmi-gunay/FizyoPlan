import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { listPlans, qk } from '../api/endpoints';
import { GeneratePlanPanel } from '../components/plans/GeneratePlanPanel';
import { PlanStatusBadge } from '../components/plans/PlanStatusBadge';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { PLAN_STATUS_LABELS, PLAN_TYPE_LABELS, formatDate } from '../lib/labels';
import type { PlanStatus } from '../types/api';
import '../styles/plans.css';

const FILTERS: (PlanStatus | 'all')[] = ['all', 'active', 'draft', 'suspended', 'completed'];

export default function PlansPage() {
  const [status, setStatus] = useState<PlanStatus | 'all'>('all');
  const filters = status === 'all' ? {} : { status };
  const plans = useQuery({ queryKey: qk.planList(filters), queryFn: () => listPlans(filters) });

  return (
    <div className="stack-lg">
      <PageHeader title="Planlarım" description="Oluşturduğunuz tüm egzersiz planları" />

      <div className="segmented" role="group" aria-label="Duruma göre filtrele">
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={status === f} onClick={() => setStatus(f)}>
            {f === 'all' ? 'Tümü' : PLAN_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {plans.isPending ? (
        <LoadingState />
      ) : plans.isError ? (
        <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
      ) : plans.data.length === 0 ? (
        <Card>
          <EmptyState
            title={status === 'all' ? 'Henüz planınız yok' : 'Bu durumda plan yok'}
            description={status === 'all' ? 'Sağlık anketinize göre ilk planınızı oluşturun.' : undefined}
          />
        </Card>
      ) : (
        <ul className="grid" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {plans.data.map((p) => (
            <li key={p.id}>
              <Link to={`/planlar/${p.id}`} className="card card-link stack-sm" style={{ height: '100%' }}>
                <div className="row-between">
                  <h3 className="mb-0">{PLAN_TYPE_LABELS[p.type]} plan</h3>
                  <PlanStatusBadge status={p.status} />
                </div>
                <p className="muted mb-0 small">
                  Oluşturma: {formatDate(p.createdAt)}
                  {p.activatedAt && (
                    <>
                      <br />
                      Başlangıç: {formatDate(p.activatedAt)}
                    </>
                  )}
                  {p.suspendedAt && (
                    <>
                      <br />
                      Askıya alınma: {formatDate(p.suspendedAt)}
                    </>
                  )}
                </p>
                <p className="mb-0">{p.itemCount} egzersiz</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <GeneratePlanPanel />
      </Card>
    </div>
  );
}
