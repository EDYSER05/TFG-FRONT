// El backend devuelve fechas en DD-MM-YYYY y horas en HH:MM:SS
// Los inputs de fecha en HTML necesitan YYYY-MM-DD, de ahí las conversiones

const pad = (n) => String(n).padStart(2, '0');

// devuelve la fecha de hoy en el formato que espera el backend
// Ej de output: "21-06-2025"
export function getToday() {
  const hoy = new Date();
  return `${pad(hoy.getDate())}-${pad(hoy.getMonth() + 1)}-${hoy.getFullYear()}`;
}

// devuelve la fecha de hoy en el formato que necesitan los campos de fecha del formulario
// Ej de output: "2025-06-21"
export function getTodayISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
}

// devuelve la hora actual para enviarla al registrar un fichaje
// Ej de output: "08:45:30"
export function getNow() {
  const ahora = new Date();
  return `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
}

// convierte un string del backend a un objeto fecha que el navegador pueda manejar
// acepta tanto una hora sola ("08:45:00") como una fecha con hora ("21-06-2025 08:45:00")
export function parseDate(s) {
  if (!s.includes('-')) {
    // si no tiene guiones asumimos que es solo una hora y la aplicamos sobre el día de hoy
    const [h, min, seg] = s.split(':').map(Number);
    const hoy = new Date();
    hoy.setHours(h, min, seg, 0);
    return hoy;
  }
  // si no viene la hora asumimos medianoche para no tener problemas al comparar días
  const [fechaParte, horaParte = '00:00:00'] = s.split(' ');
  const [dia, mes, anio] = fechaParte.split('-');
  // invertimos el orden porque el navegador solo entiende el formato YYYY-MM-DD
  return new Date(`${anio}-${mes}-${dia}T${horaParte}`);
}

// devuelve solo la hora de un valor de fecha/hora del backend
// Ej de output: "08:45"
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

// devuelve la fecha y hora juntas en formato corto, para notificaciones y registros
// Ej de output: "21/6/2025, 8:45"
export function formatDateTime(dt) {
  if (!dt) return '—';
  try {
    const fecha = parseDate(dt);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

// calcula el tiempo trabajado entre la entrada y la salida
// Ej de output: "8h 30m" o "45m" si es menos de una hora
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

// convierte una fecha del backend al formato que necesita el campo de fecha del formulario
// Ej de output: "2025-06-21"
export function toInputDate(s) {
  if (!s) return '';
  const partes = s.split('-');
  if (partes.length !== 3) return s;
  // si el primer segmento tiene 2 dígitos la fecha viene en DD-MM-YYYY y hay que darle la vuelta
  return partes[0].length === 2 ? `${partes[2]}-${partes[1]}-${partes[0]}` : s;
}

// convierte una fecha a número eliminando la hora para poder comparar solo el día
// necesario porque comparar fechas con horas distintas da resultados incorrectos
export function toMidnightTimestamp(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// comprueba si una fecha cae dentro del rango de inicio y fin de una ausencia
export function isDateInRange(date, startStr, endStr) {
  const diaNum = toMidnightTimestamp(date);
  const inicioNum = toMidnightTimestamp(parseDate(startStr));
  const finNum = toMidnightTimestamp(parseDate(endStr));
  return diaNum >= inicioNum && diaNum <= finNum;
}

// calcula el lunes de la semana a la que pertenece una fecha
// el domingo tiene un tratamiento especial porque si no el cálculo se va a la semana siguiente
export function getMonday(date) {
  const mondayDate = new Date(date);
  const weekday = mondayDate.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  mondayDate.setDate(mondayDate.getDate() + diff);
  mondayDate.setHours(0, 0, 0, 0);
  return mondayDate;
}

// relaciona el nombre de cada día con su número de orden en la semana
// domingo vale 0 porque así lo devuelve el navegador, aunque visualmente vaya al final
export const DIAS_SEMANA = {
  Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6, Domingo: 0,
};

// nombres cortos de los días ordenados por su número de orden (0 = domingo, 1 = lunes, etc.)
export const DIAS_ABREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
