import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { errorMessage } from '../api/client';

// Ortak arayüz bileşenleri. Stiller: styles/global.css

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  size,
  block,
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm';
  block?: boolean;
  loading?: boolean;
}) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? 'Lütfen bekleyin…' : children}
    </button>
  );
}

export function Card({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header row-between">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export function Alert({ tone = 'info', title, children }: { tone?: AlertTone; title?: string; children?: ReactNode }) {
  // Hata ve uyarılar ekran okuyucuya hemen duyurulur
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';
  return (
    <div className={`alert alert-${tone}`} role={role}>
      {title && <div className="alert-title">{title}</div>}
      {children}
    </div>
  );
}

export function Badge({ tone, children }: { tone?: 'primary' | 'success' | 'warning' | 'danger'; children: ReactNode }) {
  return <span className={`badge${tone ? ` badge-${tone}` : ''}`}>{children}</span>;
}

export function Spinner({ label = 'Yükleniyor' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function LoadingState({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="state">
      <Spinner label={label} />
      <p className="mb-0">{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <h3 className="mb-0">Bir sorun oluştu</h3>
      <p className="mb-0">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tekrar dene
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <h3 className="mb-0">{title}</h3>
      {description && <p className="mb-0">{description}</p>}
      {action}
    </div>
  );
}
