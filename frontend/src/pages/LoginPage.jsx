import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Eye, EyeSlash, ArrowLeft } from '@phosphor-icons/react';
import ThemeToggle from '../components/ThemeToggle';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [resending, setResending] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowVerificationMessage(false);
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'supplier') {
        navigate('/dodavatel');
      } else if (user.role === 'customer_supplier') {
        navigate('/zakaznik');
      } else {
        navigate('/zakaznik');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail === 'EMAIL_NOT_VERIFIED') {
        setShowVerificationMessage(true);
        setError('');
      } else if (detail === 'Invalid credentials') {
        setError('Neplatný email nebo heslo');
      } else {
        setError(detail || 'Přihlášení se nezdařilo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, { email });
    } catch (err) {
      // silently ignore
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">Craft</span>
            <span className="text-2xl font-bold text-orange-500">Bolt</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Zpět na hlavní stránku
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Přihlášení</h1>
              <p className="text-gray-500">Vítejte zpět v CraftBolt</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm" data-testid="login-error">
                {error}
              </div>
            )}

            {showVerificationMessage && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg" data-testid="login-verification-message">
                <p className="text-orange-700 text-sm font-medium mb-2">Email nebyl ověřen</p>
                <p className="text-orange-600 text-sm mb-3">
                  Pro přihlášení musíte nejprve ověřit svůj email. Zkontrolujte svou emailovou schránku (včetně složky SPAM).
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-orange-600 hover:text-orange-700 font-medium text-sm underline transition-colors disabled:opacity-50"
                  data-testid="login-resend-verification-btn"
                >
                  {resending ? 'Odesílám...' : 'Odeslat ověřovací email znovu'}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                  data-testid="login-email-input"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Heslo
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors pr-12"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    data-testid="toggle-password-btn"
                  >
                    {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link to="/zapomenute-heslo" className="text-sm text-orange-500 hover:text-orange-600" data-testid="forgot-password-link">
                  Zapomněli jste heslo?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Přihlašování...
                  </span>
                ) : (
                  'Přihlásit se'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-500">
                Nemáte účet?{' '}
                <Link to="/registrace" className="text-orange-500 hover:text-orange-600 font-medium" data-testid="register-link">
                  Registrujte se
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
