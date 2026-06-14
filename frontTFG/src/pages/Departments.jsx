import { useEffect, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import api from '../api';
import DepartmentModal from '../components/Departments/DepartmentModal';
import DepartmentCard from '../components/Departments/DepartmentCard';
import DepartmentEmployees from '../components/Departments/DepartmentEmployees';

export default function Departments() {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role?.name ?? null;
  const companyId = localStorage.getItem('company_id') ? Number(localStorage.getItem('company_id')) : null;

  const isOwner = role === 'owner';
  const isHr = role === 'hr';
  
  // Permisos
  const canManageDepts = isOwner;
  const canEditEmployees = isOwner || isHr;
  const canRegisterEmployees = isOwner || isHr;
  const canManageShifts = isOwner || isHr;
  
  const ownerCompanyId = isOwner && companyId ? String(companyId) : '';
  const emptyDeptForm = { name: '', company_id: ownerCompanyId, manager_id: '' };

  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);

  // Estado del modal de departamento
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyDeptForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      } catch {/**/
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtramos los managers segun la compañia del usuario (si es owner) o todos (si es hr)
  const baseManagers = (!companyId ? allUsers : allUsers.filter((u) => !u.department || u.department.company_id === companyId)) // Solo los departamentos del companyId de localStorage
    .filter((u) => ['manager', 'owner', 'hr'].includes(u.role?.name ?? ''));
  const currentEditManager = isEditMode && modal?.manager;
  // Si el responsable actual no está en la lista filtrada lo añadimos para no perderlo en el select
  const managers = currentEditManager && !baseManagers.some((m) => m.id === currentEditManager.id)
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
        setDepartments((prev) => prev.map((d) => d.id === modal.id ? res.data.data : d));
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

  const visibleDepts = !companyId ? departments : departments.filter((d) => d.company_id === companyId);

  if (selectedDept) {
    return (
      <DepartmentEmployees
        dept={selectedDept}
        companyId={companyId}
        canEditEmployees={canEditEmployees}
        canRegisterEmployees={canRegisterEmployees}
        canManageShifts={canManageShifts}
      />
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
        <DepartmentModal isEditMode={isEditMode} form={form} setForm={setForm} formError={formError} submitting={submitting} isOwner={isOwner} companies={companies} managers={managers} onClose={closeModal} onSubmit={handleSubmit} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleDepts.length === 0 && <p className="text-gray-400 col-span-full text-center py-8">No hay departamentos</p>}
        {visibleDepts.map((dept) => (
          <DepartmentCard
            key={dept.id}
            dept={dept}
            canManageDepts={canManageDepts}
            onClick={() => setSelectedDept(dept)}
            onEdit={(e) => openEdit(dept, e)}
          />
        ))}
      </div>
    </div>
  );
}