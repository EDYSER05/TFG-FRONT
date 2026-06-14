// Gestión de fichajes e incidencias para owner, manager y hr
import { useEffect, useState } from 'react';
import {
  MdAccessTime, MdWarning, MdEdit, MdSearch,
} from 'react-icons/md';
import api from '../api';
import { formatTime, calcDuration, toInputDate } from '../utils/dates';
import EditTimeLogModal from '../components/TimeLogsManagement/EditTimeLogModal';

export default function TimeLogsManagement() {
  const user = JSON.parse(localStorage.getItem('user'));
  const role = user.role.name;
  const companyId = Number(localStorage.getItem('company_id')) || null;
  const deptId = user.department ? user.department.id : null;

  const [tab, setTab] = useState('fichajes'); // puede ser 'fichajes' o 'incidencias'
  const [allLogs, setAllLogs] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  // editTarget guarda el log y opcionalmente la incidencia, que solo viene cuando se abre desde incidencias
  const [editTarget, setEditTarget] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // El manager solo ve su departamento; el owner y hr ven toda la empresa
  const managerSinDepto = role === 'manager' && !deptId;

  let logsUrl = '/time-logs';
  if (role === 'manager' && deptId) logsUrl += `?department_id=${deptId}`;
  else if (companyId) logsUrl += `?company_id=${companyId}`;

  let issuesUrl = '/time-log-issues';
  if (role === 'manager' && deptId) issuesUrl += `?department_id=${deptId}`;
  else if (companyId) issuesUrl += `?company_id=${companyId}`;

  useEffect(() => {
    if (managerSinDepto) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logsRes, issuesRes] = await Promise.all([
          api.get(logsUrl),
          api.get(issuesUrl),
        ]);
        setAllLogs(logsRes.data.data ?? []);
        setAllIssues(issuesRes.data.data ?? []);
      } catch {
        // Si falla la carga dejamos los arrays vacíos
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pendingIssues = allIssues.filter((issue) => !issue.resolved);

  // Filtrado en cliente porque el volumen de datos por empresa es manejable
  const filteredLogs = allLogs.filter((log) => {
    if (busqueda.trim()) {
      const texto = busqueda.toLowerCase();
      const nombre = `${log.user.name} ${log.user.last_name}`.toLowerCase();
      if (!nombre.includes(texto)) return false;
    }
    if (fechaDesde || fechaHasta) {
      const iso = toInputDate(log.date);
      if (fechaDesde && iso < fechaDesde) return false;
      if (fechaHasta && iso > fechaHasta) return false;
    }
    return true;
  });

  const handleLogSaved = (updated) => {
    setAllLogs((prev) => prev.map((log) => log.id === updated.id ? updated : log));
  };
  const handleIssueUpdated = (id, resolved) => {
    setAllIssues((prev) => prev.map((issue) => issue.id === id ? { ...issue, resolved } : issue));
  };

  // si el contador es 0 no mostramos el badge, por eso usamos undefined en vez de 0
  const tabs = [
    { key: 'fichajes', label: 'Fichajes', badge: allLogs.filter((log) => log.check_in && !log.check_out).length || undefined },
    { key: 'incidencias', label: 'Incidencias', badge: pendingIssues.length || undefined },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (managerSinDepto) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <MdAccessTime size={48} className="mb-3 text-gray-300" />
        <p className="text-sm">No estás asignado a ningún departamento.</p>
        <p className="text-xs mt-1">Contacta con tu administrador para que te asigne un departamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {editTarget && (
        <EditTimeLogModal
          log={editTarget.log}
          issue={editTarget.issue}
          onClose={() => setEditTarget(null)}
          onSaved={handleLogSaved}
          onIssueUpdated={handleIssueUpdated}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <MdAccessTime size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{allLogs.filter((log) => log.check_in && !log.check_out).length}</p>
            <p className="text-xs text-gray-500">Fichajes en curso</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <MdWarning size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{pendingIssues.length}</p>
            <p className="text-xs text-gray-500">Incidencias pendientes</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === tabItem.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tabItem.label}
              {tabItem.badge !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === tabItem.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                  {tabItem.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'fichajes' ? (
          <div>
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-50">
              <div className="relative flex-1 min-w-[180px]">
                <MdSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar empleado..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                />
              </div>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} title="Desde" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-600" />
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} title="Hasta" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-600" />
              {(busqueda || fechaDesde || fechaHasta) && (
                <button onClick={() => { setBusqueda(''); setFechaDesde(''); setFechaHasta(''); }} className="text-xs text-gray-400 hover:text-gray-600 transition whitespace-nowrap">
                  Limpiar filtros
                </button>
              )}
              <span className="text-xs text-gray-400 shrink-0">{filteredLogs.length} resultado{filteredLogs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Empleado</th>
                    <th className="px-5 py-3 text-left">Fecha</th>
                    <th className="px-5 py-3 text-left">Entrada</th>
                    <th className="px-5 py-3 text-left">Salida</th>
                    <th className="px-5 py-3 text-left">Duración</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Sin fichajes</td></tr>
                  )}
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{log.user.name} {log.user.last_name}</td>
                      <td className="px-5 py-3 text-gray-600">{log.date}</td>
                      <td className="px-5 py-3 text-green-600 font-medium">{formatTime(log.check_in)}</td>
                      <td className="px-5 py-3 text-red-500 font-medium">{formatTime(log.check_out)}</td>
                      <td className="px-5 py-3 text-gray-600">{calcDuration(log.check_in, log.check_out)}</td>
                      <td className="px-5 py-3">
                        {!log.check_in
                          ? <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Sin entrada</span>
                          : !log.check_out
                          ? <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">En curso</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Finalizado</span>}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => setEditTarget({ log })} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition whitespace-nowrap">
                          <MdEdit size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Empleado</th>
                  <th className="px-5 py-3 text-left">Departamento</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Entrada</th>
                  <th className="px-5 py-3 text-left">Salida</th>
                  <th className="px-5 py-3 text-left">Descripción</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingIssues.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">Sin incidencias pendientes</td></tr>
                )}
                {pendingIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{issue.reported_by.name} {issue.reported_by.last_name}</td>
                    <td className="px-5 py-3 text-gray-600">{issue.reported_by.department ? issue.reported_by.department.name : '—'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                        {issue.issue_type ? issue.issue_type.name : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{issue.time_log ? issue.time_log.date : '—'}</td>
                    <td className="px-5 py-3 text-green-600 font-medium">{formatTime(issue.time_log ? issue.time_log.check_in : null)}</td>
                    <td className="px-5 py-3 text-red-500 font-medium">{formatTime(issue.time_log ? issue.time_log.check_out : null)}</td>
                    <td className="px-5 py-3 text-gray-400 italic text-xs max-w-xs truncate">{issue.description ?? '—'}</td>
                    <td className="px-5 py-3">
                      {issue.time_log && (
                        <button onClick={() => setEditTarget({ log: issue.time_log, issue })} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition whitespace-nowrap">
                          <MdEdit size={14} /> Editar fichaje
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
