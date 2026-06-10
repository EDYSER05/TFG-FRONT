import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MdDashboard, MdAccessTime, MdEventBusy, MdPeople, MdBusiness,
  MdApartment, MdSchedule, MdLogout, MdBeachAccess, MdHomeWork,
  MdContactSupport, MdWarning,
} from 'react-icons/md';
import api from '../api';

const personalItems = [
  { to: '/dashboard', icon: <MdDashboard size={19} />, label: 'Dashboard' },
  { to: '/fichajes', icon: <MdAccessTime size={19} />, label: 'Fichajes' },
  { to: '/ausencias', icon: <MdEventBusy size={19} />, label: 'Ausencias' },
  { to: '/departamento', icon: <MdHomeWork size={19} />, label: 'Mi Departamento', roles: ['employee', 'hr', 'manager'], requiresDept: true },
  { to: '/contactar-rrhh', icon: <MdContactSupport size={19} />, label: 'Contactar RRHH', roles: ['employee', 'manager'] },
  { to: '/contactar-rrhh', icon: <MdContactSupport size={19} />, label: 'Chat empleados', roles: ['hr'] },
];

const gestionItems = [
  { to: '/fichajes-gestion', icon: <MdAccessTime size={19} />, label: 'Fichajes', roles: ['admin', 'owner', 'manager', 'hr'] },
  { to: '/ausencias-gestion', icon: <MdWarning size={19} />, label: 'Ausencias', roles: ['admin', 'owner', 'manager', 'hr'] },
  { to: '/usuarios', icon: <MdPeople size={19} />, label: 'Usuarios', roles: ['admin'] },
  { to: '/departamentos', icon: <MdApartment size={19} />, label: 'Departamentos', roles: ['admin', 'owner', 'hr'] },
  { to: '/turnos', icon: <MdSchedule size={19} />, label: 'Turnos', roles: ['admin', 'owner', 'hr'] },
  { to: '/empresas', icon: <MdBusiness size={19} />, label: 'Empresas', roles: ['admin'] },
  { to: '/festivos', icon: <MdBeachAccess size={19} />, label: 'Festivos', roles: ['admin', 'owner', 'hr'] },
];

const roleLabels = {
  admin: 'Administrador', owner: 'Dueño', manager: 'Gerente',
  hr: 'Recursos Humanos', employee: 'Empleado',
};

function NavItem({ item, badge }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.role?.name ?? '';
  const iniciales = user ? user.name.charAt(0) + user.last_name.charAt(0) : '?';
  const deptId = user?.department?.id ?? null;

  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    // Leemos desde localStorage dentro del efecto para evitar dependencias externas al array vacío
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    const cId = localStorage.getItem('company_id');
    const r = u?.role?.name ?? '';

    if (!u || !cId) return;

    const isEmployee = ['employee', 'manager'].includes(r);
    const isHr = r === 'hr';
    if (!isEmployee && !isHr) return;

    const fetchUnread = () => {
      if (isEmployee) {
        api.get(`/chat-messages?employee_id=${u.id}&company_id=${cId}`)
          .then((res) => {
            const msgs = res.data.data ?? [];
            // sender_id !== u.id significa que el mensaje lo mandó RRHH, no el empleado
            setUnreadChat(msgs.filter((message) => !message.is_read && message.sender_id !== u.id).length);
          })
          .catch(() => {});
      } else {
        api.get(`/chat-messages?company_id=${cId}`)
          .then((res) => {
            const msgs = res.data.data ?? [];
            setUnreadChat(msgs.filter((message) => !message.is_read && message.sender_id === message.employee_id).length);
          })
          .catch(() => {});
      }
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 10000);
    return () => clearInterval(timer);
  }, []);

  const menuGestion = gestionItems.filter((item) => !item.roles || item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch {/**/}
    finally {
      // Limpiamos siempre aunque el endpoint falle para no dejar sesión huérfana
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('company_id');
      navigate('/login');
    }
  };

  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="px-5 py-5 border-b border-slate-700 shrink-0">
        <h1 className="text-white font-bold text-lg tracking-tight">NexTime</h1>
        <p className="text-slate-400 text-xs mt-0.5">Gestión de control horario</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
        {personalItems
          .filter((item) => {
            if (item.roles && !item.roles.includes(role)) return false;
            // requiresDept oculta "Mi Departamento" si el usuario no tiene departamento asignado
            if (item.requiresDept && !deptId) return false;
            return true;
          })
          .map((item) => (
            <NavItem
              key={item.to + item.label}
              item={item}
              badge={item.to === '/contactar-rrhh' && item.roles?.includes('employee') ? unreadChat : 0}
            />
          ))}

        {menuGestion.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestión</p>
            </div>
            {menuGestion.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700 shrink-0">
        <button
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate group-hover:text-indigo-300 transition-colors">
              {user.name} {user.last_name}
            </p>
            <p className="text-slate-400 text-xs truncate">{roleLabels[role]}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          <MdLogout size={19} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
