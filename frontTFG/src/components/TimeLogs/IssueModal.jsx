import { useEffect, useState } from 'react';
import { MdClose, MdWarning } from 'react-icons/md';
import api from '../../api';

export default function IssueModal({ log, user, onClose }) {
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
                {issueTypes.map((issueType) => <option key={issueType.id} value={issueType.id}>{issueType.name}</option>)}
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
