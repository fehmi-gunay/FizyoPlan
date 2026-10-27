import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getProfile, getToday, listPlans, qk } from '../api/endpoints';
import { ExerciseCard } from '../components/plans/ExerciseCard';
import { GeneratePlanPanel } from '../components/plans/GeneratePlanPanel';
import { Alert, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { DAY_NAMES, PLAN_TYPE_LABELS, formatDate } from '../lib/labels';
import '../styles/plans.css';

export default function DashboardPage() {
  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
  const today = useQuery({ queryKey: qk.today(), queryFn: () => getToday(), enabled: !!profile.data });
  const noActive = today.data && !today.data.plan;
  const others = useQuery({
    queryKey: qk.planList({ scope: 'dashboard' }),
    queryFn: () => listPlans(),
    enabled: !!noActive,
  });

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

  // 1) Anket doldurulmamış
  if (!profile.data) {
    return (
      <div className="stack-lg">
        <PageHeader title="Hoş geldiniz 👋" description="Size özel, güvenli bir egzersiz planı için birkaç adım kaldı." />
        <Card>
          <ol className="step-list">
            <li>
              <div>
                <h3 className="mb-0">Sağlık anketini doldurun</h3>
                <p className="muted mb-0">Yaş, boy, kilo, aktivite düzeyi ve ağrı bölgeleriniz. Yaklaşık 3 dakika sürer.</p>
              </div>
            </li>
            <li>
              <div>
                <h3 className="mb-0">Planınızı inceleyip onaylayın</h3>
                <p className="muted mb-0">Plan yalnızca uzman onaylı egzersizlerden, güvenlik kurallarına göre oluşturulur.</p>
              </div>
            </li>
            <li>
              <div>
                <h3 className="mb-0">Egzersiz yapın, nasıl hissettiğinizi bildirin</h3>
                <p className="muted mb-0">Ağrınız artarsa plan güvenliğiniz için otomatik olarak durdurulur.</p>
              </div>
            </li>
          </ol>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Link to="/anket" className="btn btn-primary">
              Sağlık anketini doldur
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (today.isPending) return <LoadingState />;
  if (today.isError) return <ErrorState error={today.error} onRetry={() => today.refetch()} />;

  const { plan, day, items } = today.data;

  // 2) Aktif plan yok
  if (!plan) {
    if (others.isPending) return <LoadingState />;
    const draft = others.data?.find((p) => p.status === 'draft');
    const suspended = others.data?.find((p) => p.status === 'suspended');
    return (
      <div className="stack-lg">
        <PageHeader title="Bugün" description="Şu an aktif bir planınız yok." />
        {others.isError && <ErrorState error={others.error} onRetry={() => others.refetch()} />}
        {suspended && (
          <Alert tone="danger" title="Planınız askıya alındı">
            <p className="mb-0">
              Bildirdiğiniz ağrı/zorluk nedeniyle planınız {formatDate(suspended.suspendedAt)} tarihinde durduruldu.{' '}
              <Link to={`/askida/${suspended.id}`}>Ne yapmalıyım?</Link>
            </p>
          </Alert>
        )}
        {draft && (
          <Card>
            <div className="row-between">
              <div>
                <h3 className="mb-0">Onay bekleyen planınız var</h3>
                <p className="muted mb-0">
                  {PLAN_TYPE_LABELS[draft.type]} plan · {draft.itemCount} egzersiz · {formatDate(draft.createdAt)}
                </p>
              </div>
              <Link to={`/planlar/${draft.id}`} className="btn btn-primary">
                İncele ve onayla
              </Link>
            </div>
          </Card>
        )}
        <Card>
          <GeneratePlanPanel title={draft ? 'Ya da yeni bir plan oluşturun' : 'Planınızı oluşturun'} />
        </Card>
        <QuickLinks />
      </div>
    );
  }

  // 3) Aktif plan: bugünün egzersizleri
  const done = items.filter((i) => i.completed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="stack-lg">
      <PageHeader
        title="Bugünün egzersizleri"
        description={`${PLAN_TYPE_LABELS[plan.type]} plan${plan.type === 'weekly' && day ? ` · ${DAY_NAMES[day - 1]}` : ''}`}
        actions={
          <Link to={`/planlar/${plan.id}`} className="btn btn-secondary">
            Tüm planı gör
          </Link>
        }
      />

      {items.length > 0 && (
        <Card>
          <div className="stack-sm">
            <div className="row-between">
              <strong id="progress-label">Bugünkü ilerleme</strong>
              <span aria-hidden="true">
                {done} / {items.length}
              </span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-labelledby="progress-label"
              aria-valuemin={0}
              aria-valuemax={items.length}
              aria-valuenow={done}
              aria-valuetext={`${items.length} egzersizden ${done} tanesi tamamlandı`}
            >
              <div className="progress-bar" style={{ width: `${pct}%` }} />
            </div>
            {done === items.length && (
              <p className="mb-0" role="status">
                🎉 Bugünün egzersizlerini tamamladınız. Harika!
              </p>
            )}
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState title="Bugün dinlenme günü" description="Bu gün için planlanmış egzersiz yok." />
      ) : (
        <div className="stack">
          {items.map((item) => (
            <ExerciseCard key={item.id} item={item} planId={plan.id} completed={item.completed} />
          ))}
        </div>
      )}

      <Alert tone="info">
        Her egzersizden sonra ağrı ve zorluk düzeyinizi bildirin. Ağrı 7/10 veya zorluk 9/10 ve üzerindeyse plan güvenliğiniz için
        durdurulur.
      </Alert>
      <QuickLinks />
    </div>
  );
}

function QuickLinks() {
  return (
    <div className="grid">
      <Link to="/planlar" className="card card-link">
        <h3 className="mb-0">Planlarım</h3>
        <p className="muted mb-0 small">Geçmiş ve aktif planlarınız</p>
      </Link>
      <Link to="/anket" className="card card-link">
        <h3 className="mb-0">Sağlık anketi</h3>
        <p className="muted mb-0 small">Ağrı durumunuzu güncelleyin</p>
      </Link>
      <Link to="/profil" className="card card-link">
        <h3 className="mb-0">Profil ve ayarlar</h3>
        <p className="muted mb-0 small">Yazı boyutu, tema, hesap</p>
      </Link>
    </div>
  );
}
