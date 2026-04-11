import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { CheckCircle, XCircle, CreditCard, Spinner, ArrowLeft } from '@phosphor-icons/react';
import CraftBoltLogo from '../components/CraftBoltLogo';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId || !token) return;

    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 2000;

    const pollStatus = async () => {
      try {
        const response = await axios.get(`${API}/subscription/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.payment_status === 'paid') {
          setStatus('success');
          setPaymentInfo(response.data);
          return;
        } else if (response.data.status === 'expired') {
          setStatus('expired');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, pollInterval);
        } else {
          setStatus('timeout');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
      }
    };

    pollStatus();
  }, [sessionId, token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">Ověřujeme platbu...</h2>
          <p className="text-zinc-600">Prosím počkejte, zpracováváme vaši platbu.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle weight="fill" className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Platba úspěšná!</h2>
          <p className="text-zinc-600 mb-6">
            Vaše předplatné <strong>{paymentInfo?.plan_name}</strong> bylo aktivováno.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-zinc-600">Tarif:</span>
              <span className="font-semibold">{paymentInfo?.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Zaplaceno:</span>
              <span className="font-semibold">{paymentInfo?.amount} {paymentInfo?.currency}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Přejít do aplikace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle weight="fill" className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          {status === 'expired' ? 'Platba vypršela' : 'Chyba při platbě'}
        </h2>
        <p className="text-zinc-600 mb-6">
          {status === 'expired' 
            ? 'Platební relace vypršela. Zkuste to prosím znovu.'
            : 'Nepodařilo se ověřit platbu. Zkontrolujte svůj email nebo kontaktujte podporu.'}
        </p>
        <button
          onClick={() => navigate('/cenik')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  );
};

const PaymentCancelled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle weight="fill" className="w-12 h-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Platba zrušena</h2>
        <p className="text-zinc-600 mb-6">
          Platba byla zrušena. Můžete to zkusit znovu kdykoliv.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/cenik')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Zpět na ceník
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-gray-200 text-zinc-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Na hlavní stránku
          </button>
        </div>
      </div>
    </div>
  );
};

const PricingPage = () => {
  const [processingPlan, setProcessingPlan] = useState(null);
  const { token, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = async (billingPeriod) => {
    if (!isAuthenticated) {
      navigate('/prihlaseni', { state: { from: '/cenik' } });
      return;
    }

    setProcessingPlan(billingPeriod);

    try {
      const response = await axios.post(
        `${API}/subscription/checkout`,
        {
          plan_id: 'dodavatel',
          billing_period: billingPeriod,
          payment_mode: 'one_time',
          origin_url: window.location.origin
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Chyba při vytváření platby. Zkuste to prosím znovu.');
      setProcessingPlan(null);
    }
  };

  const supplierFeatures = [
    'Neomezený přístup k zakázkám',
    'Výběr zakázky dle svých možností',
    'Online chat se zákazníky',
    'Ověřený profil nahráním oprávnění',
    'Volba více kategorií',
    'Vkládání fotografií',
    'Notifikace (E-mail, SMS)',
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold">
            <CraftBoltLogo size="sm" />
          </a>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-white"
            data-testid="pricing-back-btn"
          >
            <ArrowLeft weight="bold" />
            Zpět
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-orange-500 font-bold text-sm tracking-wider uppercase">Ceník</span>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mt-2 mb-4">
            Jednoduchý a férový ceník
          </h1>
          <p className="text-zinc-600 text-lg mb-6">
            Zákazníci vkládají poptávky zdarma. Dodavatelé si zvolí měsíční nebo roční přístup.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Customer card */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200 shadow-lg flex flex-col" data-testid="plan-card-zakaznik">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Zákazník</h3>
            <p className="text-sm text-zinc-500 mb-3">Vkládání poptávek je</p>
            <span className="text-5xl font-bold text-orange-500 mb-6" style={{ fontFamily: 'Outfit' }}>ZDARMA</span>
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 mb-6 flex-1">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Volitelné ověření poptávky za <strong className="text-orange-500">49 Kč</strong> — dodavatelé uvidí, že to myslíte vážně.
              </p>
            </div>
            <button onClick={() => navigate('/registrace?role=customer')}
              className="w-full py-3 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg font-semibold text-white text-sm transition-colors"
              data-testid="plan-btn-zakaznik">
              Registrace zákazníka
            </button>
          </div>

          {/* Supplier card */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 ring-2 ring-orange-500 shadow-xl flex flex-col relative" data-testid="plan-card-dodavatel">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">PRO ŘEMESLNÍKY</span>
            </div>
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Dodavatel</h3>
            
            <ul className="space-y-2.5 mb-6 flex-1">
              {supplierFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-zinc-600 text-sm">
                  <CheckCircle weight="fill" className="text-green-500 flex-shrink-0 mt-0.5 w-4 h-4" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <button onClick={() => handleSubscribe('monthly')} disabled={processingPlan !== null}
                data-testid="subscribe-monthly-btn"
                className="w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                {processingPlan === 'monthly' ? (
                  <><Spinner className="w-5 h-5 animate-spin" /> Zpracování...</>
                ) : (
                  <><CreditCard weight="bold" /> 190 Kč / měsíc</>
                )}
              </button>
              <button onClick={() => handleSubscribe('annual')} disabled={processingPlan !== null}
                data-testid="subscribe-annual-btn"
                className="w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 border-2 border-orange-500 text-orange-500 hover:bg-orange-500/5 disabled:opacity-50 disabled:cursor-not-allowed">
                {processingPlan === 'annual' ? (
                  <><Spinner className="w-5 h-5 animate-spin" /> Zpracování...</>
                ) : (
                  <><CreditCard weight="bold" /> 1 890 Kč / rok (ušetříte 390 Kč)</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-zinc-600 text-sm bg-zinc-100 dark:bg-zinc-800 py-3 px-6 rounded-full inline-block">
            Platba kartou přes zabezpečenou bránu Stripe. <strong>Všechny ceny jsou uvedeny včetně 21% DPH.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export { PaymentSuccess, PaymentCancelled, PricingPage };
