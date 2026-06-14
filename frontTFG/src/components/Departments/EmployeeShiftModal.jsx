import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import api from '../../api';

const DIAS_ORDERED = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function EmployeeShiftModal({ employee, shifts, days, onClose }) {
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [dayShifts, setDayShifts] = useState({});
  const [savingDay, setSavingDay] = useState(null);
  const [error, setError] = useState('');

  const sortedDays = [...days].sort((a, b) => DIAS_ORDERED.indexOf(a.name) - DIAS_ORDERED.indexOf(b.name));

  useEffect(() => {
    const fetchUserShifts = async () => {
      setLoadingShifts(true);
      try {
        const res = await api.get(`/user-shifts?user_id=${employee.id}`);
        const assignedShifts = res.data.data ?? [];
        const map = {};
        days.forEach((day) => { map[day.id] = []; });
        assignedShifts.forEach((userShift) => {
          if (!map[userShift.day_id]) map[userShift.day_id] = [];
          map[userShift.day_id].push(userShift);
        });
        setDayShifts(map);
      } catch {
        // Si falla la carga dejamos el mapa vacío
      } finally {
        setLoadingShifts(false);
      }
    };
    fetchUserShifts();
  }, [employee.id]);

  const handleChange = async (day, newShiftId) => {
    setSavingDay(day.id); setError('');
    const existing = dayShifts[day.id] ?? [];
    try {
      await Promise.all(existing.map((userShift) => api.delete(`/user-shifts/${userShift.id}`)));
      if (newShiftId) {
        const res = await api.post('/user-shifts', { user_id: employee.id, shift_id: Number(newShiftId), day_id: day.id });
        setDayShifts((prev) => ({ ...prev, [day.id]: [res.data.data] }));
      } else {
        setDayShifts((prev) => ({ ...prev, [day.id]: [] }));
      }
    } catch (err) {
      setError(err.response?.data?.msg ?? 'Error al actualizar turno');
    } finally { setSavingDay(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">{employee.name} {employee.last_name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Horario semanal</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
        </div>
        <div className="p-6 space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          {loadingShifts ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : sortedDays.map((day) => {
            const current = dayShifts[day.id]?.[0];
            const isSaving = savingDay === day.id;
            return (
              <div key={day.id} className="flex items-center gap-3">
                <span className="w-24 text-sm text-gray-600 font-medium shrink-0">{day.name}</span>
                <select value={current?.shift_id?.toString() ?? ''} onChange={(e) => handleChange(day, e.target.value)} disabled={isSaving} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                  <option value="">Libre</option>
                  {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name} ({shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)})</option>)}
                </select>
                {isSaving && <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
