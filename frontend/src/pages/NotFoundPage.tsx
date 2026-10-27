import { Link } from 'react-router';
import { EmptyState } from '../components/ui';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Sayfa bulunamadı"
      description="Aradığınız sayfa taşınmış veya hiç var olmamış olabilir."
      action={
        <Link to="/" className="btn btn-primary">
          Ana sayfaya dön
        </Link>
      }
    />
  );
}
