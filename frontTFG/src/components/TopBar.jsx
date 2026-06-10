import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdNotifications } from 'react-icons/md';
import api from '../api';

export default function TopBar({ title }) {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

  // Leemos el usuario desde localStorage para saber a quién pertenecen las notificaciones
  const userId = JSON.parse(localStorage.getItem('user') || 'null')?.id;

  const fetchNotifications = () => {
    if (!userId) return;
    api.get(`/notifications?user_id=${userId}`)
      .then((res) => setNotifications(res.data.data ?? []))
      .catch(() => {});
  };

  // Cargamos al montar y refrescamos cada 10s
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000);
    return () => clearInterval(timer);
  }, [userId]);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <button
        onClick={() => navigate('/notificaciones')}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <MdNotifications size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}
