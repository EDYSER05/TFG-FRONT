import { useEffect, useState } from 'react';
import { MdBeachAccess, MdAdd, MdEdit, MdDelete, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import api from '../api';
import { toInputDate, parseDate, toMidnightTimestamp } from '../utils/dates';
import HolidayModal from '../components/Holidays/HolidayModal';
import ConfirmDeleteModal from '../components/Holidays/ConfirmDeleteModal';

const emptyForm = { name: '', date: '' };

export default function Holidays() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user ? user.role.name : '';
  const canManage = ['owner', 'hr'].includes(role);

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

  // Se re-ejecuta al cambiar de año para cargar los festivos del año seleccionado
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
  const openEdit = (holidayToEdit) => { setForm({ name: holidayToEdit.name, date: toInputDate(holidayToEdit.date) }); setFormError(''); setModal(holidayToEdit); };
  const closeModal = () => { setModal(null); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (isEditMode) {
        const res = await api.patch(`/holidays/${modal.id}`, form);
        setHolidays((prev) => prev.map((holiday) => holiday.id === modal.id ? res.data.data : holiday));
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
      setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError(err.response?.data?.msg ?? 'Error al eliminar el festivo');
      setConfirmDeleteId(null);
    }
  };

  // Ordenamos cronológicamente porque la API no garantiza orden
  const sorted = [...holidays].sort((holidayA, holidayB) => {
    try { return parseDate(holidayA.date).getTime() - parseDate(holidayB.date).getTime(); } catch { return 0; }
  });

  const todayTimestamp = toMidnightTimestamp(new Date());

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
          <button onClick={() => setYear((currentYear) => currentYear - 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition"><MdChevronLeft size={18} /></button>
          <p className="text-sm font-semibold text-gray-700 w-28 text-center">{year} · {holidays.length} días</p>
          <button onClick={() => setYear((currentYear) => currentYear + 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition"><MdChevronRight size={18} /></button>
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <MdAdd size={18} /> Nuevo festivo
          </button>
        )}
      </div>

      {deleteError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{deleteError}</div>}

      {modal !== null && (
        <HolidayModal isEditMode={isEditMode} form={form} setForm={setForm} formError={formError} submitting={submitting} onClose={closeModal} onSubmit={handleSubmit} />
      )}

      {confirmDeleteId !== null && (
        <ConfirmDeleteModal onClose={() => setConfirmDeleteId(null)} onConfirm={() => handleDelete(confirmDeleteId)} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <MdBeachAccess size={36} className="mb-2" />
            <p className="text-sm">No hay festivos registrados para {year}</p>
          </div>
        ) : (
          sorted.map((holiday) => {
            let fecha = null;
            let isPast = false;
            let isToday = false;
            try {
              fecha = parseDate(holiday.date);
              const holidayTimestamp = toMidnightTimestamp(fecha);
              isPast = holidayTimestamp < todayTimestamp;
              isToday = holidayTimestamp === todayTimestamp;
            } catch { /* ignorar error de fecha */ }
            return (
              <div key={holiday.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${isPast ? 'opacity-50' : ''}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isToday ? 'bg-indigo-100' : 'bg-orange-100'}`}>
                  <MdBeachAccess size={18} className={isToday ? 'text-indigo-600' : 'text-orange-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{holiday.name}</p>
                  <p className="text-xs text-gray-400">
                    {fecha
                      ? fecha.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      : holiday.date}
                  </p>
                </div>
                {isToday && <span className="text-[11px] bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full shrink-0">hoy</span>}
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(holiday)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><MdEdit size={15} /></button>
                    <button onClick={() => { setDeleteError(''); setConfirmDeleteId(holiday.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><MdDelete size={15} /></button>
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
