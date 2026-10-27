import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { adminKeys, createExercise, getAdminExercise, updateExercise, type ExerciseInput } from '../../api/admin';
import { ApiError, errorMessage } from '../../api/client';
import { AdminNav } from '../../components/admin/AdminNav';
import { Field } from '../../components/form';
import { Alert, Button, Card, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { DIFFICULTY_LABELS, REGION_LABELS } from '../../lib/labels';
import { CONDITION_OPTIONS } from '../../lib/survey';
import type { Exercise } from '../../types/api';

const REGION_CODES = ['neck', 'shoulder', 'lower_back', 'knee'] as const;
const int = (min: number, max: number) =>
  z
    .number({ error: 'Bir sayı girin' })
    .int('Tam sayı girin')
    .min(min, `En az ${min}`)
    .max(max, `En fazla ${max}`);

// Backend: validators/admin.validators.ts ile aynı kurallar
const schema = z
  .object({
    title: z.string().trim().min(2, 'En az 2 karakter').max(150, 'En fazla 150 karakter'),
    description: z.string().trim().min(5, 'En az 5 karakter').max(5000, 'En fazla 5000 karakter'),
    videoUrl: z.union([z.literal(''), z.url('Geçerli bir adres girin (https://…)').max(500)]),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    setsMin: int(1, 20),
    setsMax: int(1, 20),
    repsMin: int(1, 100),
    repsMax: int(1, 100),
    durationMin: int(1, 3600),
    durationMax: int(1, 3600),
    regionCodes: z.array(z.enum(REGION_CODES)).min(1, 'En az bir bölge seçin'),
    contraindications: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    for (const k of ['sets', 'reps', 'duration'] as const) {
      if (v[`${k}Min`] > v[`${k}Max`]) {
        ctx.addIssue({ code: 'custom', path: [`${k}Max`], message: 'En fazla değeri en az değerden küçük olamaz' });
      }
    }
  });
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  title: '',
  description: '',
  videoUrl: '',
  difficulty: 'easy',
  setsMin: 2,
  setsMax: 3,
  repsMin: 8,
  repsMax: 12,
  durationMin: 5,
  durationMax: 10,
  regionCodes: [],
  contraindications: [],
};

function toForm(e: Exercise): FormValues {
  return {
    title: e.title,
    description: e.description,
    videoUrl: e.videoUrl ?? '',
    difficulty: e.difficulty,
    setsMin: e.setsMin,
    setsMax: e.setsMax,
    repsMin: e.repsMin,
    repsMax: e.repsMax,
    durationMin: e.durationMin,
    durationMax: e.durationMax,
    regionCodes: e.regions.map((r) => r.code),
    contraindications: e.contraindications.map((c) => c.condition),
  };
}

// Kontrendikasyon kodları: yaz + Enter / virgül ile ekle, × ile sil
function ChipInput({ value, onChange, id }: { value: string[]; onChange(v: string[]): void; id: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const code = draft.trim().toLowerCase().replace(/\s+/g, '_');
    if (code && code.length <= 100 && !value.includes(code)) onChange([...value, code]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="stack-sm">
      <div className="row">
        <input
          id={id}
          className="input"
          style={{ flex: 1, minWidth: 180 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="örn. akut_bel_fitigi"
          list={`${id}-known`}
        />
        {/* Ankette sorulan tanılarla eşleşen kodlar; listede olmayan kod hiçbir kullanıcıyla eşleşmez */}
        <datalist id={`${id}-known`}>
          {CONDITION_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </datalist>
        <Button variant="secondary" onClick={add} disabled={!draft.trim()}>
          Ekle
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="chips" aria-label="Eklenen kontrendikasyonlar" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {value.map((c) => (
            <li key={c} className="chip">
              {c}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== c))} aria-label={`${c} kaldır`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminExerciseFormPage() {
  const { id: idParam } = useParams();
  const id = idParam ? Number(idParam) : null;
  const isEdit = id !== null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: adminKeys.exercise(id ?? 0),
    queryFn: () => getAdminExercise(id!),
    enabled: isEdit && Number.isInteger(id) && id! > 0,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (existing.data) reset(toForm(existing.data));
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input: ExerciseInput = { ...values, videoUrl: values.videoUrl || null };
      return isEdit ? updateExercise(id!, input) : createExercise(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      navigate('/admin/egzersizler');
    },
    onError: (err) => {
      const fields = err instanceof ApiError ? err.fieldErrors() : {};
      const known = Object.keys(EMPTY);
      let mapped = false;
      for (const [field, message] of Object.entries(fields)) {
        if (known.includes(field)) {
          setError(field as keyof FormValues, { message });
          mapped = true;
        }
      }
      if (!mapped) setServerError(errorMessage(err));
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    await save.mutateAsync(values).catch(() => undefined);
  });

  const title = isEdit ? 'Egzersizi düzenle' : 'Yeni egzersiz';

  if (isEdit && (!Number.isInteger(id) || id! <= 0)) return <ErrorState error={new Error('Geçersiz egzersiz numarası')} />;

  return (
    <>
      <PageHeader
        title={title}
        description={existing.data ? existing.data.title : 'Yeni egzersiz onaysız olarak kaydedilir.'}
        actions={
          <Link to="/admin/egzersizler" className="btn btn-secondary">
            ← Listeye dön
          </Link>
        }
      />
      <AdminNav />

      {isEdit && existing.isPending && <LoadingState label="Egzersiz yükleniyor…" />}
      {isEdit && existing.isError && <ErrorState error={existing.error} onRetry={() => existing.refetch()} />}

      {(!isEdit || existing.data) && (
        <form className="stack-lg" onSubmit={onSubmit} noValidate>
          {isEdit && (
            <Alert tone="warning" title="Onay düşecek">
              Kaydettiğinizde bu egzersizin onayı kaldırılır; uzman yeniden onaylayana kadar yeni planlara girmez.
            </Alert>
          )}
          {serverError && <Alert tone="danger">{serverError}</Alert>}

          <Card as="section">
            <div className="stack">
              <h2>Temel bilgiler</h2>
              <Field label="Başlık" error={errors.title?.message}>
                <input className="input" {...register('title')} />
              </Field>
              <Field label="Açıklama ve adımlar" hint="Kullanıcıya gösterilecek adım adım anlatım" error={errors.description?.message}>
                <textarea className="textarea" rows={6} {...register('description')} />
              </Field>
              <Field label="Video adresi (isteğe bağlı)" hint="https:// ile başlayan bağlantı" error={errors.videoUrl?.message}>
                <input className="input" type="url" inputMode="url" {...register('videoUrl')} />
              </Field>
              <Field label="Zorluk" error={errors.difficulty?.message}>
                <select className="select" {...register('difficulty')}>
                  {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card as="section">
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend>
                <h2>Bölgeler</h2>
              </legend>
              <div className="region-picks">
                {REGION_CODES.map((code) => (
                  <label key={code} className="check">
                    <input type="checkbox" value={code} {...register('regionCodes')} />
                    <span>{REGION_LABELS[code]}</span>
                  </label>
                ))}
              </div>
              {errors.regionCodes && (
                <span className="error small" role="alert" style={{ color: 'var(--danger)' }}>
                  {errors.regionCodes.message}
                </span>
              )}
            </fieldset>
          </Card>

          <Card as="section">
            <div className="stack">
              <h2>Güvenli sınırlar</h2>
              <p className="muted mb-0">Plan üretici bu aralıkların dışına çıkamaz (klinik doğrulama).</p>
              <div className="range-grid">
                <Field label="Set (en az)" error={errors.setsMin?.message}>
                  <input className="input" type="number" inputMode="numeric" {...register('setsMin', { valueAsNumber: true })} />
                </Field>
                <Field label="Set (en fazla)" error={errors.setsMax?.message}>
                  <input className="input" type="number" inputMode="numeric" {...register('setsMax', { valueAsNumber: true })} />
                </Field>
                <Field label="Tekrar (en az)" error={errors.repsMin?.message}>
                  <input className="input" type="number" inputMode="numeric" {...register('repsMin', { valueAsNumber: true })} />
                </Field>
                <Field label="Tekrar (en fazla)" error={errors.repsMax?.message}>
                  <input className="input" type="number" inputMode="numeric" {...register('repsMax', { valueAsNumber: true })} />
                </Field>
                <Field label="Süre sn (en az)" error={errors.durationMin?.message}>
                  <input className="input" type="number" inputMode="numeric" {...register('durationMin', { valueAsNumber: true })} />
                </Field>
                <Field label="Süre sn (en fazla)" error={errors.durationMax?.message}>
                  <input className="input" type="number" inputMode="numeric" {...register('durationMax', { valueAsNumber: true })} />
                </Field>
              </div>
            </div>
          </Card>

          <Card as="section">
            <div className="stack-sm">
              <h2>Kontrendikasyonlar</h2>
              <p className="muted">
                Bu durumlardan birine sahip kullanıcıya egzersiz önerilmez. Kodlar ankette işaretlenen durumlarla eşleşir.
              </p>
              <label htmlFor="contra-input" className="sr-only">
                Kontrendikasyon kodu ekle
              </label>
              <Controller
                control={control}
                name="contraindications"
                render={({ field }) => <ChipInput id="contra-input" value={field.value} onChange={field.onChange} />}
              />
            </div>
          </Card>

          <div className="row">
            <Button type="submit" loading={isSubmitting || save.isPending}>
              {isEdit ? 'Değişiklikleri kaydet' : 'Egzersizi ekle'}
            </Button>
            <Link to="/admin/egzersizler" className="btn btn-ghost">
              Vazgeç
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
