import { useState } from 'react';
import { MdClose, MdEdit, MdCheckCircle } from 'react-icons/md';
import api from '../../api';
import { calcDuration, toInputTime } from '../../utils/dates';

export default function EditTimeLogModal({ log, issue, onClose, onSaved, onIssueUpdated }) {
  const [checkIn, setCheckIn] = useState(log.check_in ? toInputTime(log.check_in) : '');
  const [checkOut, setCheckOut] = useState(log.check_out ? toInputTime(log.check_out) : '');
  const [resolved, setResolved] = useState(issue ? issue.resolved : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      // El backend espera HH:MM:SS, el input de tiempo devuelve HH:MM
      const res = await api.patch(`/time-logs/${log.id}`, {
        check_in: checkIn ? `${checkIn}:00` : null,
        check_out: checkOut ? `${checkOut}:00` : null,
      });
      onSaved(res.data.data);
      if (issue) {
        await api.patch(`/time-log-issues/${issue.id}`, { resolved });
        onIssueUpdated?.(issue.id, resolved);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg ?? 'Error al guardar los cambios');
    } finally { setSaving(false); }
  };

  const nombre = issue
    ? `${issue.reported_by.name} ${issue.reported_by.last_name}`
    : `${log.user.name} ${log.user.last_name}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Editar fichaje</h3>
            <p className="text-xs text-gray-400 mt-0.5">{nombre} · {log.date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          {issue && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Incidencia reportada</p>
                <p className="text-sm text-amber-800 font-medium">{issue.issue_type ? issue.issue_type.name : '—'}</p>
                {issue.description && <p className="text-xs text-amber-700 italic">"{issue.description}"</p>}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                <span className="text-sm text-amber-800 font-medium">{resolved ? 'Resuelta' : 'Pendiente'}</span>
                <button type="button" onClick={() => setResolved((v) => !v)} className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${resolved ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${resolved ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entrada</label>
              <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salida</label>
              <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          {(checkIn || checkOut) && (
            <p className="text-sm text-center text-gray-500">
              Duración: <span className="font-medium text-gray-700">{calcDuration(checkIn ? `${checkIn}:00` : undefined, checkOut ? `${checkOut}:00` : undefined)}</span>
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              <MdCheckCircle size={16} />
              {saving ? 'Guardando...' : issue && resolved ? 'Guardar y resolver' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
