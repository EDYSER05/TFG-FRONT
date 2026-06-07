import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';

// Guard que protege rutas privadas: redirige al login si no hay sesión válida
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  let user = null;
  if (token && storedUser) {
    // Intentamos parsear el usuario, si falla redirigimos al login
    try { user = JSON.parse(storedUser); } catch { /* redirige a login */ }
  }

  const isAdmin = user?.role?.name === 'admin';

  // El admin tiene su propio panel Blade en /admin, usamos window.location para redirigir a su login
  useEffect(() => {
    if (isAdmin) window.location.href = '/admin';
  }, []);

  if (!token || !storedUser || !user) return <Navigate to="/login" replace />;
  if (isAdmin) return null;

  // Si el admin marcó must_change_password, bloqueamos el acceso hasta que cambie la contraseña
  if (user.must_change_password) return <Navigate to="/cambiar-contrasena" replace />;

  if (allowedRoles) {
    const role = user.role ? user.role.name : '';
    // Si el rol no tiene acceso a esta ruta, mandamos al dashboard en lugar de al login
    if (!role || !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
