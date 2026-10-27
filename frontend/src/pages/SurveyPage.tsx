import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ApiError, errorMessage } from '../api/client';
import { getProfile, qk, saveProfile } from '../api/endpoints';
import { useGeneratePlan } from '../api/hooks';
import { Field } from '../components/form';
import { BodyMap } from '../components/survey/BodyMap';
import { PainSlider } from '../components/survey/PainSlider';
import { Stepper } from '../components/survey/Stepper';
import { Alert, Button, Card, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { ACTIVITY_LABELS, RED_FLAG_QUESTIONS, REGION_LABELS } from '../lib/labels';
import { ageFrom, bmi, CONDITION_OPTIONS, MIN_AGE, painInfo, safeReturnPath } from '../lib/survey';
import type { ActivityLevel, Profile, ProfileInput, RegionCode } from '../types/api';
import '../styles/survey.css';

const STEPS = ['Kişisel bilgiler', 'Aktivite', 'Ağrı bölgeleri', 'Sağlık soruları', 'Özet'];
const REGION_CODES = Object.keys(REGION_LABELS) as RegionCode[];
const ACTIVITY_CODES = Object.keys(ACTIVITY_LABELS) as ActivityLevel[];
const CONDITION_CODES = CONDITION_OPTIONS.map((c) => c.code);

const schema = z.object({
  birthDate: z
    .string()
    .min(1, 'Doğum tarihinizi girin')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Geçerli bir tarih girin')
    .refine((v) => ageFrom(v) >= MIN_AGE, `Bu uygulama ${MIN_AGE} yaş ve üzeri içindir`)
    .refine((v) => ageFrom(v) <= 120, 'Geçerli bir doğum tarihi girin'),
  heightCm: z.number({ error: 'Boyunuzu girin' }).int('Tam sayı girin').min(100, 'En az 100 cm').max(250, 'En fazla 250 cm'),
  weightKg: z.number({ error: 'Kilonuzu girin' }).min(30, 'En az 30 kg').max(300, 'En fazla 300 kg'),
  activityLevel: z.enum(ACTIVITY_CODES as [ActivityLevel, ...ActivityLevel[]], { error: 'Bir aktivite düzeyi seçin' }),
  painRegions: z
    .array(z.object({ regionCode: z.enum(REGION_CODES as [RegionCode, ...RegionCode[]]), severity: z.number().int().min(0).max(10) }))
    .min(1, 'En az bir ağrı bölgesi seçin')
    .refine((arr) => arr.some((p) => p.severity > 0), 'Seçtiğiniz bölgelerden en az birinde ağrı şiddeti 0’dan büyük olmalı'),
  redFlagAnswers: z
    .record(z.string(), z.enum(['yes', 'no']).optional())
    .refine((a) => RED_FLAG_QUESTIONS.every((q) => a[q.code]), 'Lütfen tüm soruları yanıtlayın'),
  conditions: z.array(z.string()),
});

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const STEP_FIELDS: FieldPath<FormIn>[][] = [
  ['birthDate', 'heightCm', 'weightKg'],
  ['activityLevel'],
  ['painRegions'],
  ['redFlagAnswers', 'conditions'],
  [],
];

function toDefaults(p: Profile | null): Partial<FormIn> {
  if (!p) return { painRegions: [], redFlagAnswers: {}, conditions: [] };
  return {
    birthDate: p.birthDate,
    heightCm: p.heightCm,
    weightKg: Number(p.weightKg),
    activityLevel: p.activityLevel,
    painRegions: p.painRegions,
    redFlagAnswers: Object.fromEntries(RED_FLAG_QUESTIONS.map((q) => [q.code, p.redFlags.includes(q.code) ? 'yes' : 'no'])),
    conditions: p.conditions.filter((c) => CONDITION_CODES.includes(c)),
  };
}

export default function SurveyPage() {
  const profileQuery = useQuery({ queryKey: qk.profile, queryFn: getProfile });

  if (profileQuery.isPending) return <LoadingState label="Anket yükleniyor…" />;
  if (profileQuery.isError) return <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} />;
  return <SurveyForm profile={profileQuery.data} />;
}

function SurveyForm({ profile }: { profile: Profile | null }) {
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const returnPath = safeReturnPath(params.get('donus'));
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  // Doğum tarihi en fazla bugün olabilir (yerel tarih; toISOString UTC'ye göre bir gün geride kalabilir)
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'));

  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema), defaultValues: toDefaults(profile), mode: 'onTouched' });

  const save = useMutation({
    mutationFn: (input: ProfileInput) => saveProfile(input),
    onSuccess: (p) => {
      queryClient.setQueryData(qk.profile, p);
      queryClient.invalidateQueries({ queryKey: qk.profile });
      setSaved(true);
    },
  });

  // Adım değişince başlığa odaklan (ekran okuyucu ve klavye kullanıcıları için)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, saved]);

  const next = async () => {
    if (await trigger(STEP_FIELDS[step], { shouldFocus: true })) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = handleSubmit((v) => {
    // Listede olmayan, daha önce kayıtlı tanılar korunur
    const extra = profile?.conditions.filter((c) => !CONDITION_CODES.includes(c)) ?? [];
    save.mutate({
      birthDate: v.birthDate,
      heightCm: v.heightCm,
      weightKg: v.weightKg,
      activityLevel: v.activityLevel,
      painRegions: v.painRegions,
      redFlags: RED_FLAG_QUESTIONS.filter((q) => v.redFlagAnswers[q.code] === 'yes').map((q) => q.code),
      conditions: [...new Set([...v.conditions, ...extra])],
    });
  });

  const values = useWatch({ control }) as FormIn;
  const hasRedFlag = RED_FLAG_QUESTIONS.some((q) => values.redFlagAnswers?.[q.code] === 'yes');

  if (saved) return <SavedScreen returnPath={returnPath} hasRedFlag={hasRedFlag} headingRef={headingRef} />;

  const painError =
    (errors.painRegions as { message?: string } | undefined)?.message ?? errors.painRegions?.root?.message;
  const redFlagError =
    (errors.redFlagAnswers as { message?: string } | undefined)?.message ?? errors.redFlagAnswers?.root?.message;

  return (
    <div className="survey stack">
      <PageHeader
        title="Sağlık Anketi"
        description="Size uygun ve güvenli bir egzersiz planı için birkaç soru. Yaklaşık 3 dakika sürer."
      />
      <Stepper steps={STEPS} current={step} />

      <Card>
        <form
          className="stack"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === STEPS.length - 1) onSubmit(e);
            else next();
          }}
        >
          <h2 ref={headingRef} tabIndex={-1} className="step-title">
            {step + 1}. {STEPS[step]}
          </h2>

          {step === 0 && (
            <div className="stack">
              <Field label="Doğum tarihi" hint={`${MIN_AGE} yaş ve üzeri`} error={errors.birthDate?.message}>
                <input className="input" type="date" max={today} {...register('birthDate')} />
              </Field>
              <div className="grid-2">
                <Field label="Boy (cm)" error={errors.heightCm?.message}>
                  <input className="input" type="number" inputMode="numeric" min={100} max={250} {...register('heightCm', { valueAsNumber: true })} />
                </Field>
                <Field label="Kilo (kg)" error={errors.weightKg?.message}>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={30}
                    max={300}
                    {...register('weightKg', { valueAsNumber: true })}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <fieldset className="plain-fieldset">
              <legend className="label">Günlük aktivite düzeyiniz nedir?</legend>
              <div className="choice-grid">
                {ACTIVITY_CODES.map((code) => (
                  <label key={code} className="choice-card">
                    <input type="radio" value={code} {...register('activityLevel')} />
                    <span className="choice-title">{ACTIVITY_LABELS[code].label}</span>
                    <span className="choice-hint">{ACTIVITY_LABELS[code].hint}</span>
                  </label>
                ))}
              </div>
              {errors.activityLevel && (
                <p className="field-error" role="alert">
                  {errors.activityLevel.message}
                </p>
              )}
            </fieldset>
          )}

          {step === 2 && (
            <Controller
              control={control}
              name="painRegions"
              render={({ field }) => {
                const list = field.value ?? [];
                const selected = list.map((p) => p.regionCode);
                const toggle = (code: RegionCode) =>
                  field.onChange(
                    selected.includes(code) ? list.filter((p) => p.regionCode !== code) : [...list, { regionCode: code, severity: 3 }],
                  );
                const setSeverity = (code: RegionCode, severity: number) =>
                  field.onChange(list.map((p) => (p.regionCode === code ? { ...p, severity } : p)));

                return (
                  <div className="pain-step">
                    <div className="pain-map">
                      <BodyMap selected={selected} onToggle={toggle} />
                      <p className="small muted center mb-0">Şemada ağrıyan bölgeye dokunun</p>
                    </div>
                    <div className="stack">
                      <fieldset className="plain-fieldset">
                        <legend className="label">Ağrınız hangi bölgelerde?</legend>
                        <div className="stack-sm">
                          {REGION_CODES.map((code) => (
                            <label key={code} className="check">
                              <input type="checkbox" checked={selected.includes(code)} onChange={() => toggle(code)} />
                              <span>{REGION_LABELS[code]}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      {list.map((p) => (
                        <PainSlider
                          key={p.regionCode}
                          label={REGION_LABELS[p.regionCode]}
                          value={p.severity}
                          onChange={(v) => setSeverity(p.regionCode, v)}
                        />
                      ))}
                      {painError && (
                        <p className="field-error" role="alert">
                          {painError}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          )}

          {step === 3 && (
            <div className="stack">
              <p className="muted mb-0">
                Bu sorular, egzersizin sizin için güvenli olup olmadığını anlamamıza yardımcı olur. Lütfen her birini yanıtlayın.
              </p>
              <ol className="flag-list">
                {RED_FLAG_QUESTIONS.map((q) => (
                  <li key={q.code}>
                    <fieldset className="flag-question">
                      <legend>{q.question}</legend>
                      <div className="yes-no">
                        <label className="check">
                          <input type="radio" value="yes" {...register(`redFlagAnswers.${q.code}`)} />
                          <span>Evet</span>
                        </label>
                        <label className="check">
                          <input type="radio" value="no" {...register(`redFlagAnswers.${q.code}`)} />
                          <span>Hayır</span>
                        </label>
                      </div>
                    </fieldset>
                  </li>
                ))}
              </ol>
              {redFlagError && (
                <p className="field-error" role="alert">
                  {redFlagError}
                </p>
              )}

              <fieldset className="plain-fieldset">
                <legend className="label">Doktorunuzun koyduğu bir tanı var mı? (isteğe bağlı)</legend>
                <p className="small muted">Varsa işaretleyin; size uygun olmayan egzersizler plandan çıkarılır.</p>
                <div className="stack-sm">
                  {CONDITION_OPTIONS.map((c) => (
                    <label key={c.code} className="check">
                      <input type="checkbox" value={c.code} {...register('conditions')} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 4 && <Summary values={values} hasRedFlag={hasRedFlag} />}

          {save.isError && (
            <Alert tone="danger" title="Kaydedilemedi">
              {save.error instanceof ApiError && Object.keys(save.error.fieldErrors()).length > 0
                ? Object.values(save.error.fieldErrors()).join(' · ')
                : errorMessage(save.error)}
            </Alert>
          )}

          <div className="row-between survey-actions">
            {step > 0 ? (
              <Button variant="secondary" onClick={back}>
                ← Geri
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button type="submit">İleri →</Button>
            ) : (
              <Button type="submit" loading={save.isPending}>
                Kaydet
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

function Summary({ values, hasRedFlag }: { values: FormIn; hasRedFlag: boolean }) {
  const age = values.birthDate ? ageFrom(values.birthDate) : null;
  const b = values.heightCm && values.weightKg ? bmi(values.heightCm, values.weightKg) : null;
  const flags = RED_FLAG_QUESTIONS.filter((q) => values.redFlagAnswers?.[q.code] === 'yes');
  const conditions = CONDITION_OPTIONS.filter((c) => values.conditions?.includes(c.code));

  return (
    <div className="stack">
      {hasRedFlag && (
        <Alert tone="warning" title="Uzman değerlendirmesi gerekecek">
          Bazı sorulara “Evet” yanıtı verdiniz. Güvenliğiniz için bu durumda egzersiz planı oluşturulmaz; sizi bir
          fizyoterapiste veya hekime yönlendireceğiz. Yanıtlarınızı yine de kaydedebilirsiniz.
          <ul>
            {flags.map((f) => (
              <li key={f.code}>{f.question}</li>
            ))}
          </ul>
        </Alert>
      )}
      <dl className="summary-list">
        <div>
          <dt>Yaş</dt>
          <dd>{age ?? '–'}</dd>
        </div>
        <div>
          <dt>Boy / Kilo</dt>
          <dd>
            {values.heightCm} cm · {values.weightKg} kg {b && <span className="muted">(VKİ {b})</span>}
          </dd>
        </div>
        <div>
          <dt>Aktivite</dt>
          <dd>{values.activityLevel ? ACTIVITY_LABELS[values.activityLevel].label : '–'}</dd>
        </div>
        <div>
          <dt>Ağrı bölgeleri</dt>
          <dd>
            {values.painRegions?.length
              ? values.painRegions.map((p) => `${REGION_LABELS[p.regionCode]} ${p.severity}/10 (${painInfo(p.severity).label})`).join(', ')
              : '–'}
          </dd>
        </div>
        <div>
          <dt>Tanılar</dt>
          <dd>{conditions.length ? conditions.map((c) => c.label).join(', ') : 'Yok'}</dd>
        </div>
        <div>
          <dt>Uyarı belirtileri</dt>
          <dd>{flags.length ? `${flags.length} soruya “Evet”` : 'Yok'}</dd>
        </div>
      </dl>
      <p className="small muted mb-0">Bilgileriniz yalnızca egzersiz planınızı oluşturmak için kullanılır.</p>
    </div>
  );
}

function SavedScreen({
  returnPath,
  hasRedFlag,
  headingRef,
}: {
  returnPath: string | null;
  hasRedFlag: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const generate = useGeneratePlan();
  const err = generate.error;

  return (
    <div className="survey stack">
      <Card>
        <div className="stack">
          <h1 ref={headingRef} tabIndex={-1} className="mb-0">
            ✓ Anketiniz kaydedildi
          </h1>
          {returnPath ? (
            <>
              <p className="mb-0">Bilgileriniz güncellendi. Askıya alınan planınızı şimdi yeniden değerlendirebilirsiniz.</p>
              <div className="row">
                <Link to={returnPath} className="btn btn-primary">
                  Plana geri dön
                </Link>
                <Link to="/" className="btn btn-secondary">
                  Ana sayfaya dön
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mb-0">
                {hasRedFlag
                  ? 'Yanıtlarınıza göre önce bir uzman değerlendirmesi gerekebilir. Devam ederseniz durumunuz kontrol edilir.'
                  : 'Şimdi size özel egzersiz planınızı oluşturabilirsiniz. Plan önce size gösterilir, onayladıktan sonra başlar.'}
              </p>
              {err && (
                <Alert tone="danger" title={err instanceof ApiError && err.status === 422 ? 'Plan oluşturulamadı' : 'Bir sorun oluştu'}>
                  {err instanceof ApiError && err.status === 422
                    ? `${err.message}. Ağrı bölgelerinizi veya bilgilerinizi kontrol edin; sorun sürerse bir fizyoterapiste danışın.`
                    : errorMessage(err)}
                </Alert>
              )}
              <div className="row">
                <Button onClick={() => generate.mutate('weekly')} loading={generate.isPending && generate.variables === 'weekly'} disabled={generate.isPending}>
                  Haftalık plan oluştur
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => generate.mutate('daily')}
                  loading={generate.isPending && generate.variables === 'daily'}
                  disabled={generate.isPending}
                >
                  Günlük plan oluştur
                </Button>
                <Link to="/" className="btn btn-ghost">
                  Ana sayfaya dön
                </Link>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
