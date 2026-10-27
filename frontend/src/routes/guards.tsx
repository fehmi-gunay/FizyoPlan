import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingState } from '../components/ui';
import { useAuth } from '../context/useAuth';
import type { Role } from '../types/api';

// Giriş yapmamış kullanıcıyı /giris'e yollar, döndükten sonra geldiği sayfaya geri götürür.
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingState label="Oturum kontrol ediliyor…" />;
  if (!user) return <Navigate to="/giris" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Giriş yapmış kullanıcı giriş/kayıt sayfasını görmesin
export function GuestOnly() {
  const { user, status } = useAuth();
  if (status === 'loading') return <LoadingState label="Oturum kontrol ediliyor…" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
