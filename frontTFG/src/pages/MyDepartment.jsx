import { useEffect, useState } from 'react';
import {
  MdApartment, MdBusiness, MdEmail, MdGroup, MdEventBusy,
} from 'react-icons/md';
import api from '../api';
import { DIAS_SEMANA, parseDate } from '../utils/dates';

const roleLabels = {
  admin: 'Administrador',
  owner: 'Dueño',
  manager: 'Gerente',
  hr: 'Recursos Humanos',
  employee: 'Empleado',
};

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  owner: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  hr: 'bg-teal-100 text-teal-700',
  employee: 'bg-gray-100 text-gray-600',
};

function initials(user) {
  return `${user.name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
}

// Devuelve el estado de un compañero para hoy: si está de ausencia, trabajando, o libre
function getMemberStatus(userId, allAbsences, shiftsByUser) {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const absence = allAbsences.find((absence) => {
    if (absence.status === 'rejected' || absence.user_id !== userId) return false;
    try {
      const start = parseDate(absence.start_date);
      const end = parseDate(absence.end_date);
      return todayDate >= start && todayDate <= end;
    } catch { return false; }
  });

  if (absence) {
    return { type: 'absence', label: absence.absence_type?.name ?? 'Ausencia', status: absence.status };
  }

  const shifts = shiftsByUser[userId] ?? [];
  // userShift.day.js es el número de día JS (0=Dom...6=Sáb) que calculamos al cargar los datos
  const todayShifts = shifts.filter((userShift) => userShift.day?.js === new Date().getDay());
  if (todayShifts.length > 0) {
    const times = todayShifts.map((userShift) => `${userShift.shift?.start_time.slice(0, 5)}–${userShift.shift?.end_time.slice(0, 5)}`).join(', ');
    return { type: 'working', times };
  }

  return { type: 'free' };
}

function StatusBadge({ status }) {
  if (status.type === 'absence') {
    const isPending = status.status === 'pending';
    return (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
        <MdEventBusy size={11} className="inline mr-0.5 -mt-0.5" />
        {status.label}{isPending ? ' · pendiente' : ''}
      </span>
    );
  }
  if (status.type === 'working') {
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{status.times}</span>;
  }
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Día libre</span>;
}

export default function MyDepartment() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const deptId = user && user.department ? user.department.id : null;

  const [dept, setDept] = useState(null);
  const [coworkers, setCoworkers] = useState([]);
  const [allAbsences, setAllAbsences] = useState([]);
  const [shiftsByUser, setShiftsByUser] = useState({});
  const [loading, setLoading] = useState(!!deptId);

  useEffect(() => {
    if (!deptId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [deptRes, coworkersRes, absRes, shiftsRes, daysRes] = await Promise.all([
          api.get(`/departments/${deptId}`),
          api.get(`/users?department_id=${deptId}`),
          api.get(`/absence-requests?department_id=${deptId}`),
          api.get(`/user-shifts?department_id=${deptId}`),
          api.get('/days'),
        ]);

        setDept(deptRes.data.data ?? null);
        setCoworkers(coworkersRes.data.data ?? []);
        setAllAbsences(absRes.data.data ?? []);

        const days = daysRes.data.data ?? [];
        // Construimos un mapa user_id → turnos enriquecidos con el número de día JS para filtrar por hoy
        const byUser = {};
        for (const userShift of shiftsRes.data.data ?? []) {
          const dayName = days.find((day) => day.id === userShift.day_id)?.name ?? '';
          const jsDay = DIAS_SEMANA[dayName];
          const entry = { ...userShift, day: { ...userShift.day, js: jsDay } };
          if (!byUser[userShift.user_id]) byUser[userShift.user_id] = [];
          byUser[userShift.user_id].push(entry);
        }
        setShiftsByUser(byUser);
      } catch {
        // Si falla la carga dejamos los datos vacíos
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deptId]);

  if (!deptId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <MdApartment size={48} className="mb-3" />
        <p className="text-sm">No estás asignado a ningún departamento.</p>
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
    <div className="space-y-6">
      {/* Cabecera departamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start gap-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
              <MdApartment size={32} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-800">{dept ? dept.name : user.department.name}</h2>
              {dept && dept.company && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <MdBusiness size={15} />
                  <span>{dept.company.name}</span>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Lista de compañeros */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <MdGroup size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-gray-700">Compañeros</h3>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold rounded-full px-2 py-0.5">
            {coworkers.length}
          </span>
        </div>
        <div className="divide-y divide-gray-50">
            {coworkers.length === 0 && (
              <div className="flex justify-center py-10 text-gray-400 text-sm">Sin compañeros registrados</div>
            )}
            {coworkers.map((coworker) => {
              const memberStatus = getMemberStatus(coworker.id, allAbsences, shiftsByUser);
              return (
                <div key={coworker.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${coworker.id === user.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {initials(coworker)}
                  </div>

                  {/* Nombre y email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">
                      {coworker.name} {coworker.last_name}
                      {coworker.id === user.id && <span className="ml-2 text-xs text-indigo-500 font-normal">(tú)</span>}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <MdEmail size={12} />
                      <span className="truncate">{coworker.email}</span>
                    </div>
                  </div>

                  {/* Badges: rol + estado hoy */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {coworker.role && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleColors[coworker.role.name] ?? 'bg-gray-100 text-gray-600'}`}>
                        {roleLabels[coworker.role.name] ?? coworker.role.name}
                      </span>
                    )}
                    <StatusBadge status={memberStatus} />
                  </div>
                </div>
              );
            })}
          </div>
      </div>
    </div>
  );
}
