import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../context/useAuth';
import { usePreferences } from '../context/usePreferences';
import { Button } from './ui';

export const DISCLAIMER = 'Bu uygulama tanı koymaz, muayenenin yerini almaz. Şikâyetiniz artarsa egzersizi bırakıp bir uzmana başvurun.';

function FontControls() {
  const { increaseFont, decreaseFont } = usePreferences();
  return (
    <div className="row" style={{ gap: 4 }} role="group" aria-label="Yazı boyutu">
      <Button variant="ghost" size="sm" className="icon-btn" onClick={decreaseFont} aria-label="Yazıyı küçült">
        A−
      </Button>
      <Button variant="ghost" size="sm" className="icon-btn" onClick={increaseFont} aria-label="Yazıyı büyüt">
        A+
      </Button>
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'physio';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        İçeriğe atla
      </a>
      <header className="app-header">
        <div className="container">
          <Link to="/" className="brand" aria-label="FizyoPlan ana sayfa">
            <span className="brand-mark" aria-hidden="true">
              F
            </span>
            FizyoPlan
          </Link>
          {user && (
            <nav className="nav" aria-label="Ana menü">
              <NavLink to="/" end>
                Bugün
              </NavLink>
              <NavLink to="/planlar">Planlarım</NavLink>
              <NavLink to="/anket">Sağlık Anketi</NavLink>
              <NavLink to="/profil">Profil</NavLink>
              {isStaff && <NavLink to="/admin">Yönetim</NavLink>}
            </nav>
          )}
          <div className="header-tools">
            <FontControls />
            {user ? (
              <Button variant="secondary" size="sm" onClick={logout}>
                Çıkış
              </Button>
            ) : (
              <Link to="/giris" className="btn btn-secondary btn-sm">
                Giriş
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="disclaimer" role="note">
        <div className="container">⚠️ {DISCLAIMER}</div>
      </div>

      <main id="main" className="app-main" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="app-footer">
        <div className="container row-between">
          <span>FizyoPlan · TÜBİTAK 2209-A araştırma prototipi</span>
          <span>Acil durumda 112'yi arayın.</span>
        </div>
      </footer>
    </div>
  );
}
