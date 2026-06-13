import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión activa evitamos mostrar el login
  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/login', { email, password });
      const { token, user: basicUser, must_change_password } = res.data;

      // Pedimos el usuario completo porque /login solo devuelve datos básicos sin relaciones
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      const userRes = await api.get(`/users/${basicUser.id}`, authHeader);
      const fullUser = userRes.data.data ?? basicUser;

      let companyId = fullUser.department?.company_id ?? null;

      // Owner sin departamento: buscamos su empresa por propietario
      if (!companyId && fullUser.role?.name === 'owner') {
        try {
          const companiesRes = await api.get('/companies', authHeader);
          const companies = companiesRes.data.data ?? [];
          const myCompany = companies.find((company) => company.owner?.id === fullUser.id);
          if (myCompany) companyId = myCompany.id;
        } catch {/**/}
      }

      // El admin usa el panel Blade en /admin
      if (fullUser.role?.name === 'admin') {
        // El panel admin es Laravel/Blade en el backend (puerto 8000)
        window.location.href = 'http://localhost:8000/admin';
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(fullUser));
      // Guardamos company_id como string vacío si es null para que localStorage no guarde "null"
      localStorage.setItem('company_id', companyId !== null ? String(companyId) : '');

      // Comprobamos ambas fuentes porque el backend puede devolverlo en /login o en /users/:id
      const mustChange = must_change_password || fullUser.must_change_password || false;
      navigate(mustChange ? '/cambiar-contrasena' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/images/logo.jpg" alt="NexTime" className="h-24 mx-auto mb-3 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.4)] ring-1 ring-white/10" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="usuario@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg transition text-sm mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
