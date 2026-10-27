import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ApiError, errorMessage } from '../api/client';
import { getExercise, getPlan, qk, sendFeedback } from '../api/endpoints';
import { RatingSlider } from '../components/plans/RatingSlider';
import { HoldTimer, SetCounter } from '../components/plans/Timer';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_THRESHOLD,
  PAIN_THRESHOLD,
  REGION_LABELS,
  formatDate,
  formatDuration,
} from '../lib/labels';
import { CONDITION_OPTIONS } from '../lib/survey';
import type { FeedbackResult } from '../types/api';
import '../styles/plans.css';

// Kontrendikasyon kodunu ankette gösterilen Türkçe karşılığına çevirir ("akut_bel_fitigi" → "Akut bel fıtığı")
function conditionLabel(code: string): string {
  return CONDITION_OPTIONS.find((o) => o.code === code)?.label ?? code.replaceAll('_', ' ');
}

function painText(v: number) {
  if (v === 0) return 'ağrı yok';
  if (v <= 3) return 'hafif ağrı';
  if (v <= 6) return 'orta ağrı';
  return 'şiddetli ağrı';
}
function difficultyText(v: number) {
  if (v <= 3) return 'çok kolay';
  if (v <= 6) return 'orta';
  if (v <= 8) return 'zor';
  return 'çok zor';
}

function toEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function Video({ url, title }: { url: string | null; title: string }) {
  if (!url) {
    return (
      <div className="video-frame">
        <div className="video-placeholder">
          <div>
            <div style={{ fontSize: '2rem' }} aria-hidden="true">
              🎬
            </div>
            <p className="mb-0">Bu egzersizin videosu hazırlanıyor. Lütfen aşağıdaki adımları takip edin.</p>
          </div>
        </div>
      </div>
    );
  }
  const embed = toEmbed(url);
  return (
    <div className="video-frame">
      {embed ? (
        <iframe src={embed} title={`${title} – egzersiz videosu`} allow="encrypted-media; picture-in-picture" allowFullScreen />
      ) : (
        <video controls preload="metadata" aria-label={`${title} – egzersiz videosu`}>
          <source src={url} />
          Tarayıcınız video oynatmayı desteklemiyor. <a href={url}>Videoyu indirin</a>.
        </video>
      )}
    </div>
  );
}

function splitSteps(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ExerciseDetailPage() {
  const exerciseId = Number(useParams().exerciseId);
  const [params] = useSearchParams();
  const itemId = Number(params.get('kalem')) || null;
  const planId = Number(params.get('plan')) || null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const exercise = useQuery({ queryKey: qk.exercise(exerciseId), queryFn: () => getExercise(exerciseId), enabled: exerciseId > 0 });
  const plan = useQuery({ queryKey: qk.plan(planId ?? 0), queryFn: () => getPlan(planId!), enabled: !!planId && !!itemId });
  const item = plan.data?.items.find((i) => i.id === itemId) ?? null;

  const [showForm, setShowForm] = useState(false);
  const [pain, setPain] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [result, setResult] = useState<FeedbackResult | null>(null);
  // Bugünün başlangıcı sayfa açılışında bir kez hesaplanır (render saf kalsın)
  const [startOfToday] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const feedback = useMutation({
    mutationFn: () => sendFeedback(itemId!, { pain, difficulty }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: qk.plans });
      if (res.suspended && planId) {
        navigate(`/askida/${planId}`, { replace: true });
        return;
      }
      setResult(res);
      setShowForm(false);
    },
  });

  if (!(exerciseId > 0)) return <EmptyState title="Egzersiz bulunamadı" />;
  if (exercise.isPending) return <LoadingState />;
  if (exercise.isError) {
    if (exercise.error instanceof ApiError && exercise.error.status === 404) {
      return <EmptyState title="Egzersiz bulunamadı" description="Bu egzersiz artık kütüphanede yer almıyor olabilir." />;
    }
    return <ErrorState error={exercise.error} onRetry={() => exercise.refetch()} />;
  }

  const e = exercise.data;
  const steps = splitSteps(e.description);
  const todayFeedback = item?.feedback?.filter((f) => new Date(f.createdAt) >= startOfToday) ?? [];
  const lastToday = todayFeedback.at(-1);
  const canGiveFeedback = !!item && plan.data?.status === 'active';

  return (
    <div className="stack-lg">
      <div>
        <Link to={planId ? `/planlar/${planId}` : '/'} className="btn btn-ghost btn-sm">
          ← {planId ? 'Plana dön' : 'Ana sayfa'}
        </Link>
      </div>
      <PageHeader
        title={e.title}
        description={
          <span className="row" style={{ gap: 'var(--space-2)' }}>
            <Badge tone="primary">{DIFFICULTY_LABELS[e.difficulty]}</Badge>
            {e.regions.map((r) => (
              <Badge key={r.id}>{REGION_LABELS[r.code] ?? r.name}</Badge>
            ))}
          </span>
        }
      />

      <Video url={e.videoUrl} title={e.title} />

      <div className="grid-2">
        <Card>
          <h2>Nasıl yapılır?</h2>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <Alert tone="warning">
            Keskin ağrı, uyuşma, karıncalanma veya baş dönmesi hissederseniz egzersizi hemen bırakın.
          </Alert>
        </Card>

        <Card>
          <h2>{item ? 'Bugünkü hedefiniz' : 'Önerilen aralık'}</h2>
          {plan.isPending && itemId ? (
            <LoadingState />
          ) : item ? (
            <div className="stack">
              <p className="mb-0" style={{ fontSize: '1.15rem' }}>
                <strong>{item.sets} set</strong> × <strong>{item.reps} tekrar</strong> · her tekrarda{' '}
                <strong>{formatDuration(item.durationSec)}</strong> tutma
              </p>
              <SetCounter total={item.sets} />
              <HoldTimer seconds={item.durationSec} />
            </div>
          ) : (
            <ul>
              <li>
                {e.setsMin}–{e.setsMax} set
              </li>
              <li>
                {e.repsMin}–{e.repsMax} tekrar
              </li>
              <li>
                {formatDuration(e.durationMin)} – {formatDuration(e.durationMax)} tutma
              </li>
            </ul>
          )}
          {e.contraindications.length > 0 && (
            <p className="muted small mb-0" style={{ marginTop: 'var(--space-4)' }}>
              Şu durumlarda önerilmez: {e.contraindications.map((c) => conditionLabel(c.condition)).join(', ')}
            </p>
          )}
        </Card>
      </div>

      {item && !canGiveFeedback && plan.data && (
        <Alert tone="info">Geri bildirim yalnızca aktif plandaki egzersizler için verilebilir.</Alert>
      )}

      {canGiveFeedback && (
        <Card as="section">
          <h2>Nasıl hissettiniz?</h2>
          {result && (
            <div className="stack" style={{ marginBottom: 'var(--space-4)' }}>
              <Alert tone="success" title="Teşekkürler!">
                {result.message}
              </Alert>
              <div>
                <Link to="/" className="btn btn-primary">
                  Bugüne dön
                </Link>
              </div>
            </div>
          )}
          {!result && lastToday && !showForm && (
            <Alert tone="success">
              Bugün bu egzersiz için bildirim verdiniz ({formatDate(lastToday.createdAt, true)}): ağrı {lastToday.pain}/10, zorluk{' '}
              {lastToday.difficulty}/10.
            </Alert>
          )}

          {!showForm ? (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button variant={lastToday || result ? 'secondary' : 'primary'} onClick={() => setShowForm(true)}>
                {lastToday || result ? 'Yeniden bildir' : 'Tamamladım – bildir'}
              </Button>
            </div>
          ) : (
            <form
              className="stack"
              onSubmit={(ev) => {
                ev.preventDefault();
                feedback.mutate();
              }}
            >
              <p className="muted mb-0">Egzersizden sonra hissettiklerinizi işaretleyin.</p>
              <RatingSlider
                label="Ağrı düzeyi"
                value={pain}
                onChange={setPain}
                min={0}
                max={10}
                lowLabel="Ağrı yok"
                highLabel="Dayanılmaz"
                threshold={PAIN_THRESHOLD}
                describe={painText}
              />
              <RatingSlider
                label="Zorluk düzeyi"
                value={difficulty}
                onChange={setDifficulty}
                min={1}
                max={10}
                lowLabel="Çok kolay"
                highLabel="Yapamadım"
                threshold={DIFFICULTY_THRESHOLD}
                describe={difficultyText}
              />
              {feedback.isError && <Alert tone="danger">{errorMessage(feedback.error)}</Alert>}
              <div className="row">
                <Button type="submit" loading={feedback.isPending}>
                  Gönder
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Vazgeç
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
