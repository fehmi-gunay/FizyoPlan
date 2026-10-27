import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { LoadingState } from './components/ui';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { GuestOnly, RequireAuth } from './routes/guards';

// Sayfalar ihtiyaç anında yüklenir (ilk açılış hızlı kalsın; admin paneli normal kullanıcıya hiç inmez)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SurveyPage = lazy(() => import('./pages/SurveyPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const PlanDetailPage = lazy(() => import('./pages/PlanDetailPage'));
const ExerciseDetailPage = lazy(() => import('./pages/ExerciseDetailPage'));
const SuspendedPage = lazy(() => import('./pages/SuspendedPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminExercisesPage = lazy(() => import('./pages/admin/AdminExercisesPage'));
const AdminExerciseFormPage = lazy(() => import('./pages/admin/AdminExerciseFormPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'));

export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route element={<Layout />}>
          <Route element={<GuestOnly />}>
            <Route path="giris" element={<LoginPage />} />
            <Route path="kayit" element={<RegisterPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route index element={<DashboardPage />} />
            <Route path="anket" element={<SurveyPage />} />
            <Route path="yonlendirme" element={<ReferralPage />} />
            <Route path="planlar" element={<PlansPage />} />
            <Route path="planlar/:id" element={<PlanDetailPage />} />
            <Route path="egzersiz/:exerciseId" element={<ExerciseDetailPage />} />
            <Route path="askida/:planId" element={<SuspendedPage />} />
            <Route path="profil" element={<ProfilePage />} />
          </Route>

          <Route path="admin" element={<RequireAuth roles={['admin', 'physio']} />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="egzersizler" element={<AdminExercisesPage />} />
            <Route path="egzersizler/yeni" element={<AdminExerciseFormPage />} />
            <Route path="egzersizler/:id" element={<AdminExerciseFormPage />} />
            <Route element={<RequireAuth roles={['admin']} />}>
              <Route path="kullanicilar" element={<AdminUsersPage />} />
              <Route path="kayitlar" element={<AdminActivityPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
