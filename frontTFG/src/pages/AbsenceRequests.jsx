// Página para que el empleado solicite ausencias y consulte el estado de las suyas
import { useEffect, useState } from 'react';
import { MdAdd, MdClose, MdEventBusy, MdPending, MdCheckCircle, MdCancel, MdDelete } from 'react-icons/md';
import api from '../api';

export default function AbsenceRequests() {
  // Leemos el usuario desde localStorage
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Datos cargados desde la API
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado del formulario para crear una solicitud
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ absence_type_id: '', start_date: '', end_date: '', comments: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cargamos las solicitudes y los tipos de ausencia al montar el componente
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [requestsRes, typesRes] = await Promise.all([
          api.get(`/absence-requests?user_id=${user.id}`),
          api.get('/absence-types'),
        ]);
        setRequests(requestsRes.data.data ?? []);
        setTypes(typesRes.data.data ?? []);
      } catch {
        // Si falla la carga dejamos los arrays vacíos
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
  }, []);

  const closeForm = () => {
    setShowForm(false);
    setFormError('');
    setForm({ absence_type_id: '', start_date: '', end_date: '', comments: '' });
  };

  const cancelarSolicitud = async (id) => {
    try {
      await api.delete(`/absence-requests/${id}`);
      setRequests((prev) => prev.filter((request) => request.id !== id));
    } catch {
      // Si falla no hacemos nada, el usuario puede intentarlo de nuevo
    }
  };

  // Función para enviar la nueva solicitud de ausencia a la API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    // Validación de rango en cliente para dar feedback inmediato antes de llamar a la API
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setFormError('La fecha de fin no puede ser anterior a la de inicio');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/absence-requests', {
        user_id: user?.id,
        absence_type_id: Number(form.absence_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        comments: form.comments || undefined,
      });
      setRequests((prev) => [res.data.data, ...prev]);
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.msg ?? 'Error al crear la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Tus solicitudes de ausencia</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <MdAdd size={18} /> Nueva solicitud
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeForm}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Nueva solicitud de ausencia</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de ausencia</label>
                <select required value={form.absence_type_id} onChange={(e) => setForm((f) => ({ ...f, absence_type_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar tipo</option>
                  {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                  <input type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                  <input type="date" required value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios <span className="text-gray-400 font-normal">(opcional)</span></label>
                <textarea value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Motivo de la solicitud..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">{submitting ? 'Enviando...' : 'Enviar solicitud'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-gray-400">
            <MdEventBusy size={36} />
            <p className="mt-2 text-sm">No tienes solicitudes de ausencia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Inicio</th>
                  <th className="px-5 py-3 text-left">Fin</th>
                  <th className="px-5 py-3 text-left">Comentarios</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 font-medium">{req.absence_type?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{req.start_date}</td>
                    <td className="px-5 py-3 text-gray-600">{req.end_date}</td>
                    <td className="px-5 py-3 text-gray-400 italic text-xs max-w-xs truncate">{req.comments ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {req.status === 'approved' ? <MdCheckCircle size={13} /> : req.status === 'rejected' ? <MdCancel size={13} /> : <MdPending size={13} />}
                        {req.status === 'approved' ? 'Aprobada' : req.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {req.status === 'pending' && (
                        <button onClick={() => cancelarSolicitud(req.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium transition" title="Cancelar solicitud">
                          <MdDelete size={14} /> Cancelar
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
