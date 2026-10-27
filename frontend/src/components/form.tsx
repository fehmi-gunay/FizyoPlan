import { useId, type ReactElement, type ReactNode } from 'react';
import { cloneElement } from 'react';

// Etiket + ipucu + hata mesajını erişilebilir şekilde input'a bağlar.
// Kullanım: <Field label="E-posta" error={errors.email?.message}><input className="input" {...register('email')} /></Field>
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactElement<Record<string, unknown>>;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      )}
      {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error && (
        <span className="error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
