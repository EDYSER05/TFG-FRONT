import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// Mapa de rutas a títulos para mostrar en la barra superior de la aplicación
const titles = {
  '/dashboard': 'Dashboard',
  '/horario': 'Mi Horario',
  '/fichajes': 'Fichajes',
  '/ausencias': 'Ausencias',
  '/notificaciones': 'Notificaciones',
  '/perfil': 'Perfil',
  '/departamento': 'Mi Departamento',
  '/equipo': 'Mi Equipo',
  '/usuarios': 'Usuarios',
  '/departamentos': 'Departamentos',
  '/turnos': 'Turnos',
  '/empresas': 'Empresas',
  '/festivos': 'Festivos',
};

// Layout principal: sidebar fijo a la izquierda + barra superior + área de contenido
export default function Layout() {
  const { pathname } = useLocation();
  // Fallback 'NexTime' para rutas no listadas en el mapa (ej: rutas dinámicas futuras)
  const title = titles[pathname] ?? 'NexTime';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 p-6 overflow-auto">
          {/* Renderiza la página hija que corresponda a la ruta activa */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
