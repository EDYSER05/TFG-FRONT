// Página de fichajes: fichar entrada/salida, historial y reportar incidencias
import { useEffect, useState } from 'react';
import { MdLogin, MdLogout, MdRefresh, MdWarning, MdClose, MdChevronLeft, MdChevronRight } from 'react-icons/md';

const PER_PAGE = 10;
import api from '../api';
import { getToday, getTodayISO, getNow, formatTime, calcDuration } from '../utils/dates';

// Modal para reportar una incidencia en un fichaje concreto
function IssueModal({ log, user, onClose }) {
  const [issueTypes, setIssueTypes] = useState([]);
  const [issueTypeId, setIssueTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Cargamos los tipos de incidencia al abrir el modal
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await api.get('/issue-types');
        setIssueTypes(res.data.data ?? []);
      } catch {
        // Si falla no bloqueamos el modal
      }
    };
    fetchTypes();
    
  }, []);

  // Función para enviar la incidencia a la API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueTypeId) { setError('Selecciona un tipo de incidencia'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/time-log-issues', {
        time_log_id: log.id,
        user_id: user?.id,
        issue_type_id: Number(issueTypeId),
        description: description || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.msg ?? 'Error al crear la incidencia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Abrir incidencia</h3>
            <p className="text-xs text-gray-400 mt-0.5">Fichaje del {log.date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
        </div>
        {done ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <MdWarning size={22} className="text-green-600" />
            </div>
            <p className="font-medium text-gray-800">Incidencia enviada</p>
            <p className="text-sm text-gray-500">El equipo de gestión revisará tu incidencia.</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de incidencia</label>
              <select value={issueTypeId} onChange={(e) => setIssueTypeId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar tipo</option>
                {issueTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Explica brevemente la incidencia..." />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
              <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                {submitting ? 'Enviando...' : 'Enviar incidencia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TimeLogs() {
  // Leemos el usuario desde localStorage
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [logs, setLogs] = useState([]);
  // Estado para controlar la carga y los errores de acción
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  // Estado para saber qué fichaje tiene abierto el modal de incidencias
  const [issueLog, setIssueLog] = useState(null);
  const [page, setPage] = useState(1);

  // Cargamos los fichajes del usuario al montar el componente
  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/time-logs?user_id=${user.id}`);
        setLogs(res.data.data ?? []);
      } catch {
        // Si falla la carga dejamos la lista vacía
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    
  }, []);

  // Buscamos el fichaje de hoy para mostrar el estado actual
  const todayLog = logs.find((l) => l.date === getToday()) ?? null;

  const totalPages = Math.ceil(logs.length / PER_PAGE);
  const paginatedLogs = logs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Función para refrescar la lista de fichajes manualmente
  const refresh = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const res = await api.get(`/time-logs?user_id=${user.id}`);
      setLogs(res.data.data ?? []);
    } catch {
      // Si falla el refresco no mostramos error
    } finally {
      setActionLoading(false);
    }
  };

  // Función para registrar la entrada del empleado
  const handleCheckIn = async () => {
    if (!user) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post('/time-logs', {
        user_id: user.id,
        date: getTodayISO(),
        check_in: getNow(),
      });
      setLogs((prev) => [res.data.data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.msg ?? 'Error al fichar entrada');
    } finally {
      setActionLoading(false);
    }
  };

  // Función para registrar la salida del empleado
  const handleCheckOut = async () => {
    if (!todayLog) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.patch(`/time-logs/${todayLog.id}`, { check_out: getNow() });
      setLogs((prev) => prev.map((l) => l.id === todayLog.id ? res.data.data : l));
    } catch (err) {
      setError(err.response?.data?.msg ?? 'Error al fichar salida');
    } finally {
      setActionLoading(false);
    }
  };

  // Determinamos qué botones mostrar según el estado del fichaje de hoy
  const canCheckIn = !todayLog;
  const canCheckOut = !!(todayLog && !todayLog.check_out);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {issueLog && <IssueModal log={issueLog} user={user} onClose={() => setIssueLog(null)} />}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Control horario — Hoy</h3>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-36 bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Entrada</p>
            <p className="text-2xl font-bold text-gray-800">{formatTime(todayLog?.check_in)}</p>
          </div>
          <div className="flex-1 min-w-36 bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Salida</p>
            <p className="text-2xl font-bold text-gray-800">{formatTime(todayLog?.check_out)}</p>
          </div>
          <div className="flex-1 min-w-36 bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Duración</p>
            <p className="text-2xl font-bold text-gray-800">{calcDuration(todayLog?.check_in, todayLog?.check_out)}</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {canCheckIn && (
              <button onClick={handleCheckIn} disabled={actionLoading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition">
                <MdLogin size={18} /> Fichar entrada
              </button>
            )}
            {canCheckOut && (
              <button onClick={handleCheckOut} disabled={actionLoading} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition">
                <MdLogout size={18} /> Fichar salida
              </button>
            )}
            <button onClick={refresh} disabled={actionLoading} className="p-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition" title="Actualizar">
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-700">Historial de fichajes</h4>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Entrada</th>
                  <th className="px-5 py-3 text-left">Salida</th>
                  <th className="px-5 py-3 text-left">Duración</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-400">No hay fichajes registrados</td></tr>
                )}
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 font-medium">{log.date}</td>
                    <td className="px-5 py-3 text-green-600 font-medium">{formatTime(log.check_in)}</td>
                    <td className="px-5 py-3 text-red-600 font-medium">{formatTime(log.check_out)}</td>
                    <td className="px-5 py-3 text-gray-600">{calcDuration(log.check_in, log.check_out)}</td>
                    <td className="px-5 py-3">
                      {!log.check_in ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Sin entrada</span>
                      ) : !log.check_out ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">En curso</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Completado</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => setIssueLog(log)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium transition">
                        <MdWarning size={14} /> Incidencia
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">{logs.length} registros · página {page} de {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
                  <MdChevronLeft size={16} />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
                  <MdChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
