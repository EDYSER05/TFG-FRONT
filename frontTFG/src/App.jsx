import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TimeLogs from './pages/TimeLogs';
import AbsenceRequests from './pages/AbsenceRequests';
import TimeLogsManagement from './pages/TimeLogsManagement';
import AbsenceManagement from './pages/AbsenceManagement';
import MyDepartment from './pages/MyDepartment';
import Departments from './pages/Departments';
import Shifts from './pages/Shifts';
import Holidays from './pages/Holidays';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import ContactHR from './pages/ContactHR';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas: accesibles sin sesión */}
        <Route path="/login" element={<Login />} />
        <Route path="/cambiar-contrasena" element={<ChangePassword />} />

        {/* Rutas privadas: Layout actúa como shell y ProtectedRoute verifica la sesión */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="fichajes" element={<TimeLogs />} />
          <Route path="ausencias" element={<AbsenceRequests />} />
          {/* Solo empleados, hr y manager: requiere tener departamento asignado */}
          <Route path="departamento" element={
            <ProtectedRoute allowedRoles={['employee', 'hr', 'manager']}>
              <MyDepartment />
            </ProtectedRoute>
          } />
          <Route path="notificaciones" element={<Notifications />} />
          <Route path="contactar-rrhh" element={
            <ProtectedRoute allowedRoles={['employee', 'manager', 'hr']}>
              <ContactHR />
            </ProtectedRoute>
          } />
          <Route path="perfil" element={<Profile />} />
          {/* Rutas de gestión: solo roles con permisos de supervisión */}
          <Route path="fichajes-gestion" element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'hr']}>
              <TimeLogsManagement />
            </ProtectedRoute>
          } />
          <Route path="ausencias-gestion" element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'hr']}>
              <AbsenceManagement />
            </ProtectedRoute>
          } />
          <Route path="departamentos" element={
            <ProtectedRoute allowedRoles={['owner', 'hr']}>
              <Departments />
            </ProtectedRoute>
          } />
          <Route path="turnos" element={
            <ProtectedRoute allowedRoles={['owner', 'hr']}>
              <Shifts />
            </ProtectedRoute>
          } />
          <Route path="festivos" element={
            <ProtectedRoute allowedRoles={['owner', 'hr']}>
              <Holidays />
            </ProtectedRoute>
          } />
        </Route>
        {/* Cualquier ruta desconocida manda al dashboard (ProtectedRoute se encarga si no hay sesión) */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
