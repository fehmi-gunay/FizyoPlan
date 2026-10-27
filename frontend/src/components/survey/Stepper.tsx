// Anket adım göstergesi. Geçerli adım aria-current="step" ile işaretlenir.
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Anket adımları">
      <ol className="stepper">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li key={s} className={`step step-${state}`} aria-current={i === current ? 'step' : undefined}>
              <span className="step-dot" aria-hidden="true">
                {i < current ? '✓' : i + 1}
              </span>
              <span className="step-label">
                {s}
                {state === 'done' && <span className="sr-only"> (tamamlandı)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
