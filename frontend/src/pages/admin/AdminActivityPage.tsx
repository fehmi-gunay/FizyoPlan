import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { adminKeys, AUDIT_ACTION_LABELS, getAuditLogs, summarizeUserAgent, type AuditAction, type AuditFilters, type AuditLog } from '../../api/admin';
import { AdminNav } from '../../components/admin/AdminNav';
import { Alert, Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { formatDate, ROLE_LABELS } from '../../lib/labels';

const PAGE_SIZE = 25;

function describeMeta(log: AuditLog): string {
  const m = log.meta;
  if (!m) return '';
  if (log.action === 'role_change') {
    const prev = ROLE_LABELS[m.previousRole as keyof typeof ROLE_LABELS] ?? m.previousRole;
    const next = ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role;
    return `${m.targetEmail ?? `#${m.targetUserId}`}: ${prev} → ${next}`;
  }
  if ('exerciseId' in m) return `${m.title ?? 'Egzersiz'} (#${m.exerciseId})`;
  return JSON.stringify(m);
}

export default function AdminActivityPage() {
  const [params, setParams] = useSearchParams();
  const filters: AuditFilters = {
    action: (params.get('islem') as AuditAction) || undefined,
    email: params.get('eposta') || undefined,
    from: params.get('baslangic') || undefined,
    to: params.get('bitis') || undefined,
    page: Number(params.get('sayfa')) || 1,
    pageSize: PAGE_SIZE,
  };

  // Form taslağı; "Filtrele" ile URL'ye yazılır
  const [draft, setDraft] = useState({ action: '', email: '', from: '', to: '' });
  useEffect(() => {
    setDraft({ action: params.get('islem') ?? '', email: params.get('eposta') ?? '', from: params.get('baslangic') ?? '', to: params.get('bitis') ?? '' });
  }, [params]);

  const logs = useQuery({
    queryKey: adminKeys.logs(filters),
    queryFn: () => getAuditLogs(filters),
    placeholderData: keepPreviousData,
  });

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (draft.action) next.set('islem', draft.action);
    if (draft.email.trim()) next.set('eposta', draft.email.trim());
    if (draft.from) next.set('baslangic', draft.from);
    if (draft.to) next.set('bitis', draft.to);
    setParams(next);
  };
  const clear = () => setParams(new URLSearchParams());
  const goTo = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('sayfa', String(page));
    setParams(next);
  };

  const total = logs.data?.total ?? 0;
  const page = logs.data?.page ?? filters.page!;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Giriş ve Aktivite Kayıtları" description="Kim, ne zaman, hangi cihazdan giriş yaptı ve hangi yönetim işlemini yaptı." />
      <AdminNav />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Alert tone="info">
          Kayıtlar yalnızca güvenlik amacıyla tutulur ve sağlık verisi içermez. Hesabını silen kullanıcıların e-posta bilgisi
          kayıtlardan da kaldırılır (KVKK).
        </Alert>
      </div>

      <form className="admin-filters" onSubmit={apply} role="search" aria-label="Kayıt filtreleri">
        <div className="field">
          <label htmlFor="f-action">İşlem</label>
          <select id="f-action" className="select" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })}>
            <option value="">Tümü</option>
            {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-email">E-posta</label>
          <input id="f-email" className="input" type="search" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="f-from">Başlangıç</label>
          <input id="f-from" className="input" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="f-to">Bitiş</label>
          <input id="f-to" className="input" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </div>
        <div className="row">
          <Button type="submit">Filtrele</Button>
          <Button variant="ghost" onClick={clear}>
            Temizle
          </Button>
        </div>
      </form>

      {logs.isPending && <LoadingState label="Kayıtlar yükleniyor…" />}
      {logs.isError && <ErrorState error={logs.error} onRetry={() => logs.refetch()} />}
      {logs.data && logs.data.logs.length === 0 && <EmptyState title="Kayıt bulunamadı" description="Filtreleri değiştirip tekrar deneyin." />}
      {logs.data && logs.data.logs.length > 0 && (
        <>
          <div className="table-wrap" aria-busy={logs.isFetching || undefined}>
            <table className="table">
              <caption className="sr-only">Aktivite kayıtları, sayfa {page}</caption>
              <thead>
                <tr>
                  <th scope="col" className="nowrap">
                    Zaman
                  </th>
                  <th scope="col">İşlem</th>
                  <th scope="col">Kullanıcı</th>
                  <th scope="col">IP</th>
                  <th scope="col">Cihaz</th>
                  <th scope="col">Ayrıntı</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap">{formatDate(l.createdAt, true)}</td>
                    <td>
                      <Badge tone={AUDIT_ACTION_LABELS[l.action]?.tone}>{AUDIT_ACTION_LABELS[l.action]?.label ?? l.action}</Badge>
                    </td>
                    <td>
                      {l.user ? (
                        <>
                          {l.user.email}
                          <div className="small muted">{ROLE_LABELS[l.user.role]}</div>
                        </>
                      ) : l.email ? (
                        <>
                          {l.email}
                          <div className="small muted">Kayıtlı değil</div>
                        </>
                      ) : (
                        <span className="muted">Silinmiş hesap</span>
                      )}
                    </td>
                    <td className="mono">{l.ip ?? '–'}</td>
                    <td title={l.userAgent ?? undefined}>{summarizeUserAgent(l.userAgent)}</td>
                    <td className="small">{describeMeta(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pager" aria-label="Sayfalama">
            <span className="muted">
              Toplam {total} kayıt · Sayfa {page} / {lastPage}
            </span>
            <div className="row">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
                ← Önceki
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => goTo(page + 1)}>
                Sonraki →
              </Button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
