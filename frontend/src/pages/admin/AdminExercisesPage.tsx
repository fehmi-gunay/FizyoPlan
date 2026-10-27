import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { adminKeys, listAdminExercises, setExerciseApproval, type AdminExerciseFilters } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { AdminNav } from '../../components/admin/AdminNav';
import { Alert, Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { DIFFICULTY_LABELS, REGION_LABELS } from '../../lib/labels';
import type { RegionCode } from '../../types/api';

const APPROVAL_PARAM: Record<string, boolean | undefined> = { onayli: true, bekleyen: false };

export default function AdminExercisesPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const approvalKey = params.get('onay') ?? '';
  const region = (params.get('bolge') ?? '') as RegionCode | '';
  const filters: AdminExerciseFilters = {
    approved: APPROVAL_PARAM[approvalKey],
    region: region || undefined,
  };
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const exercises = useQuery({ queryKey: adminKeys.exercises(filters), queryFn: () => listAdminExercises(filters) });

  const approval = useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean; title: string }) => setExerciseApproval(id, approved),
    onSuccess: (_d, v) => {
      setNotice({ tone: 'success', text: `"${v.title}" ${v.approved ? 'onaylandı' : 'onayı kaldırıldı'}.` });
      queryClient.invalidateQueries({ queryKey: adminKeys.exercisesAll });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats });
    },
    onError: (err) => setNotice({ tone: 'danger', text: errorMessage(err) }),
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Egzersiz Kütüphanesi"
        description="Yeni veya düzenlenen egzersizler uzman onayından sonra kullanıcı planlarına girer."
        actions={
          <Link to="/admin/egzersizler/yeni" className="btn btn-primary">
            + Yeni egzersiz
          </Link>
        }
      />
      <AdminNav />

      <div className="admin-filters" role="search" aria-label="Egzersiz filtreleri">
        <div className="field">
          <label htmlFor="f-approval">Onay durumu</label>
          <select id="f-approval" className="select" value={approvalKey} onChange={(e) => setFilter('onay', e.target.value)}>
            <option value="">Tümü</option>
            <option value="onayli">Onaylı</option>
            <option value="bekleyen">Onay bekleyen</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-region">Bölge</label>
          <select id="f-region" className="select" value={region} onChange={(e) => setFilter('bolge', e.target.value)}>
            <option value="">Tüm bölgeler</option>
            {Object.entries(REGION_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      )}

      {exercises.isPending && <LoadingState label="Egzersizler yükleniyor…" />}
      {exercises.isError && <ErrorState error={exercises.error} onRetry={() => exercises.refetch()} />}
      {exercises.data && exercises.data.length === 0 && (
        <EmptyState title="Egzersiz bulunamadı" description="Filtreleri değiştirin veya yeni bir egzersiz ekleyin." />
      )}
      {exercises.data && exercises.data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Egzersiz listesi ({exercises.data.length})</caption>
            <thead>
              <tr>
                <th scope="col">Egzersiz</th>
                <th scope="col">Bölge</th>
                <th scope="col">Zorluk</th>
                <th scope="col">Durum</th>
                <th scope="col">Kontrendikasyon</th>
                <th scope="col">
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {exercises.data.map((e) => {
                const busy = approval.isPending && approval.variables?.id === e.id;
                return (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.title}</strong>
                      <div className="small muted">
                        {e.setsMin}-{e.setsMax} set · {e.repsMin}-{e.repsMax} tekrar · {e.durationMin}-{e.durationMax} sn
                      </div>
                    </td>
                    <td>{e.regions.map((r) => REGION_LABELS[r.code] ?? r.name).join(', ')}</td>
                    <td>{DIFFICULTY_LABELS[e.difficulty]}</td>
                    <td>
                      {e.approved ? (
                        <Badge tone="success">Onaylı{e.approvedBy ? ` (#${e.approvedBy})` : ''}</Badge>
                      ) : (
                        <Badge tone="warning">Onay bekliyor</Badge>
                      )}
                    </td>
                    <td className="small">
                      {e.contraindications.length ? e.contraindications.map((c) => c.condition).join(', ') : <span className="muted">–</span>}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {e.approved ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busy}
                            onClick={() => approval.mutate({ id: e.id, approved: false, title: e.title })}
                          >
                            Onayı kaldır
                          </Button>
                        ) : (
                          <Button size="sm" loading={busy} onClick={() => approval.mutate({ id: e.id, approved: true, title: e.title })}>
                            Onayla
                          </Button>
                        )}
                        <Link to={`/admin/egzersizler/${e.id}`} className="btn btn-ghost btn-sm" aria-label={`${e.title} düzenle`}>
                          Düzenle
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
