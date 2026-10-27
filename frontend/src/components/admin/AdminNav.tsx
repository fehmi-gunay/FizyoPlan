import { NavLink } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

// Yönetim sayfalarının alt menüsü. Kullanıcılar ve kayıtlar yalnızca admin rolüne açık.
export function AdminNav() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="admin-nav" aria-label="Yönetim menüsü">
      <NavLink to="/admin" end>
        Genel bakış
      </NavLink>
      <NavLink to="/admin/egzersizler">Egzersizler</NavLink>
      {isAdmin && <NavLink to="/admin/kullanicilar">Kullanıcılar</NavLink>}
      {isAdmin && <NavLink to="/admin/kayitlar">Giriş kayıtları</NavLink>}
    </nav>
  );
}
