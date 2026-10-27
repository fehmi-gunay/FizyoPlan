import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { adminKeys, AUDIT_ACTION_LABELS, getAuditLogs, getStats, summarizeUserAgent } from '../../api/admin';
import { AdminNav } from '../../components/admin/AdminNav';
import { Alert, Badge, Card, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatDate, ROLE_LABELS } from '../../lib/labels';

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: 'warn' | 'danger' }) {
  return (
    <Card className={tone ? `stat-${tone}` : ''}>
      <div className="stat">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </Card>
  );
}

function RecentLogins() {
  const logs = useQuery({ queryKey: adminKeys.logs({ pageSize: 10 }), queryFn: () => getAuditLogs({ pageSize: 10 }) });

  if (logs.isPending) return <LoadingState label="Kayıtlar yükleniyor…" />;
  if (logs.isError) return <ErrorState error={logs.error} onRetry={() => logs.refetch()} />;
  if (logs.data.logs.length === 0) return <p className="muted">Henüz kayıt yok.</p>;

  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">Son 10 aktivite kaydı</caption>
        <thead>
          <tr>
            <th scope="col">Zaman</th>
            <th scope="col">İşlem</th>
            <th scope="col">Kullanıcı</th>
            <th scope="col">Tarayıcı</th>
          </tr>
        </thead>
        <tbody>
          {logs.data.logs.map((l) => (
            <tr key={l.id}>
              <td className="nowrap">{formatDate(l.createdAt, true)}</td>
              <td>
                <Badge tone={AUDIT_ACTION_LABELS[l.action].tone}>{AUDIT_ACTION_LABELS[l.action].label}</Badge>
              </td>
              <td>{l.user?.email ?? l.email ?? <span className="muted">Silinmiş hesap</span>}</td>
              <td className="muted">{summarizeUserAgent(l.userAgent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const stats = useQuery({ queryKey: adminKeys.stats, queryFn: getStats });

  return (
    <>
      <PageHeader title="Yönetim Paneli" description={`${user ? ROLE_LABELS[user.role] : ''} olarak giriş yaptınız.`} />
      <AdminNav />

      {stats.isPending && <LoadingState label="Özet yükleniyor…" />}
      {stats.isError && <ErrorState error={stats.error} onRetry={() => stats.refetch()} />}
      {stats.data && (
        <div className="stack-lg">
          {stats.data.exercises.pending > 0 && (
            <Alert tone="warning" title="Onay bekleyen egzersizler">
              {stats.data.exercises.pending} egzersiz uzman onayı bekliyor. Onaylanana kadar kullanıcılara gösterilmez.{' '}
              <Link to="/admin/egzersizler?onay=bekleyen">Egzersizlere git →</Link>
            </Alert>
          )}

          <section className="stack" aria-labelledby="stats-users">
            <h2 id="stats-users">Kullanıcılar ve planlar</h2>
            <div className="admin-stats">
              <Stat
                label="Toplam kullanıcı"
                value={stats.data.users.total}
                sub={`Son 7 günde ${stats.data.users.newLast7Days} yeni`}
              />
              <Stat label="Doldurulmuş anket" value={stats.data.profiles.total} />
              <Stat label="Aktif plan" value={stats.data.plans.byStatus.active} sub={`${stats.data.plans.byStatus.draft} onay bekliyor`} />
              <Stat
                label="Askıdaki plan"
                value={stats.data.plans.byStatus.suspended}
                sub={`Son 7 günde ${stats.data.feedback.suspensionsLast7Days} askıya alma`}
                tone={stats.data.plans.byStatus.suspended > 0 ? 'warn' : undefined}
              />
              <Stat label="Geri bildirim (7 gün)" value={stats.data.feedback.last7Days} />
              <Stat label="Tamamlanan plan" value={stats.data.plans.byStatus.completed} />
            </div>
          </section>

          <section className="stack" aria-labelledby="stats-library">
            <h2 id="stats-library">Egzersiz kütüphanesi ve güvenlik</h2>
            <div className="admin-stats">
              <Stat label="Onaylı egzersiz" value={stats.data.exercises.approved} sub="Hedef: 100+" />
              <Stat label="Onay bekleyen" value={stats.data.exercises.pending} tone={stats.data.exercises.pending > 0 ? 'warn' : undefined} />
              <Stat label="Giriş (24 saat)" value={stats.data.logins.last24h} sub={`7 günde ${stats.data.logins.successLast7Days}`} />
              <Stat
                label="Başarısız giriş (7 gün)"
                value={stats.data.logins.failedLast7Days}
                tone={stats.data.logins.failedLast7Days > 10 ? 'danger' : undefined}
              />
              <Stat
                label="Uzman / yönetici"
                value={stats.data.users.byRole.physio + stats.data.users.byRole.admin}
                sub={`${stats.data.users.byRole.physio} fizyoterapist, ${stats.data.users.byRole.admin} yönetici`}
              />
            </div>
          </section>

          {isAdmin && (
            <section className="stack" aria-labelledby="recent-logins">
              <div className="row-between">
                <h2 id="recent-logins" className="mb-0">
                  Son aktiviteler
                </h2>
                <Link to="/admin/kayitlar" className="btn btn-secondary btn-sm">
                  Tüm kayıtlar
                </Link>
              </div>
              <RecentLogins />
            </section>
          )}
        </div>
      )}
    </>
  );
}
