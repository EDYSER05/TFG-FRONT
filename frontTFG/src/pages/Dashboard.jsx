import { useEffect, useState } from 'react';
import { MdAccessTime, MdEventBusy, MdPending, MdWarning, MdCalendarMonth, MdCheckCircle, MdCancel } from 'react-icons/md';
import api from '../api';
import { getToday, parseDate, formatTime, DIAS_SEMANA, DIAS_ABREV } from '../utils/dates';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [timeLogs, setTimeLogs] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [userShifts, setUserShifts] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const [logsRes, absRes, shiftsRes, daysRes] = await Promise.all([
          api.get(`/time-logs?user_id=${user.id}`),
          api.get(`/absence-requests?user_id=${user.id}`),
          api.get(`/user-shifts?user_id=${user.id}`),
          api.get('/days'),
        ]);
        setTimeLogs(logsRes.data.data ?? []);
        setAbsences(absRes.data.data ?? []);
        setUserShifts(shiftsRes.data.data ?? []);
        setDays(daysRes.data.data ?? []);
      } catch {/**/}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const todayLog = timeLogs.find((l) => l.date === getToday()) ?? null;
  const pending = absences.filter((a) => a.status === 'pending').length;
  const approved = absences.filter((a) => a.status === 'approved').length;

  const shiftsByWeekday = {};
  userShifts.forEach((us) => {
    const dayName = days.find((d) => d.id === us.day_id)?.name ?? '';
    const jsDay = DIAS_SEMANA[dayName];
    if (jsDay !== undefined) {
      if (!shiftsByWeekday[jsDay]) shiftsByWeekday[jsDay] = [];
      shiftsByWeekday[jsDay].push(us);
    }
  });

  function getAbsenceForDay(date) {
    const ts = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    for (const abs of absences) {
      if (abs.status === 'rejected') continue;
      try {
        const start = parseDate(abs.start_date);
        const end = parseDate(abs.end_date);
        const startTs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        const endTs = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        if (ts >= startTs && ts <= endTs) return abs;
      } catch {/**/}
    }
    return null;
  }

  const today = new Date();
  const monday = getMonday(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const todayAbsence = getAbsenceForDay(today);
  const todayShifts = shiftsByWeekday[today.getDay()] ?? [];
  const isWithinAnyShift = !todayAbsence && todayShifts.some((us) => {
    if (!us.shift) return false;
    const now = new Date();
    const [sh, sm] = us.shift.start_time.split(':').map(Number);
    const [eh, em] = us.shift.end_time.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
  });

  // Notificación de recordatorio: una vez por día vía sessionStorage para no repetirla
  useEffect(() => {
    if (loading || !user) return;
    if (!isWithinAnyShift || todayLog?.check_in) return;
    const key = `reminder_sent_${getToday()}`;
    if (sessionStorage.getItem(key)) return;
    api.post('/notifications', {
      user_id: user.id,
      message: 'Recuerda fichar la entrada. Estás dentro de tu horario de trabajo.',
    }).then(() => {
      sessionStorage.setItem(key, '1');
      window.dispatchEvent(new Event('notifications-updated'));
    }).catch(() => {});
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-800">Bienvenido, {user?.name} {user?.last_name}</h3>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Horario hoy */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdAccessTime size={18} className="text-indigo-500" />
              <h4 className="font-semibold text-gray-700">Tu horario hoy</h4>
            </div>
            {todayAbsence ? (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${todayAbsence.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {todayAbsence.absence_type?.name ?? 'Ausencia'}{todayAbsence.status === 'pending' ? ' · pendiente' : ''}
              </span>
            ) : todayLog?.check_out ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Completado</span>
            ) : todayLog?.check_in ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">En curso</span>
            ) : todayShifts.length > 0 ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Sin fichar</span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">Día libre</span>
            )}
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Turno</p>
              {todayAbsence ? (
                <p className="text-sm font-medium text-gray-400 italic">—</p>
              ) : todayShifts.length > 0 ? (
                todayShifts.map((us, i) => (
                  <p key={i} className="text-sm font-semibold text-gray-700">
                    {us.shift?.start_time.slice(0, 5)} – {us.shift?.end_time.slice(0, 5)}
                  </p>
                ))
              ) : (
                <p className="text-sm font-medium text-gray-400">Sin turno asignado</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Entrada</p>
              <p className={`text-sm font-semibold ${todayLog?.check_in ? 'text-green-600' : 'text-gray-300'}`}>
                {todayLog?.check_in ? formatTime(todayLog.check_in) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Salida</p>
              <p className={`text-sm font-semibold ${todayLog?.check_out ? 'text-red-500' : 'text-gray-300'}`}>
                {todayLog?.check_out ? formatTime(todayLog.check_out) : '—'}
              </p>
            </div>
          </div>

          {isWithinAnyShift && !todayLog?.check_in && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
              <MdWarning size={17} className="text-amber-500 shrink-0" />
              <p className="text-amber-700 text-sm">Estás dentro de tu horario de trabajo y aún no has fichado. Recuerda registrar tu entrada.</p>
            </div>
          )}
          {todayLog?.check_in && !todayLog?.check_out && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
              <MdAccessTime size={17} className="text-indigo-500 shrink-0" />
              <p className="text-indigo-700 text-sm">Llevas trabajando desde las <strong>{formatTime(todayLog.check_in)}</strong>. Recuerda fichar la salida.</p>
            </div>
          )}
        </div>

        {/* Ausencias */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100">
              <MdPending size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{pending}</p>
              <p className="text-sm text-gray-500">Ausencias pendientes</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100">
              <MdEventBusy size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{approved}</p>
              <p className="text-sm text-gray-500">Ausencias aprobadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Horario semana */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <MdCalendarMonth size={18} className="text-indigo-500" />
            <h4 className="font-semibold text-gray-700">Horario esta semana</h4>
          </div>
          <div className="divide-y divide-gray-50">
            {weekDays.map((date) => {
              const jsDay = date.getDay();
              const shifts = shiftsByWeekday[jsDay] ?? [];
              const isToday = date.toDateString() === today.toDateString();
              const isWeekend = jsDay === 0 || jsDay === 6;
              const absence = getAbsenceForDay(date);

              let rowBg = '';
              if (isToday && !absence) rowBg = 'bg-indigo-50';
              else if (absence?.status === 'approved') rowBg = 'bg-green-50';
              else if (absence?.status === 'pending') rowBg = 'bg-amber-50';

              return (
                <div key={date.toISOString()} className={`px-5 py-3 flex items-center justify-between ${rowBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold w-7 ${isToday && !absence ? 'text-indigo-600' : isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>
                      {DIAS_ABREV[jsDay]}
                    </span>
                    <span className={`text-sm ${isToday && !absence ? 'font-semibold text-indigo-700' : 'text-gray-600'}`}>
                      {date.getDate()} de {date.toLocaleDateString('es-ES', { month: 'long' })}
                    </span>
                    {isToday && !absence && <span className="text-[10px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5 font-medium">hoy</span>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {absence ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${absence.status === 'approved' ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100'}`}>
                        {absence.absence_type?.name ?? 'Ausencia'}{absence.status === 'pending' ? ' (pendiente)' : ''}
                      </span>
                    ) : shifts.length === 0
                      ? <span className="text-xs text-gray-300">—</span>
                      : shifts.map((us, i) => (
                        <span key={i} className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {us.shift?.start_time.slice(0, 5)} – {us.shift?.end_time.slice(0, 5)}
                        </span>
                      ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Solicitudes de ausencia */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="font-semibold text-gray-700">Mis solicitudes de ausencia</h4>
          </div>
          <div className="divide-y divide-gray-50">
            {absences.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">Sin solicitudes</p>}
            {absences.slice(0, 6).map((abs) => (
              <div key={abs.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">{abs.absence_type?.name ?? 'Ausencia'}</p>
                  <p className="text-xs text-gray-400">{abs.start_date} → {abs.end_date}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${abs.status === 'approved' ? 'bg-green-100 text-green-700' : abs.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {abs.status === 'approved' ? <MdCheckCircle size={13} /> : abs.status === 'rejected' ? <MdCancel size={13} /> : <MdPending size={13} />}
                  {abs.status === 'approved' ? 'Aprobada' : abs.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Últimos fichajes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-700">Últimos fichajes</h4>
        </div>
        <div className="divide-y divide-gray-50">
          {timeLogs.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">Sin registros</p>}
          {timeLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">{parseDate(log.date).toLocaleDateString('es-ES')}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">{formatTime(log.check_in)}</span>
                <span className="text-gray-400">→</span>
                <span className={log.check_out ? 'text-red-500 font-medium' : 'text-gray-400'}>{formatTime(log.check_out)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
