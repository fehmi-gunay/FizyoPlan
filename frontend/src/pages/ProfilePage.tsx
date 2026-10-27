import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { ApiError, errorMessage } from '../api/client';
import { changePassword, deleteAccount, getProfile, qk } from '../api/endpoints';
import { Field } from '../components/form';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { FONT_SCALES, usePreferences, type Theme } from '../context/PreferencesContext';
import { ACTIVITY_LABELS, formatDate, REGION_LABELS, ROLE_LABELS } from '../lib/labels';
import { ageFrom, bmi, bmiLabel, CONDITION_OPTIONS, painInfo } from '../lib/survey';
import '../styles/profile.css';

export default function ProfilePage() {
  return (
    <div className="profile stack-lg">
      <PageHeader title="Profil ve Ayarlar" description="Hesabınızı, sağlık bilgilerinizi ve görünüm tercihlerinizi yönetin." />
      <AccountSection />
      <HealthSection />
      <AccessibilitySection />
      <PasswordSection />
      <DeleteSection />
    </div>
  );
}

function AccountSection() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Card as="section">
      <h2>Hesap</h2>
      <dl className="summary-list">
        <div>
          <dt>E-posta</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Rol</dt>
          <dd>
            <Badge tone="primary">{ROLE_LABELS[user.role]}</Badge>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function HealthSection() {
  const q = useQuery({ queryKey: qk.profile, queryFn: getProfile });

  return (
    <Card as="section">
      <div className="row-between">
        <h2 className="mb-0">Sağlık bilgileri</h2>
        {q.data && (
          <Link to="/anket" className="btn btn-secondary btn-sm">
            Anketi düzenle
          </Link>
        )}
      </div>
      {q.isPending && <LoadingState />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.isSuccess && !q.data && (
        <EmptyState
          title="Sağlık anketi henüz doldurulmadı"
          description="Size özel egzersiz planı için önce anketi doldurun."
          action={
            <Link to="/anket" className="btn btn-primary">
              Anketi doldur
            </Link>
          }
        />
      )}
      {q.data &&
        (() => {
          const p = q.data;
          const b = bmi(p.heightCm, Number(p.weightKg));
          const conditions = p.conditions.map((c) => CONDITION_OPTIONS.find((o) => o.code === c)?.label ?? c);
          return (
            <dl className="summary-list mt-3">
              <div>
                <dt>Yaş</dt>
                <dd>{ageFrom(p.birthDate)}</dd>
              </div>
              <div>
                <dt>Boy / Kilo</dt>
                <dd>
                  {p.heightCm} cm · {Number(p.weightKg)} kg
                </dd>
              </div>
              <div>
                <dt>Vücut kitle indeksi</dt>
                <dd>
                  {b} <span className="muted">({bmiLabel(b)})</span>
                </dd>
              </div>
              <div>
                <dt>Aktivite</dt>
                <dd>{ACTIVITY_LABELS[p.activityLevel].label}</dd>
              </div>
              <div>
                <dt>Ağrı bölgeleri</dt>
                <dd>
                  {p.painRegions.length ? (
                    <span className="row" style={{ gap: 6 }}>
                      {p.painRegions.map((r) => (
                        <Badge key={r.regionCode} tone={r.severity >= 7 ? 'danger' : r.severity >= 4 ? 'warning' : 'primary'}>
                          {REGION_LABELS[r.regionCode]} {r.severity}/10 · {painInfo(r.severity).label}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    '–'
                  )}
                </dd>
              </div>
              <div>
                <dt>Tanılar</dt>
                <dd>{conditions.length ? conditions.join(', ') : 'Yok'}</dd>
              </div>
              <div>
                <dt>Uyarı belirtileri</dt>
                <dd>{p.redFlags.length ? <Badge tone="warning">{p.redFlags.length} belirti bildirildi</Badge> : 'Yok'}</dd>
              </div>
              <div>
                <dt>Son güncelleme</dt>
                <dd>{formatDate(p.updatedAt, true)}</dd>
              </div>
            </dl>
          );
        })()}
    </Card>
  );
}

const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: 'system', label: 'Sistem', hint: 'Cihaz ayarını izler' },
  { value: 'light', label: 'Açık', hint: 'Açık zemin' },
  { value: 'dark', label: 'Koyu', hint: 'Koyu zemin' },
  { value: 'contrast', label: 'Yüksek kontrast', hint: 'Siyah zemin, belirgin renkler' },
];
const FONT_LABELS = ['Küçük', 'Normal', 'Büyük', 'Daha büyük', 'En büyük'];

function AccessibilitySection() {
  const { theme, setTheme, fontScale, setFontScale } = usePreferences();
  return (
    <Card as="section">
      <h2>Görünüm ve erişilebilirlik</h2>
      <div className="stack">
        <fieldset className="plain-fieldset">
          <legend className="label">Tema</legend>
          <div className="option-grid">
            {THEMES.map((t) => (
              <label key={t.value} className="check">
                <input type="radio" name="theme" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} />
                <span>
                  <strong>{t.label}</strong>
                  <br />
                  <span className="small muted">{t.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="plain-fieldset">
          <legend className="label">Yazı boyutu</legend>
          <div className="option-grid">
            {FONT_SCALES.map((scale, i) => (
              <label key={scale} className="check">
                <input type="radio" name="fontScale" checked={fontScale === i} onChange={() => setFontScale(i)} />
                <span>
                  {FONT_LABELS[i] ?? `%${scale * 100}`} <span className="small muted">(%{Math.round(scale * 100)})</span>
                </span>
              </label>
            ))}
          </div>
          <p className="font-preview" aria-live="polite">
            Önizleme: Dizlerinizi hafifçe bükün ve 10 saniye bekleyin.
          </p>
        </fieldset>
      </div>
    </Card>
  );
}

const newPassword = z
  .string()
  .min(8, 'Parola en az 8 karakter olmalı')
  .max(72, 'Parola en fazla 72 karakter olabilir')
  .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'Parola en az bir harf içermeli')
  .regex(/\d/, 'Parola en az bir rakam içermeli');

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut parolanızı girin'),
    newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Parolalar eşleşmiyor' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Yeni parola mevcut paroladan farklı olmalı' });
type PasswordForm = z.infer<typeof passwordSchema>;

function PasswordSection() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const mutation = useMutation({
    mutationFn: (v: PasswordForm) => changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => {
      setDone(true);
      reset();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'INVALID_PASSWORD') setError('currentPassword', { message: 'Mevcut parola hatalı' });
      else if (err instanceof ApiError && err.fieldErrors().newPassword) setError('newPassword', { message: err.fieldErrors().newPassword });
    },
  });

  const generalError =
    mutation.isError && !(mutation.error instanceof ApiError && (mutation.error.code === 'INVALID_PASSWORD' || mutation.error.fieldErrors().newPassword))
      ? errorMessage(mutation.error)
      : null;

  return (
    <Card as="section">
      <h2>Parolayı değiştir</h2>
      <form
        className="stack form-narrow"
        noValidate
        onSubmit={handleSubmit((v) => {
          setDone(false);
          mutation.mutate(v);
        })}
      >
        {done && <Alert tone="success">Parolanız güncellendi.</Alert>}
        {generalError && <Alert tone="danger">{generalError}</Alert>}
        <Field label="Mevcut parola" error={errors.currentPassword?.message}>
          <input className="input" type="password" autoComplete="current-password" {...register('currentPassword')} />
        </Field>
        <Field label="Yeni parola" hint="En az 8 karakter, bir harf ve bir rakam" error={errors.newPassword?.message}>
          <input className="input" type="password" autoComplete="new-password" {...register('newPassword')} />
        </Field>
        <Field label="Yeni parola (tekrar)" error={errors.confirm?.message}>
          <input className="input" type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>
        <div>
          <Button type="submit" loading={mutation.isPending}>
            Parolayı güncelle
          </Button>
        </div>
      </form>
    </Card>
  );
}

const CONFIRM_WORD = 'SİL';
const deleteSchema = z.object({
  password: z.string().min(1, 'Onay için parolanızı girin'),
  confirmText: z.string().refine((v) => v.trim().toLocaleUpperCase('tr') === CONFIRM_WORD, `Onaylamak için “${CONFIRM_WORD}” yazın`),
});
type DeleteForm = z.infer<typeof deleteSchema>;

function DeleteSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DeleteForm>({ resolver: zodResolver(deleteSchema) });

  const mutation = useMutation({
    mutationFn: (v: DeleteForm) => deleteAccount(v.password),
    onSuccess: () => {
      logout();
      navigate('/giris', { replace: true });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'INVALID_PASSWORD') setError('password', { message: 'Parola hatalı' });
    },
  });

  return (
    <section className="card danger-zone" aria-labelledby="delete-title">
      <h2 id="delete-title">Hesabı sil</h2>
      <p>
        Hesabınızı sildiğinizde e-posta adresiniz, sağlık anketiniz, ağrı bilgileriniz, tüm planlarınız ve geri
        bildirimleriniz <strong>kalıcı olarak</strong> silinir. Bu işlem geri alınamaz. (KVKK kapsamındaki silme hakkınız)
      </p>
      {!open ? (
        <Button variant="danger" onClick={() => setOpen(true)}>
          Hesabımı silmek istiyorum
        </Button>
      ) : (
        <form className="stack form-narrow" noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          {mutation.isError && !(mutation.error instanceof ApiError && mutation.error.code === 'INVALID_PASSWORD') && (
            <Alert tone="danger">{errorMessage(mutation.error)}</Alert>
          )}
          <Field label="Parolanız" error={errors.password?.message}>
            <input className="input" type="password" autoComplete="current-password" {...register('password')} />
          </Field>
          <Field label={`Onaylamak için “${CONFIRM_WORD}” yazın`} error={errors.confirmText?.message}>
            <input className="input" type="text" autoComplete="off" {...register('confirmText')} />
          </Field>
          <div className="row">
            <Button type="submit" variant="danger" loading={mutation.isPending}>
              Hesabımı kalıcı olarak sil
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Vazgeç
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
