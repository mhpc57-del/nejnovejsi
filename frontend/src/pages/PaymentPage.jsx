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
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const { token, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/subscription/plans`);
        setPlans(response.data.plans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId) => {
    if (!isAuthenticated) {
      navigate('/prihlaseni', { state: { from: '/cenik', planId } });
      return;
    }

    setProcessingPlan(planId);

    try {
      const response = await axios.post(
        `${API}/subscription/checkout`,
        {
          plan_id: planId,
          billing_period: billingPeriod === 'yearly' ? 'annual' : 'monthly',
          origin_url: window.location.origin
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Chyba při vytváření platby. Zkuste to prosím znovu.');
      setProcessingPlan(null);
    }
  };

  const planOrder = ['zakaznik', 'dodavatel', 'zakaznik_dodavatel'];

  const planFeatures = {
    zakaznik: [
      'Neomezený počet zadání',
      'Výběr z ověřených dodavatelů',
      'Online chat s dodavateli',
      'Zamítnutí nabídek',
      'Úpravy stávajících nabídek',
      'Vkládání fotografií',
      'Notifikace (APP, E-mail, SMS)',
    ],
    dodavatel: [
      'Neomezený přístup k zakázkám',
      'Výběr zakázky dle svých možností',
      'Online chat se zákazníky',
      'Ověřený profil nahráním oprávnění',
      'Volba více kategorií',
      'Vkládání fotografií',
      'Notifikace (APP, E-mail, SMS)',
    ],
    zakaznik_dodavatel: [
      'Vše z tarifu Zákazník',
      'Vše z tarifu Dodavatel',
      'Zadávání i přijímání zakázek',
      'Kompletní přístup ke všem funkcím',
      'Online chat se všemi uživateli',
      'Vkládání fotografií',
      'Notifikace (APP, E-mail, SMS)',
    ],
  };

  const planLabels = {
    zakaznik: 'Začít jako zákazník',
    dodavatel: 'Začít jako dodavatel',
    zakaznik_dodavatel: 'Začít s plným přístupem',
  };

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
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-orange-500 font-bold text-sm tracking-wider uppercase">Ceník</span>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mt-2 mb-4">
            Jednoduchý a férový ceník.
          </h1>
          <p className="text-zinc-600 text-lg mb-6">
            Vyberte si tarif podle toho, zda hledáte řemeslníka, nabízíte služby, nebo obojí.
          </p>
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3" data-testid="pricing-billing-toggle">
            <span className={`text-sm font-medium transition-colors ${billingPeriod === 'monthly' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Měsíčně</span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 bg-zinc-200 dark:bg-zinc-700 rounded-full transition-colors"
            >
              <div className={`absolute top-1 w-5 h-5 bg-orange-500 rounded-full transition-all duration-200 ${billingPeriod === 'yearly' ? 'left-8' : 'left-1'}`} />
            </button>
            <span className={`text-sm font-medium transition-colors ${billingPeriod === 'yearly' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
              Ročně <span className="text-orange-500 font-bold">-10%</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <Spinner className="w-12 h-12 text-orange-500 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {planOrder.map((planId) => {
              const plan = plans[planId];
              if (!plan) return null;
              const isHighlighted = planId === 'zakaznik_dodavatel';

              return (
                <div
                  key={planId}
                  data-testid={`plan-card-${planId}`}
                  className={`bg-white dark:bg-zinc-900 rounded-xl p-7 flex flex-col ${
                    isHighlighted 
                      ? 'ring-2 ring-orange-500 shadow-xl relative' 
                      : 'border border-zinc-200 shadow-lg'
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                        NEJLEPŠÍ HODNOTA
                      </span>
                    </div>
                  )}

                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline mb-1">
                    <span className="text-sm text-zinc-500 mr-1">od</span>
                    <span className="text-4xl font-bold text-zinc-900 dark:text-white">
                      {billingPeriod === 'yearly'
                        ? Math.round(plan.price_annual).toLocaleString('cs-CZ')
                        : Math.round(plan.price_monthly)
                      }
                    </span>
                    <span className="text-zinc-500 ml-2 text-sm">
                      {billingPeriod === 'yearly' ? 'Kč/rok' : 'Kč/měsíc'}
                    </span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-zinc-400 line-through text-sm">
                        {Math.round(plan.price_monthly * 12).toLocaleString('cs-CZ')} Kč
                      </span>
                      <span className="text-orange-500 text-xs font-bold">
                        UŠETŘÍTE {Math.round(plan.price_monthly * 12 - plan.price_annual).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  )}
                  <p className="text-orange-500 text-sm mb-5">{plan.trial_days} dní zdarma na vyzkoušení</p>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {(planFeatures[planId] || []).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-600 text-sm">
                        <CheckCircle weight="fill" className="text-green-500 flex-shrink-0 mt-0.5 w-4 h-4" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(planId)}
                    disabled={processingPlan !== null}
                    data-testid={`subscribe-${planId}-btn`}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      isHighlighted
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processingPlan === planId ? (
                      <>
                        <Spinner className="w-5 h-5 animate-spin" />
                        Zpracování...
                      </>
                    ) : (
                      <>
                        <CreditCard weight="bold" />
                        {planLabels[planId] || 'Předplatit'}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <p className="text-zinc-600 text-sm bg-zinc-100 dark:bg-zinc-800 py-3 px-6 rounded-full inline-block">
            Platba kartou přes zabezpečenou bránu Stripe. <strong>Předplatné můžete kdykoliv zrušit.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export { PaymentSuccess, PaymentCancelled, PricingPage };
