import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAccessTime, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/login', { email, password });
      const { token, user: rawUser, must_change_password } = res.data;

      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      const userRes = await api.get(`/users/${rawUser.id}`, authHeader);
      const fullUser = userRes.data.data ?? rawUser;

      let companyId = fullUser.department?.company_id ?? null;

      // Owner sin departamento: buscamos su empresa por propietario
      if (!companyId && fullUser.role?.name === 'owner') {
        try {
          const companiesRes = await api.get('/companies', authHeader);
          const companies = companiesRes.data.data ?? [];
          const myCompany = companies.find((c) => c.owner?.id === fullUser.id);
          if (myCompany) companyId = myCompany.id;
        } catch {/**/}
      }

      // El admin usa el panel Blade en /admin, no este SPA
      if (fullUser.role?.name === 'admin') {
        window.location.href = '/admin';
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(fullUser));
      localStorage.setItem('company_id', companyId !== null ? String(companyId) : '');

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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <MdAccessTime size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">NexTime</h1>
          <p className="text-slate-400 mt-1">Gestión de control horario</p>
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
