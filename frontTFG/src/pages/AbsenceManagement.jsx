// Gestión de solicitudes de ausencia: aprobar o rechazar y ver el historial
import { useEffect, useState } from 'react';
import { MdEventBusy, MdCheckCircle, MdCancel, MdPending, MdApartment } from 'react-icons/md';
import api from '../api';

export default function AbsenceManagement() {
  const user = JSON.parse(localStorage.getItem('user'));
  const role = user.role.name;
  const companyId = Number(localStorage.getItem('company_id')) || null;
  const deptId = user.department ? user.department.id : null;

  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalError, setApprovalError] = useState('');

  // El manager solo ve su departamento; el owner y hr ven toda la empresa
  const managerSinDepto = role === 'manager' && !deptId;

  let absUrl = '/absence-requests';
  if (role === 'manager' && deptId) absUrl += `?department_id=${deptId}`;
  else if (companyId) absUrl += `?company_id=${companyId}`;

  useEffect(() => {
    if (managerSinDepto) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(absUrl);
        setAllRequests(res.data.data ?? []);
      } catch {
        // Si falla la carga dejamos el array vacío
      } finally {
        setLoading(false);
      }
    };
    fetchData();

  }, []);

  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const reviewedRequests = allRequests.filter((r) => r.status !== 'pending');

  // Aprueba o rechaza una solicitud: crea el registro de aprobación y actualiza el estado.
  // El backend notifica automáticamente al empleado cuando el estado cambia.
  const handleApprove = async (req, approved) => {
    setApprovalError('');
    const status = approved ? 'approved' : 'rejected';
    try {
      await api.post('/approvals', { absence_request_id: req.id, approved_by: user.id, status });
      await api.patch(`/absence-requests/${req.id}`, { status });
      setAllRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status } : r));
    } catch (err) {
      setApprovalError(err.response?.data?.msg ?? 'Error al procesar la solicitud');
    }
  };

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
        <MdApartment size={48} className="mb-3 text-gray-300" />
        <p className="text-sm">No estás asignado a ningún departamento.</p>
        <p className="text-xs mt-1">Contacta con tu administrador para que te asigne un departamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <MdEventBusy size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{pendingRequests.length}</p>
            <p className="text-xs text-gray-500">Pendientes de aprobación</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <MdEventBusy size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{allRequests.length}</p>
            <p className="text-xs text-gray-500">Total solicitudes</p>
          </div>
        </div>
      </div>

      {approvalError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{approvalError}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {pendingRequests.length > 0 && (
            <div>
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pendientes de aprobación</p>
              <div className="divide-y divide-gray-50">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="px-5 py-4 flex items-start gap-4 flex-wrap hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{req.user.name} {req.user.last_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.absence_type ? req.absence_type.name : '—'} · {req.start_date} → {req.end_date}
                        {req.user.department ? ` · ${req.user.department.name}` : ''}
                      </p>
                      {req.comments && <p className="text-xs text-gray-400 mt-1 italic">"{req.comments}"</p>}
                    </div>
                    {req.user_id !== user.id ? (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(req, true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition"
                        >
                          <MdCheckCircle size={14} /> Aprobar
                        </button>
                        <button
                          onClick={() => handleApprove(req, false)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition"
                        >
                          <MdCancel size={14} /> Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0">Solicitud propia</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewedRequests.length > 0 && (
            <div className={pendingRequests.length > 0 ? 'border-t border-gray-100' : ''}>
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">Empleado</th>
                      <th className="px-5 py-3 text-left">Departamento</th>
                      <th className="px-5 py-3 text-left">Tipo</th>
                      <th className="px-5 py-3 text-left">Inicio</th>
                      <th className="px-5 py-3 text-left">Fin</th>
                      <th className="px-5 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reviewedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{req.user.name} {req.user.last_name}</td>
                        <td className="px-5 py-3 text-gray-600">{req.user.department ? req.user.department.name : '—'}</td>
                        <td className="px-5 py-3 text-gray-600">{req.absence_type ? req.absence_type.name : '—'}</td>
                        <td className="px-5 py-3 text-gray-600">{req.start_date}</td>
                        <td className="px-5 py-3 text-gray-600">{req.end_date}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {req.status === 'approved' ? <MdCheckCircle size={13} /> : req.status === 'rejected' ? <MdCancel size={13} /> : <MdPending size={13} />}
                            {req.status === 'approved' ? 'Aprobada' : req.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {allRequests.length === 0 && (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <MdEventBusy size={36} className="mb-2" />
              <p className="text-sm">Sin solicitudes de ausencia</p>
            </div>
          )}
        </div>
    </div>
  );
}
