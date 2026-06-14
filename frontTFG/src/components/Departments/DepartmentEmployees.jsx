import { useEffect, useState } from 'react';
import {
  MdApartment, MdSearch, MdPersonAdd,
  MdGroup, MdSchedule,
} from 'react-icons/md';
import api from '../../api';
import { getTodayISO } from '../../utils/dates';
import EmployeeShiftModal from './EmployeeShiftModal';
import RegisterUserModal from './RegisterUserModal';
import EditUserModal from './EditUserModal';

const roleLabels = {
  owner: 'Dueño',
  manager: 'Gerente',
  hr: 'Recursos Humanos',
  employee: 'Empleado',
};

export default function DepartmentEmployees({ dept, companyId, canEditEmployees, canRegisterEmployees, canManageShifts }) {
  const hoy = getTodayISO();

  // Estado de la vista
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Modales de empleado
  const [editUser, setEditUser] = useState(null);
  const [rolesLista, setRolesLista] = useState([]);
  const [deptsLista, setDeptsLista] = useState([]);

  // Modal de turnos
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [days, setDays] = useState([]);

  // Modal de registro
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', last_name: '', email: '', password: '', hire_date: hoy, role_id: '', department_id: String(dept.id) });
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setEmpLoading(true);
      try {
        const res = await api.get(`/users?department_id=${dept.id}`);
        setDeptEmployees(res.data.data ?? []);

        if (canManageShifts) {
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
    fetchData();
  }, [dept.id]);

  // Carga roles y departamentos solo la primera vez que se necesitan
  const cargarRolesYDepts = async () => {
    if (rolesLista.length > 0) return;
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        api.get('/roles'),
        companyId ? api.get(`/departments?company_id=${companyId}`) : api.get('/departments'),
      ]);
      setRolesLista(rolesRes.data.data ?? []);
      setDeptsLista(deptsRes.data.data ?? []);
    } catch {}
  };

  const abrirEditar = async (emp) => {
    await cargarRolesYDepts();
    setEditUser(emp);
  };

  const abrirRegistro = async () => {
    setRegError('');
    setRegForm({ name: '', last_name: '', email: '', password: '', hire_date: hoy, role_id: '', department_id: String(dept.id) });
    await cargarRolesYDepts();
    setShowRegister(true);
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
      if (nuevo.department?.id === dept.id) {
        setDeptEmployees((prev) => [nuevo, ...prev]);
      }
      setShowRegister(false);
    } catch (err) {
      setRegError(err.response?.data?.msg ?? 'Error al registrar el usuario');
    } finally {
      setRegLoading(false);
    }
  };

  const handleUserSaved = (updated) => {
    setDeptEmployees((prev) => prev.map((emp) => emp.id === updated.id ? updated : emp));
  };

  const empleadosFiltrados = busqueda.trim() === ''
    ? deptEmployees
    : deptEmployees.filter((emp) => {
        const texto = busqueda.toLowerCase();
        return (emp.name + ' ' + emp.last_name).toLowerCase().includes(texto) || emp.email.toLowerCase().includes(texto);
      });

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {editUser && canEditEmployees && (
        <EditUserModal employee={editUser} rolesLista={rolesLista} deptsLista={deptsLista} defaultDeptId={dept.id} onClose={() => setEditUser(null)} onSaved={handleUserSaved} />
      )}
      {selectedEmployee && canManageShifts && (
        <EmployeeShiftModal employee={selectedEmployee} shifts={shifts} days={days} onClose={() => setSelectedEmployee(null)} />
      )}
      {showRegister && (
        <RegisterUserModal regForm={regForm} setRegForm={setRegForm} regError={regError} regLoading={regLoading} rolesLista={rolesLista} deptsLista={deptsLista} onClose={() => setShowRegister(false)} onRegister={registrarUsuario} />
      )}

      {/* Cabecera del departamento */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
          <MdApartment size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">{dept.name}</h2>
          <p className="text-xs text-gray-400">{dept.company?.name ?? ''}</p>
        </div>
      </div>

      {/* Barra de herramientas y tabla */}
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
