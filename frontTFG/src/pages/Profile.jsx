// Perfil del usuario: ver datos personales y cambiar contraseña
import { useState } from 'react';
import { MdPerson, MdLock, MdCheckCircle, MdWarning } from 'react-icons/md';
import api from '../api';

const roleLabels = {
  owner: 'Dueño',
  manager: 'Gerente',
  hr: 'Recursos Humanos',
  employee: 'Empleado',
};

export default function Profile() {
  // Leemos el usuario directamente desde localStorage
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user ? user.role.name : '';

  // Estado del formulario de cambio de contraseña
  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Si el admin forzó el cambio de contraseña mostramos un aviso en la parte superior
  const mustChange = user ? user.must_change_password : false;

  // Función para gestionar el cambio de contraseña del usuario
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch('/change-password', {
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });
      setPasswordSuccess(true);
      setPasswordForm({ password: '', password_confirmation: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.msg ?? 'Error al cambiar la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {mustChange && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <MdWarning size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-sm font-medium">
            Es tu primer acceso. Por seguridad debes cambiar tu contraseña antes de continuar.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <MdPerson size={32} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              {user ? user.name : ''} {user ? user.last_name : ''}
            </h3>
            <p className="text-gray-500 text-sm">{user ? user.email : ''}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full capitalize">
              {roleLabels[role]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Nombre', value: user ? user.name : '—' },
            { label: 'Apellidos', value: user ? user.last_name : '—' },
            { label: 'Email', value: user ? user.email : '—' },
            { label: 'Rol', value: roleLabels[role] || role },
            { label: 'Fecha de contratación', value: user && user.hire_date ? user.hire_date : '—' },
            // last_login_at lo actualiza el backend en cada login exitoso
            { label: 'Último acceso', value: user && user.last_login_at ? user.last_login_at : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <MdLock size={20} className="text-gray-500" />
          <h4 className="font-semibold text-gray-800">Cambiar contraseña</h4>
        </div>

        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <MdCheckCircle size={16} /> Contraseña actualizada correctamente
          </div>
        )}
        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((prevForm) => ({ ...prevForm, password: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm((prevForm) => ({ ...prevForm, password_confirmation: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="Repite la contraseña"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
          >
            {submitting ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
