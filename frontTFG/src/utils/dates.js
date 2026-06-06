// Funciones de fechas compartidas; el backend usa DD-MM-YYYY y los inputs necesitan YYYY-MM-DD

// Devuelve la fecha de hoy en formato DD-MM-YYYY, que es el que espera el backend
export function getToday() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${dia}-${mes}-${hoy.getFullYear()}`;
}

// Devuelve la fecha de hoy en formato YYYY-MM-DD, necesario para los inputs type="date"
export function getTodayISO() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// Devuelve la hora actual como "HH:MM:SS" para enviarla al registrar un fichaje
export function getNow() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
}

// Convierte un string del backend a Date; acepta "HH:MM:SS" y "DD-MM-YYYY HH:MM:SS"
export function parseDate(s) {
  if (!s.includes('-')) {
    const [h, min, seg] = s.split(':').map(Number);
    const hoy = new Date();
    hoy.setHours(h, min, seg, 0);
    return hoy;
  }
  const [fechaParte, horaParte = '00:00:00'] = s.split(' ');
  const [dia, mes, anio] = fechaParte.split('-');
  return new Date(`${anio}-${mes}-${dia}T${horaParte}`);
}

// Recibe un valor de hora/fecha del backend y lo devuelve en formato "HH:MM" para mostrar
export function formatTime(dt) {
  if (!dt) return '—';
  try {
    const fecha = parseDate(dt);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

// Calcula cuánto tiempo hay entre la entrada y la salida y lo devuelve como "8h 30m"
export function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '—';
  try {
    const entrada = parseDate(checkIn);
    const salida = parseDate(checkOut);
    if (isNaN(entrada.getTime()) || isNaN(salida.getTime())) return '—';
    const minutosTotales = (salida.getTime() - entrada.getTime()) / 60000;
    if (minutosTotales <= 0) return '—';
    const horas = Math.floor(minutosTotales / 60);
    const minutos = Math.floor(minutosTotales % 60);
    return horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
  } catch {
    return '—';
  }
}

// Pasa una fecha de "DD-MM-YYYY" a "YYYY-MM-DD" para poder usarla en inputs type="date"
export function toInputDate(s) {
  if (!s) return '';
  const partes = s.split('-');
  if (partes.length !== 3) return s;
  return partes[0].length === 2 ? `${partes[2]}-${partes[1]}-${partes[0]}` : s;
}

// Relaciona cada nombre de día con el número que devuelve Date.getDay() en JavaScript
export const DIAS_SEMANA = {
  Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6, Domingo: 0,
};

// Nombres cortos de los días; el índice corresponde al número JS del día (0 = domingo)
export const DIAS_ABREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
