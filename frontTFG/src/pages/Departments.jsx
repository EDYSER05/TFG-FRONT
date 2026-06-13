import { useEffect, useState } from 'react';
import {
  MdApartment, MdPerson, MdAdd, MdClose, MdEdit,
  MdSearch, MdPersonAdd, MdSchedule, MdGroup,
} from 'react-icons/md';
import api from '../api';

const roleLabels = {
  admin: 'Administrador',
  owner: 'Dueño',
  manager: 'Gerente',
  hr: 'Recursos Humanos',
  employee: 'Empleado',
};

const DIAS_ORDERED = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Modal para gestionar el horario semanal de un empleado
function EmployeeShiftModal({ employee, shifts, days, onClose }) {
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

// Modal para editar los datos de un usuario
function EditUserModal({ employee, rolesLista, deptsLista, defaultDeptId, onClose, onSaved }) {
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

export default function Departments() {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role?.name ?? null;
  const companyId = localStorage.getItem('company_id') ? Number(localStorage.getItem('company_id')) : null;

  const isSystemAdmin = role === 'admin';
  const isOwner = role === 'owner';
  const isHr = role === 'hr';
  // Matriz de permisos: admin y owner crean/editan departamentos; hr solo gestiona empleados y turnos
  const canManageDepts = isOwner || isSystemAdmin;
  const canEditEmployees = isSystemAdmin || isOwner || isHr;
  const canRegisterEmployees = isOwner || isHr;
  const canManageShifts = isSystemAdmin || isOwner || isHr;

  // El owner siempre ve preseleccionada su empresa al crear un departamento
  const ownerCompanyId = isOwner && companyId ? String(companyId) : '';
  const emptyDeptForm = { name: '', company_id: ownerCompanyId, manager_id: '' };

  // Estado de la vista de departamentos
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyDeptForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado de la vista de empleados de un departamento
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [rolesLista, setRolesLista] = useState([]);
  const [deptsLista, setDeptsLista] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [days, setDays] = useState([]);

  // Registro de nuevo usuario
  const hoy = new Date().toISOString().split('T')[0];
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', last_name: '', email: '', password: '', hire_date: hoy, role_id: '', department_id: '' });
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const isEditMode = modal !== null && modal !== 'new';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const deptsRes = await api.get('/departments');
        setDepartments(deptsRes.data.data ?? []);

        if (canManageDepts) {
          const [companiesRes, usersRes] = await Promise.all([
            api.get('/companies'),
            api.get('/users'),
          ]);
          setCompanies(companiesRes.data.data ?? []);
          setAllUsers(usersRes.data.data ?? []);
        }
      } catch {
        // Si falla la carga dejamos los arrays vacíos
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
  }, []);

  // Carga los empleados cuando se selecciona un departamento
  const abrirDepartamento = async (dept) => {
    setSelectedDept(dept);
    setBusqueda('');
    setEmpLoading(true);
    try {
      const res = await api.get(`/users?department_id=${dept.id}`);
      setDeptEmployees(res.data.data ?? []);

      // Cargamos turnos y días solo la primera vez que se necesitan, luego se reutilizan
      if (canManageShifts && shifts.length === 0) {
        const [shiftsRes, daysRes] = await Promise.all([api.get('/shifts'), api.get('/days')]);
        setShifts(shiftsRes.data.data ?? []);
        setDays(daysRes.data.data ?? []);
      }
    } catch {
      setDeptEmployees([]);
    } finally {
      setEmpLoading(false);
    }
  };


  const baseManagers = (isSystemAdmin || !companyId ? allUsers : allUsers.filter((user) => !user.department || user.department.company_id === companyId))
    .filter((user) => ['manager', 'owner', 'hr'].includes(user.role?.name ?? ''));
  const currentEditManager = isEditMode && modal?.manager;
  // Si el responsable actual no está en la lista filtrada (cambió de empresa), lo añadimos igual para no perderlo en el select
  const managers = currentEditManager && !baseManagers.some((manager) => manager.id === currentEditManager.id)
    ? [currentEditManager, ...baseManagers]
    : baseManagers;

  const openCreate = () => { setForm(emptyDeptForm); setFormError(''); setModal('new'); };
  const openEdit = (dept, e) => { e.stopPropagation(); setForm({ name: dept.name, company_id: String(dept.company_id ?? ''), manager_id: dept.manager?.id ? String(dept.manager.id) : '' }); setFormError(''); setModal(dept); };
  const closeModal = () => { setModal(null); setFormError(''); setForm(emptyDeptForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const payload = { name: form.name, company_id: Number(form.company_id), manager_id: form.manager_id ? Number(form.manager_id) : null };
    try {
      if (isEditMode) {
        const res = await api.patch(`/departments/${modal.id}`, payload);
        setDepartments((prev) => prev.map((dept) => dept.id === modal.id ? res.data.data : dept));
      } else {
        const res = await api.post('/departments', payload);
        setDepartments((prev) => [...prev, res.data.data]);
      }
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.msg ?? (isEditMode ? 'Error al actualizar' : 'Error al crear'));
    } finally {
      setSubmitting(false);
    }
  };


  const abrirEditar = async (emp) => {
    // Cargamos roles y departamentos solo la primera vez; el rol 'admin' se excluye del formulario
    if (rolesLista.length === 0) {
      try {
        const [rolesRes, deptsRes] = await Promise.all([
          api.get('/roles'),
          companyId ? api.get(`/departments?company_id=${companyId}`) : api.get('/departments'),
        ]);
        setRolesLista((rolesRes.data.data ?? []).filter((role) => role.name !== 'admin'));
        setDeptsLista(deptsRes.data.data ?? []);
      } catch {
        // Si falla la carga dejamos las listas vacías
      }
    }
    setEditUser(emp);
  };

  const handleUserSaved = (updated) => {
    setDeptEmployees((prev) => prev.map((employee) => employee.id === updated.id ? updated : employee));
  };

  const abrirRegistro = async () => {
    setRegError('');
    setRegForm({ name: '', last_name: '', email: '', password: '', hire_date: hoy, role_id: '', department_id: selectedDept ? String(selectedDept.id) : '' });
    setShowRegister(true);
    if (rolesLista.length === 0) {
      try {
        const [rolesRes, deptsRes] = await Promise.all([
          api.get('/roles'),
          companyId ? api.get(`/departments?company_id=${companyId}`) : api.get('/departments'),
        ]);
        setRolesLista((rolesRes.data.data ?? []).filter((role) => role.name !== 'admin'));
        setDeptsLista(deptsRes.data.data ?? []);
      } catch {
        // Si falla la carga seguimos con listas vacías
      }
    }
  };

  const registrarUsuario = async () => {
    setRegError('');
    if (!regForm.name || !regForm.last_name || !regForm.email || !regForm.password || !regForm.hire_date || !regForm.role_id) {
      setRegError('Rellena todos los campos obligatorios');
      return;
    }
    setRegLoading(true);
    try {
      const body = { name: regForm.name, last_name: regForm.last_name, email: regForm.email, password: regForm.password, hire_date: regForm.hire_date, role_id: Number(regForm.role_id) };
      if (regForm.department_id) body.department_id = Number(regForm.department_id);
      const res = await api.post('/register', body);
      const nuevo = res.data.data;
      // Solo añadimos el nuevo usuario a la tabla si pertenece al departamento que está abierto
      if (nuevo.department?.id === selectedDept?.id) {
        setDeptEmployees((prev) => [nuevo, ...prev]);
      }
      setShowRegister(false);
    } catch (err) {
      setRegError(err.response?.data?.msg ?? 'Error al registrar el usuario');
    } finally {
      setRegLoading(false);
    }
  };

  // El admin global ve todos; owner y hr solo ven los de su empresa
  const visibleDepts = isSystemAdmin || !companyId ? departments : departments.filter((dept) => dept.company_id === companyId);

  const empleadosFiltrados = busqueda.trim() === ''
    ? deptEmployees
    : deptEmployees.filter((employee) => {
        const texto = busqueda.toLowerCase();
        return (employee.name + ' ' + employee.last_name).toLowerCase().includes(texto) || employee.email.toLowerCase().includes(texto);
      });

  // Si hay un departamento seleccionado mostramos su lista de empleados
  if (selectedDept) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {editUser && canEditEmployees && (
          <EditUserModal employee={editUser} rolesLista={rolesLista} deptsLista={deptsLista} defaultDeptId={selectedDept?.id} onClose={() => setEditUser(null)} onSaved={handleUserSaved} />
        )}
        {selectedEmployee && canManageShifts && (
          <EmployeeShiftModal employee={selectedEmployee} shifts={shifts} days={days} onClose={() => setSelectedEmployee(null)} />
        )}

        {/* Modal de registro */}
        {showRegister && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowRegister(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Registrar nuevo usuario</h3>
                <button onClick={() => setShowRegister(false)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                {regError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{regError}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Juan" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                    <input type="text" value={regForm.last_name} onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="García López" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="juan@empresa.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña inicial <span className="text-red-500">*</span></label>
                    <input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Mínimo 8 caracteres" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de alta <span className="text-red-500">*</span></label>
                    <input type="date" value={regForm.hire_date} onChange={(e) => setRegForm({ ...regForm, hire_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol <span className="text-red-500">*</span></label>
                    <select value={regForm.role_id} onChange={(e) => setRegForm({ ...regForm, role_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Selecciona un rol</option>
                      {rolesLista.map((role) => <option key={role.id} value={role.id}>{roleLabels[role.name] || role.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                    <select value={regForm.department_id} onChange={(e) => setRegForm({ ...regForm, department_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Sin departamento</option>
                      {deptsLista.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400">El usuario deberá cambiar su contraseña la primera vez que inicie sesión.</p>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowRegister(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
                  <button onClick={registrarUsuario} disabled={regLoading} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    <MdPersonAdd size={16} />
                    {regLoading ? 'Registrando...' : 'Registrar usuario'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cabecera del departamento */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <MdApartment size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">{selectedDept.name}</h2>
            <p className="text-xs text-gray-400">{selectedDept.company?.name ?? ''}</p>
          </div>
        </div>

        {/* Barra de herramientas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, apellidos o email..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-gray-400 flex items-center gap-1"><MdGroup size={14} />{deptEmployees.length} empleados</span>
              {canRegisterEmployees && (
                <button onClick={abrirRegistro} className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-800 font-medium transition">
                  <MdPersonAdd size={15} /> Registrar usuario
                </button>
              )}
            </div>
          </div>

          {empLoading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Nombre</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Rol</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    {canManageShifts && <th className="px-5 py-3 text-left">Turnos</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {empleadosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={canManageShifts ? 5 : 4} className="px-5 py-6 text-center text-gray-400">
                        {busqueda ? 'No se encontraron empleados con esa búsqueda' : 'Sin empleados en este departamento'}
                      </td>
                    </tr>
                  )}
                  {empleadosFiltrados.map((emp) => (
                    <tr
                      key={emp.id}
                      className={`hover:bg-gray-50 transition-colors ${canEditEmployees ? 'cursor-pointer' : ''}`}
                      onClick={canEditEmployees ? () => abrirEditar(emp) : undefined}
                    >
                      <td className="px-5 py-3 font-medium text-gray-800">{emp.name} {emp.last_name}</td>
                      <td className="px-5 py-3 text-gray-500">{emp.email}</td>
                      <td className="px-5 py-3"><span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">{roleLabels[emp.role?.name] || emp.role?.name}</span></td>
                      <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{emp.active ? 'Activo' : 'Inactivo'}</span></td>
                      {canManageShifts && (
                        <td className="px-5 py-3">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
                            <MdSchedule size={14} /> Gestionar
                          </button>
                        </td>
                      )}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{visibleDepts.length} departamentos</p>
        {canManageDepts && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <MdAdd size={18} /> Nuevo departamento
          </button>
        )}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{isEditMode ? 'Editar departamento' : 'Nuevo departamento'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del departamento</label>
                <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Recursos Humanos" />
              </div>
              {!isOwner && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <select required value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Seleccionar empresa</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                <select value={form.manager_id} onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin responsable</option>
                  {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} {manager.last_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  {submitting ? (isEditMode ? 'Guardando...' : 'Creando...') : (isEditMode ? 'Guardar cambios' : 'Crear departamento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleDepts.length === 0 && <p className="text-gray-400 col-span-full text-center py-8">No hay departamentos</p>}
          {visibleDepts.map((dept) => (
            <div
              key={dept.id}
              onClick={() => abrirDepartamento(dept)}
              className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <MdApartment size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{dept.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{dept.company?.name ?? '—'}</p>
                  {dept.manager && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <MdPerson size={13} />
                      <span>{dept.manager.name} {dept.manager.last_name}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dept.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {dept.active ? 'Activo' : 'Inactivo'}
                  </span>
                  {canManageDepts && (
                    <button onClick={(e) => openEdit(dept, e)} className="p-1 text-gray-400 hover:text-indigo-600 transition" title="Editar"><MdEdit size={16} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
