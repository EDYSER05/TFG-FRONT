import { useEffect, useState } from 'react';
import { MdBeachAccess, MdAdd, MdClose, MdEdit, MdDelete, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import api from '../api';
import { toInputDate, parseDate } from '../utils/dates';

const emptyForm = { name: '', date: '' };

export default function Holidays() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user ? user.role.name : '';
  const canManage = ['admin', 'owner', 'hr'].includes(role);

  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const isEditMode = modal !== null && modal !== 'new';

  useEffect(() => {
    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/holidays?year=${year}`);
        setHolidays(res.data.data ?? []);
      } catch {
        // Si falla la carga dejamos la lista vacía
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, [year]);

  const openCreate = () => { setForm(emptyForm); setFormError(''); setModal('new'); };
  const openEdit = (h) => { setForm({ name: h.name, date: toInputDate(h.date) }); setFormError(''); setModal(h); };
  const closeModal = () => { setModal(null); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (isEditMode) {
        const res = await api.patch(`/holidays/${modal.id}`, form);
        setHolidays((prev) => prev.map((h) => h.id === modal.id ? res.data.data : h));
      } else {
        const res = await api.post('/holidays', form);
        setHolidays((prev) => [...prev, res.data.data]);
      }
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.msg ?? (isEditMode ? 'Error al actualizar el festivo' : 'Error al crear el festivo'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteError('');
    try {
      await api.delete(`/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError(err.response?.data?.msg ?? 'Error al eliminar el festivo');
      setConfirmDeleteId(null);
    }
  };

  const sorted = [...holidays].sort((a, b) => {
    try { return parseDate(a.date).getTime() - parseDate(b.date).getTime(); } catch { return 0; }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition"><MdChevronLeft size={18} /></button>
          <p className="text-sm font-semibold text-gray-700 w-28 text-center">{year} · {holidays.length} días</p>
          <button onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition"><MdChevronRight size={18} /></button>
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <MdAdd size={18} /> Nuevo festivo
          </button>
        )}
      </div>

      {deleteError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{deleteError}</div>}

      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{isEditMode ? 'Editar festivo' : 'Nuevo festivo'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Ej: Día de la Constitución" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  {submitting ? (isEditMode ? 'Guardando...' : 'Creando...') : (isEditMode ? 'Guardar cambios' : 'Crear festivo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800">¿Eliminar festivo?</h3>
            <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <MdBeachAccess size={36} className="mb-2" />
            <p className="text-sm">No hay festivos registrados para {year}</p>
          </div>
        ) : (
          sorted.map((h) => {
            let fecha = null;
            let isPast = false;
            let isToday = false;
            try {
              fecha = parseDate(h.date);
              const ts = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
              isPast = ts < today.getTime();
              isToday = ts === today.getTime();
            } catch { /* ignorar error de fecha */ }
            return (
              <div key={h.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${isPast ? 'opacity-50' : ''}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isToday ? 'bg-indigo-100' : 'bg-orange-100'}`}>
                  <MdBeachAccess size={18} className={isToday ? 'text-indigo-600' : 'text-orange-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{h.name}</p>
                  <p className="text-xs text-gray-400">
                    {fecha
                      ? fecha.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      : h.date}
                  </p>
                </div>
                {isToday && <span className="text-[11px] bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full shrink-0">hoy</span>}
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(h)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><MdEdit size={15} /></button>
                    <button onClick={() => { setDeleteError(''); setConfirmDeleteId(h.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><MdDelete size={15} /></button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
