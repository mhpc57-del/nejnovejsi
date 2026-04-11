import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Eye, EyeSlash, ArrowLeft } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
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
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'supplier') navigate('/dodavatel');
      else navigate('/zakaznik');
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
    } catch (err) { /* silently ignore */ }
    finally { setResending(false); }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 64 64" fill="none"><path d="M20 24C20 17.4 25.4 12 32 12C38.6 12 44 17.4 44 24H20Z" fill="#f97316"/><rect x="17" y="23" width="30" height="5" rx="2.5" fill="#f97316"/><circle cx="32" cy="34" r="6" className="fill-zinc-900 dark:fill-white"/><path d="M24 42C24 42 26 39 32 39C38 39 40 42 40 42V50C40 51.1 39.1 52 38 52H26C24.9 52 24 51.1 24 50V42Z" className="fill-zinc-900 dark:fill-white"/><rect x="41" y="38" width="4" height="16" rx="2" fill="#f97316" transform="rotate(15 43 38)"/><circle cx="44" cy="37" r="3" stroke="#f97316" strokeWidth="2" fill="none"/><rect x="18" y="42" width="8" height="3.5" rx="1.75" className="fill-zinc-900 dark:fill-white"/><rect x="38" y="42" width="8" height="3.5" rx="1.75" className="fill-zinc-900 dark:fill-white"/><path d="M31 43L33 46H30L32 49" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Craft</span>
            <span className="text-2xl font-bold tracking-tight text-orange-500" style={{ fontFamily: 'Outfit' }}>Bolt</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Zpět
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Přihlášení</h1>
              <p className="text-sm text-zinc-500 mt-1">Vítejte zpět v CraftBolt</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/5 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 text-sm" data-testid="login-error">
                {error}
              </div>
            )}

            {showVerificationMessage && (
              <div className="mb-5 p-3.5 bg-orange-500/5 border border-orange-200 dark:border-orange-900/30 rounded-lg" data-testid="login-verification-message">
                <p className="text-orange-700 dark:text-orange-400 text-sm font-medium mb-1.5">Email nebyl ověřen</p>
                <p className="text-orange-600 dark:text-orange-400/80 text-sm mb-3">
                  Pro přihlášení musíte nejprve ověřit svůj email. Zkontrolujte svou schránku (včetně složky SPAM).
                </p>
                <button onClick={handleResendVerification} disabled={resending}
                  className="text-orange-600 hover:text-orange-700 font-medium text-sm underline transition-colors disabled:opacity-50"
                  data-testid="login-resend-verification-btn">
                  {resending ? 'Odesílám...' : 'Odeslat ověřovací email znovu'}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">E-mail</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz" required
                  className="w-full px-3.5 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors text-sm"
                  data-testid="login-email-input" />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Heslo</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full px-3.5 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors pr-12 text-sm"
                    data-testid="login-password-input" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    data-testid="toggle-password-btn">
                    {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link to="/zapomenute-heslo" className="text-sm text-orange-500 hover:text-orange-600 transition-colors" data-testid="forgot-password-link">
                  Zapomněli jste heslo?
                </Link>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/20 text-sm"
                data-testid="login-submit-btn">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Přihlašování...
                  </span>
                ) : 'Přihlásit se'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-zinc-500">
                Nemáte účet?{' '}
                <Link to="/registrace" className="text-orange-500 hover:text-orange-600 font-medium transition-colors" data-testid="register-link">
                  Registrujte se
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
