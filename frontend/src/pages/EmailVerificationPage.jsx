import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Check, X, ArrowRight } from '@phosphor-icons/react';

const EmailVerificationPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await axios.get(`${API}/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(response.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Ověření se nezdařilo');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">Craft</span>
            <span className="text-2xl font-bold text-orange-500">Bolt</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Ověřuji email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8" data-testid="verification-success">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check weight="bold" className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Email ověřen!</h1>
              <p className="text-gray-500 mb-8">{message}</p>
              <Link
                to="/prihlaseni"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-8 rounded-xl transition-colors"
                data-testid="go-to-login-btn"
              >
                Přihlásit se
                <ArrowRight weight="bold" className="w-5 h-5" />
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8" data-testid="verification-error">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <X weight="bold" className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Ověření se nezdařilo</h1>
              <p className="text-gray-500 mb-8">{message}</p>
              <Link
                to="/registrace"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-8 rounded-xl transition-colors"
                data-testid="go-to-register-btn"
              >
                Zkusit znovu
                <ArrowRight weight="bold" className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
