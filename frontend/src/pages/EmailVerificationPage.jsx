import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Check, X, ArrowRight } from '@phosphor-icons/react';
import ThemeToggle from '../components/ThemeToggle';
import CraftBoltLogo from '../components/CraftBoltLogo';

const EmailVerificationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const response = await axios.get(`${API}/auth/verify-email/${token}`);
        if (!cancelled) {
          setStatus('success');
          setMessage(response.data.message || 'Email byl úspěšně ověřen.');
        }
      } catch (err) {
        if (!cancelled) {
          // If 400, the token was already consumed (possibly by this same double-render)
          // Check if it says "already verified"
          const detail = err.response?.data?.detail || '';
          if (detail.includes('již ověřili') || detail.includes('already')) {
            setStatus('success');
            setMessage('Email byl úspěšně ověřen. Můžete se přihlásit.');
          } else {
            setStatus('error');
            setMessage(detail || 'Ověření se nezdařilo. Odkaz mohl vypršet.');
          }
        }
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [token]);

  // Auto-redirect to login after successful verification
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/prihlaseni');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <CraftBoltLogo size="sm" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-zinc-500">Ověřuji váš email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 p-8" data-testid="verification-success">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check weight="bold" className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">Email úspěšně ověřen!</h1>
              <p className="text-zinc-600 mb-3">{message}</p>
              <p className="text-sm text-zinc-400 mb-6">
                Budete automaticky přesměrováni na přihlášení za <span className="font-bold text-orange-500">{countdown}</span> sekund...
              </p>
              <Link
                to="/prihlaseni"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
                data-testid="go-to-login-btn"
              >
                Přihlásit se nyní
                <ArrowRight weight="bold" className="w-5 h-5" />
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 p-8" data-testid="verification-error">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <X weight="bold" className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">Ověření se nezdařilo</h1>
              <p className="text-zinc-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/prihlaseni"
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
                  data-testid="go-to-login-btn"
                >
                  Přihlásit se
                  <ArrowRight weight="bold" className="w-5 h-5" />
                </Link>
                <p className="text-sm text-zinc-400">
                  Pokud je váš email již ověřen, můžete se rovnou přihlásit.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
