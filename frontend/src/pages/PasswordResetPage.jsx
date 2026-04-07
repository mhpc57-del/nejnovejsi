import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { EnvelopeSimple, LockKey, ArrowLeft, CheckCircle, Warning } from '@phosphor-icons/react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se odeslat email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle weight="fill" className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email odeslán</h2>
          <p className="text-gray-600 mb-6">
            Pokud je email <strong>{email}</strong> registrován, odeslali jsme na něj odkaz pro obnovení hesla. Zkontrolujte i složku SPAM.
          </p>
          <Link to="/prihlaseni" className="text-orange-500 hover:text-orange-600 font-medium" data-testid="back-to-login-link">
            Zpět na přihlášení
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <span className="text-2xl font-bold text-gray-900">Craft</span>
            <span className="text-2xl font-bold text-orange-500">Bolt</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Zapomenuté heslo</h2>
          <p className="text-gray-500 mt-1">Zadejte váš email a pošleme vám odkaz pro obnovení hesla</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2" data-testid="forgot-error">
            <Warning weight="bold" className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
            <div className="relative">
              <EnvelopeSimple className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="forgot-email-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            data-testid="forgot-submit-btn"
          >
            {loading ? 'Odesílám...' : 'Odeslat odkaz pro obnovení'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/prihlaseni" className="text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Zpět na přihlášení
          </Link>
        </div>
      </div>
    </div>
  );
};

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Neplatný odkaz pro obnovení hesla.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků');
      return;
    }
    if (password !== confirmPassword) {
      setError('Hesla se neshodují');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/prihlaseni'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se změnit heslo');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle weight="fill" className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Heslo změněno</h2>
          <p className="text-gray-600 mb-4">Vaše heslo bylo úspěšně změněno. Přesměrováváme vás na přihlášení...</p>
          <Link to="/prihlaseni" className="text-orange-500 hover:text-orange-600 font-medium" data-testid="goto-login-link">
            Přihlásit se
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <span className="text-2xl font-bold text-gray-900">Craft</span>
            <span className="text-2xl font-bold text-orange-500">Bolt</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Nastavení nového hesla</h2>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2" data-testid="reset-error">
            <Warning weight="bold" className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nové heslo</label>
            <div className="relative">
              <LockKey className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 znaků"
                required
                minLength={8}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="reset-password-input"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Potvrzení hesla</label>
            <div className="relative">
              <LockKey className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Zadejte heslo znovu"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="reset-confirm-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            data-testid="reset-submit-btn"
          >
            {loading ? 'Ukládám...' : 'Nastavit nové heslo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export { ForgotPasswordPage, ResetPasswordPage };
