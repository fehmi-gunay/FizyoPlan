import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { adminKeys, listUsers, updateUserRole, type AdminUser } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { AdminNav } from '../../components/admin/AdminNav';
import { Alert, Badge, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/useAuth';
import { formatDate, ROLE_LABELS } from '../../lib/labels';
import type { Role } from '../../types/api';

const ROLE_TONE: Record<Role, 'primary' | 'success' | undefined> = { admin: 'primary', physio: 'success', user: undefined };

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const users = useQuery({ queryKey: adminKeys.users, queryFn: listUsers });

  const changeRole = useMutation({
    mutationFn: ({ user, role }: { user: AdminUser; role: Role }) => updateUserRole(user.id, role),
    onSuccess: (updated) => {
      setNotice({ tone: 'success', text: `${updated.email} artık "${ROLE_LABELS[updated.role]}".` });
      // Kullanıcılar, istatistikler ve aktivite kayıtları (rol değişikliği kaydı) birlikte yenilenir
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (err) => setNotice({ tone: 'danger', text: errorMessage(err) }),
  });

  const onRoleChange = (user: AdminUser, role: Role) => {
    if (role === user.role) return;
    const ok = window.confirm(`${user.email} kullanıcısının rolü "${ROLE_LABELS[user.role]}" → "${ROLE_LABELS[role]}" olarak değiştirilsin mi?`);
    if (ok) changeRole.mutate({ user, role });
  };

  const term = search.trim().toLowerCase();
  const filtered = users.data?.filter((u) => !term || u.email.toLowerCase().includes(term)) ?? [];

  return (
    <>
      <PageHeader title="Kullanıcılar" description="Hesap bilgileri ve roller. Sağlık verileri bu ekranda gösterilmez." />
      <AdminNav />

      <div className="admin-filters" role="search">
        <div className="field">
          <label htmlFor="user-search">E-posta ara</label>
          <input id="user-search" className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {notice && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      )}

      {users.isPending && <LoadingState label="Kullanıcılar yükleniyor…" />}
      {users.isError && <ErrorState error={users.error} onRetry={() => users.refetch()} />}
      {users.data && filtered.length === 0 && <EmptyState title="Kullanıcı bulunamadı" />}
      {filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Kullanıcılar ({filtered.length})</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">E-posta</th>
                <th scope="col">Rol</th>
                <th scope="col">Kayıt tarihi</th>
                <th scope="col">Rolü değiştir</th>
                <th scope="col">
                  <span className="sr-only">Kayıtlar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td className="muted">{u.id}</td>
                    <td>
                      {u.email} {isMe && <span className="muted small">(siz)</span>}
                    </td>
                    <td>
                      <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="nowrap">{formatDate(u.createdAt)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        {u.email} rolü
                      </label>
                      <select
                        id={`role-${u.id}`}
                        className="select"
                        style={{ minWidth: 160 }}
                        value={u.role}
                        disabled={isMe || (changeRole.isPending && changeRole.variables?.user.id === u.id)}
                        title={isMe ? 'Kendi rolünüzü değiştiremezsiniz' : undefined}
                        onChange={(e) => onRoleChange(u, e.target.value as Role)}
                      >
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Link to={`/admin/kayitlar?eposta=${encodeURIComponent(u.email)}`} className="btn btn-ghost btn-sm">
                        Kayıtlar
                      </Link>
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
