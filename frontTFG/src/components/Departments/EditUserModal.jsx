import { useState } from 'react';
import { MdClose, MdEdit } from 'react-icons/md';
import api from '../../api';

const roleLabels = {
  owner: 'Dueño',
  manager: 'Gerente',
  hr: 'Recursos Humanos',
  employee: 'Empleado',
};

export default function EditUserModal({ employee, rolesLista, deptsLista, defaultDeptId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: employee.name,
    last_name: employee.last_name,
    email: employee.email,
    hire_date: employee.hire_date ? employee.hire_date.split('-').reverse().join('-') : '',
    role_id: employee.role ? String(employee.role.id) : '',
    department_id: employee.department ? String(employee.department.id) : (defaultDeptId ? String(defaultDeptId) : ''),
    active: employee.active,
  });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const guardar = async () => {
    setError('');
    if (!form.name || !form.last_name || !form.email || !form.role_id) {
      setError('Nombre, apellidos, email y rol son obligatorios');
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      const body = {
        name: form.name,
        last_name: form.last_name,
        email: form.email,
        hire_date: form.hire_date,
        role_id: Number(form.role_id),
        active: form.active,
      };
      if (form.department_id) body.department_id = Number(form.department_id);
      if (newPassword) body.password = newPassword;
      const res = await api.patch(`/users/${employee.id}`, body);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg ?? 'Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Editar usuario</h3>
            <p className="text-xs text-gray-400 mt-0.5">{employee.name} {employee.last_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de contratación</label>
              <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol <span className="text-red-500">*</span></label>
              <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Selecciona un rol</option>
                {rolesLista.map((role) => <option key={role.id} value={role.id}>{roleLabels[role.name] || role.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sin departamento</option>
                {deptsLista.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-gray-600">{form.active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Dejar en blanco para no cambiarla" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
            <button onClick={guardar} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              <MdEdit size={16} />
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
