import { useEffect, useState } from 'react';
import { MdSchedule, MdAdd, MdEdit } from 'react-icons/md';
import api from '../api';
import ShiftModal from '../components/Shifts/ShiftModal';

const emptyForm = { name: '', start_time: '', end_time: '' };

export default function Shifts() {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role?.name ?? null;
  const canManage = ['owner', 'hr'].includes(role ?? '');

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // modal puede ser null si está cerrado, 'new' si se está creando, o el objeto del turno si se edita
  const isEditMode = modal !== null && modal !== 'new';

  // Carga los turnos disponibles de la empresa al montar el componente
  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/shifts');
        setShifts(res.data.data ?? []);
      } catch {
        // Si falla la carga dejamos la lista vacía
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, []);

  // Abre el modal en modo creación con el formulario vacío
  const openCreate = () => { setForm(emptyForm); setFormError(''); setModal('new'); };

  // Abre el modal en modo edición precargando los datos del turno seleccionado
  const openEdit = (shiftToEdit) => {
    // Recortamos a HH:MM porque el backend devuelve HH:MM:SS y el input type="time" no admite segundos
    setForm({ name: shiftToEdit.name, start_time: shiftToEdit.start_time.slice(0, 5), end_time: shiftToEdit.end_time.slice(0, 5) });
    setFormError('');
    setModal(shiftToEdit);
  };
  // Cierra el modal y limpia los errores del formulario
  const closeModal = () => { setModal(null); setFormError(''); };

  // Crea un turno nuevo o actualiza el existente según el modo del modal
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (isEditMode) {
        const res = await api.patch(`/shifts/${modal.id}`, form);
        setShifts((prev) => prev.map((shift) => shift.id === modal.id ? res.data.data : shift));
      } else {
        const res = await api.post('/shifts', form);
        setShifts((prev) => [...prev, res.data.data]);
      }
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.msg ?? (isEditMode ? 'Error al actualizar el turno' : 'Error al crear el turno'));
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{shifts.length} turno{shifts.length !== 1 ? 's' : ''} configurado{shifts.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <MdAdd size={18} /> Nuevo turno
          </button>
        )}
      </div>

      {modal !== null && (
        <ShiftModal isEditMode={isEditMode} form={form} setForm={setForm} formError={formError} submitting={submitting} onClose={closeModal} onSubmit={handleSubmit} />
      )}


      {shifts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center py-14 text-gray-400">
          <MdSchedule size={36} className="mb-2 text-gray-300" />
          <p className="text-sm">No hay turnos configurados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <MdSchedule size={20} className="text-blue-600" />
                  </div>
                  <p className="font-semibold text-gray-800">{shift.name}</p>
                </div>
                {canManage && (
                  <button onClick={() => openEdit(shift)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><MdEdit size={16} /></button>
                )}
              </div>
              <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-4 py-2.5">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Inicio</p>
                  <p className="font-semibold text-gray-700">{shift.start_time.slice(0, 5)}</p>
                </div>
                <span className="text-gray-300 text-lg">→</span>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Fin</p>
                  <p className="font-semibold text-gray-700">{shift.end_time.slice(0, 5)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
