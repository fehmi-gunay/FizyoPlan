import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ApiError, errorMessage } from '../api/client';
import { getPlan, qk, reassessPlan } from '../api/endpoints';
import { GeneratePlanPanel } from '../components/plans/GeneratePlanPanel';
import { Alert, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { formatDate } from '../lib/labels';
import '../styles/plans.css';

export default function SuspendedPage() {
  const planId = Number(useParams().planId);
  const queryClient = useQueryClient();
  const plan = useQuery({ queryKey: qk.plan(planId), queryFn: () => getPlan(planId), enabled: planId > 0 });

  const reassess = useMutation({
    mutationFn: () => reassessPlan(planId),
    onSuccess: (res) => {
      if (res.canGenerate) queryClient.invalidateQueries({ queryKey: qk.plans });
    },
  });

  if (!(planId > 0)) return <EmptyState title="Plan bulunamadı" />;
  if (plan.isPending) return <LoadingState />;
  if (plan.isError) {
    if (plan.error instanceof ApiError && plan.error.status === 404) return <EmptyState title="Plan bulunamadı" />;
    return <ErrorState error={plan.error} onRetry={() => plan.refetch()} />;
  }

  const r = reassess.data;

  // Yeniden değerlendirme olumlu: plan kapandı, yeni plan oluşturulabilir
  if (r?.canGenerate) {
    return (
      <div className="stack-lg">
        <PageHeader title="Yeniden değerlendirme uygun" />
        <Alert tone="success">{r.message}</Alert>
        <Card>
          <GeneratePlanPanel title="Güncel bilgilerinizle yeni plan oluşturun" />
        </Card>
      </div>
    );
  }

  if (plan.data.status !== 'suspended') {
    return (
      <div className="stack-lg">
        <PageHeader title="Plan askıda değil" />
        <Alert tone="info">Bu plan şu anda askıya alınmış durumda değil.</Alert>
        <div className="row">
          <Link to={`/planlar/${planId}`} className="btn btn-primary">
            Planı görüntüle
          </Link>
          <Link to="/" className="btn btn-secondary">
            Ana sayfa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <PageHeader
        title="Planınız askıya alındı"
        description={`Güvenliğiniz için plan ${formatDate(plan.data.suspendedAt, true)} tarihinde durduruldu.`}
      />

      <Alert tone="warning" title="Şimdilik egzersizlere ara verin">
        <p className="mb-0">
          Bildirdiğiniz ağrı veya zorluk güvenli sınırın üzerindeydi. Bu bir tanı değildir; ancak şikâyetiniz birkaç gün içinde
          geçmezse veya artarsa bir fizyoterapiste ya da hekime başvurun.
        </p>
      </Alert>

      <Alert tone="danger" title="Acil belirtiler">
        Ani güç kaybı, idrar/dışkı kontrolünde bozulma, göğüs ağrısı veya nefes darlığı varsa <strong>112</strong>'yi arayın.
      </Alert>

      <Card>
        <h2>Ne yapmalıyım?</h2>
        <ol className="step-list">
          <li>
            <div className="stack-sm">
              <h3 className="mb-0">Sağlık anketini güncelleyin</h3>
              <p className="muted mb-0">Şu anki ağrı bölgelerinizi ve şiddetini yeniden bildirin.</p>
              <div>
                <Link to={`/anket?donus=/askida/${planId}`} className="btn btn-secondary">
                  Anketi güncelle
                </Link>
              </div>
            </div>
          </li>
          <li>
            <div className="stack-sm">
              <h3 className="mb-0">Yeniden değerlendirme isteyin</h3>
              <p className="muted mb-0">Güncel bilgilerinize göre yeni bir plan oluşturmanın güvenli olup olmadığı kontrol edilir.</p>
              <div>
                <Button onClick={() => reassess.mutate()} loading={reassess.isPending}>
                  Yeniden değerlendir
                </Button>
              </div>
            </div>
          </li>
        </ol>
      </Card>

      {reassess.isError && <Alert tone="danger">{errorMessage(reassess.error)}</Alert>}

      {r && !r.canGenerate && (
        <Alert tone={r.riskLevel === 'risky' ? 'danger' : 'warning'} title={r.riskLevel === 'risky' ? 'Uzman değerlendirmesi gerekli' : 'Önce anketi güncelleyin'}>
          <ul>
            {r.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {r.riskLevel === 'risky' ? (
            <p className="mb-0" style={{ marginTop: 'var(--space-2)' }}>
              Güvenliğiniz için size yeni plan oluşturamıyoruz. Lütfen bir fizyoterapiste veya hekime başvurun.
            </p>
          ) : (
            <p className="mb-0" style={{ marginTop: 'var(--space-2)' }}>
              <Link to={`/anket?donus=/askida/${planId}`}>Anketi güncellemek için tıklayın.</Link>
            </p>
          )}
        </Alert>
      )}
    </div>
  );
}
