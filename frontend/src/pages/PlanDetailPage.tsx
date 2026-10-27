import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError, errorMessage } from '../api/client';
import { activatePlan, getPlan, getToday, qk } from '../api/endpoints';
import { DayTabs } from '../components/plans/DayTabs';
import { ExerciseCard } from '../components/plans/ExerciseCard';
import { PlanStatusBadge } from '../components/plans/PlanStatusBadge';
import { Alert, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { DAY_NAMES, PLAN_TYPE_LABELS, formatDate } from '../lib/labels';
import type { ReferralState } from '../types/api';
import '../styles/plans.css';

export default function PlanDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const plan = useQuery({ queryKey: qk.plan(id), queryFn: () => getPlan(id), enabled: Number.isInteger(id) && id > 0 });
  const isActive = plan.data?.status === 'active';
  const today = useQuery({ queryKey: qk.today(), queryFn: () => getToday(), enabled: isActive });
  const todayDay = isActive && today.data?.plan?.id === id ? today.data.day : null;
  const [day, setDay] = useState(1);

  // Aktif haftalık planda bugünün sekmesiyle aç
  useEffect(() => {
    if (todayDay) setDay(todayDay);
  }, [todayDay]);

  const activate = useMutation({
    mutationFn: () => activatePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.plans });
      navigate('/');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'REFERRAL_REQUIRED') {
        const reasons = Array.isArray(err.details) ? (err.details as string[]) : [err.message];
        const state: ReferralState = { riskLevel: 'risky', reasons };
        navigate('/yonlendirme', { state });
      }
    },
  });

  if (!Number.isInteger(id) || id <= 0) return <EmptyState title="Plan bulunamadı" />;
  if (plan.isPending) return <LoadingState />;
  if (plan.isError) {
    if (plan.error instanceof ApiError && plan.error.status === 404) {
      return (
        <EmptyState
          title="Plan bulunamadı"
          action={
            <Link to="/planlar" className="btn btn-primary">
              Planlarıma dön
            </Link>
          }
        />
      );
    }
    return <ErrorState error={plan.error} onRetry={() => plan.refetch()} />;
  }

  const p = plan.data;
  const weekly = p.type === 'weekly';
  const visibleDay = weekly ? day : 1;
  const dayItems = p.items.filter((i) => i.day === visibleDay);
  const panelId = 'plan-day-panel';

  return (
    <div className="stack-lg">
      <PageHeader
        title={`${PLAN_TYPE_LABELS[p.type]} plan`}
        description={
          <>
            Oluşturma: {formatDate(p.createdAt)}
            {p.activatedAt && <> · Başlangıç: {formatDate(p.activatedAt)}</>}
          </>
        }
        actions={<PlanStatusBadge status={p.status} />}
      />

      {p.status === 'draft' && (
        <Card>
          <div className="stack">
            <div>
              <h2 className="mb-0">Planınızı inceleyin ve onaylayın</h2>
              <p className="muted mb-0">Plan, onayladığınız andan itibaren aktif olur ve günlük egzersizleriniz ana sayfada görünür.</p>
            </div>
            <Alert tone="warning" title="Güvenliğiniz için">
              <ul>
                <li>Her egzersizden sonra ağrı (0-10) ve zorluk (1-10) düzeyinizi bildirin.</li>
                <li>Ağrı 7 veya üzeri ya da zorluk 9 veya üzeri bildirirseniz plan otomatik olarak askıya alınır.</li>
                <li>Egzersiz sırasında keskin ağrı, uyuşma veya baş dönmesi olursa hemen durun.</li>
                <li>Varsa önceki aktif planınız tamamlanmış sayılır.</li>
              </ul>
            </Alert>
            {activate.isError && !(activate.error instanceof ApiError && activate.error.code === 'REFERRAL_REQUIRED') && (
              <Alert tone="danger">{errorMessage(activate.error)}</Alert>
            )}
            <div className="row">
              <Button onClick={() => activate.mutate()} loading={activate.isPending}>
                Planı onayla ve başlat
              </Button>
              <Link to="/planlar" className="btn btn-ghost">
                Şimdi değil
              </Link>
            </div>
          </div>
        </Card>
      )}

      {p.status === 'suspended' && (
        <Alert tone="danger" title="Bu plan askıya alındı">
          <p className="mb-0">
            Bildirdiğiniz ağrı/zorluk nedeniyle plan {formatDate(p.suspendedAt)} tarihinde durduruldu.{' '}
            <Link to={`/askida/${p.id}`}>Ne yapmalıyım?</Link>
          </p>
        </Alert>
      )}

      {p.status === 'completed' && (
        <Alert tone="info">Bu plan tamamlandı. Geçmiş kayıt olarak görüntülüyorsunuz.</Alert>
      )}

      {weekly && <DayTabs items={p.items} selected={day} onSelect={setDay} panelId={panelId} today={todayDay} />}

      <section
        id={panelId}
        role={weekly ? 'tabpanel' : undefined}
        aria-labelledby={weekly ? `${panelId}-tab-${visibleDay}` : undefined}
        className="stack"
      >
        <h2 className="mb-0">
          {weekly ? DAY_NAMES[visibleDay - 1] : 'Egzersizler'}
          {todayDay === visibleDay && <span className="muted"> (bugün)</span>}
        </h2>
        {dayItems.length === 0 ? (
          <EmptyState title="Dinlenme günü" description="Bu gün için egzersiz yok." />
        ) : (
          dayItems.map((item) => <ExerciseCard key={item.id} item={item} planId={p.id} />)
        )}
      </section>
    </div>
  );
}
