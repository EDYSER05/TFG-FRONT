import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdNotifications, MdDoneAll, MdCircle } from 'react-icons/md';
import api from '../api';

function formatDateTime(dt) {
  if (!dt) return '—';
  try {
    const [datePart, timePart = '00:00:00'] = dt.split(' ');
    const [day, month, year] = datePart.split('-');
    const date = new Date(`${year}-${month}-${day}T${timePart}`);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function Notifications() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role?.name ?? '';
  const isManagement = ['admin', 'owner', 'manager', 'hr'].includes(role);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/notifications?user_id=${user.id}`);
        setNotifications(res.data.data ?? []);
      } catch {
        // Si falla la carga dejamos la lista vacía
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
    
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch {
      // Si falla el usuario puede intentarlo de nuevo
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await api.post('/notifications/read-all', { user_id: user.id });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch {
      // Si falla el usuario puede intentarlo de nuevo
    }
  };

  // Determina a qué página redirige al hacer clic en una notificación según su tipo y rol
  const getDestination = (n) => {
    if (n.type === 'issue') return isManagement ? '/fichajes-gestion' : '/fichajes';
    if (n.type === 'absence') return isManagement ? '/ausencias-gestion' : '/ausencias';
    if (n.type === 'reminder') return '/fichajes';
    if (n.type === 'message') {
      // Para notificaciones genéricas intentamos inferir la sección por palabras clave del mensaje
      const msg = n.message.toLowerCase();
      if (msg.includes('incidencia') || msg.includes('fichaje')) return isManagement ? '/fichajes-gestion' : '/fichajes';
      if (msg.includes('ausencia') || msg.includes('vacacion') || msg.includes('solicitud')) return isManagement ? '/ausencias-gestion' : '/ausencias';
      return '/dashboard';
    }
    return null;
  };

  const handleClick = async (n) => {
    if (!n.is_read) await markAsRead(n.id);
    const dest = getDestination(n);
    if (dest) navigate(dest);
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{unread > 0 ? `${unread} sin leer` : 'Todo leído'}</p>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            <MdDoneAll size={16} /> Marcar todo como leído
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <MdNotifications size={40} />
            <p className="mt-2 text-sm">Sin notificaciones</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isClickable = !!getDestination(n);
            return (
              <div
                key={n.id}
                onClick={() => isClickable && handleClick(n)}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.is_read ? 'bg-indigo-50/50' : ''} ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                <div className="mt-1 shrink-0">
                  {!n.is_read
                    ? <MdCircle size={8} className="text-indigo-600" />
                    : <div className="w-2 h-2 rounded-full bg-gray-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition shrink-0"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
