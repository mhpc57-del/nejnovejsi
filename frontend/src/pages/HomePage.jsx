import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import HeroSection from '../components/HeroSection';
import CraftBoltLogo from '../components/CraftBoltLogo';
import ThemeToggle from '../components/ThemeToggle';
import HeaderWidget from '../components/HeaderWidget';
import {
  AdvantagesSection,
  MobileAppBanner,
  HowItWorksSection,
  PricingSection,
  PromotedSuppliersSection,
  CTASection,
  HomeFooter,
  CookieBanner,
  QuickDemandModal,
  PromoFormModal,
} from '../components/home';

const HomePage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showCookies, setShowCookies] = useState(true);
  const [showQuickDemand, setShowQuickDemand] = useState(false);
  const [quickForm, setQuickForm] = useState({ first_name: '', last_name: '', email: '', phone: '', description: '' });
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [platformStats, setPlatformStats] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [promotedSuppliers, setPromotedSuppliers] = useState([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ company_name: '', bio: '', phone: '', website: '', logo_url: '', duration: 'day' });
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoUploadingLogo, setPromoUploadingLogo] = useState(false);

  useEffect(() => {
    fetch(`${API}/platform/stats`).then(r => r.json()).then(setPlatformStats).catch(() => {});
    fetch(`${API}/promoted-suppliers`).then(r => r.json()).then(d => setPromotedSuppliers(d.suppliers || [])).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const promoSuccess = params.get('promo_success');
    if (promoSuccess) {
      // Activate promo banner + retry
      const activatePromo = async (id, attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
          try {
            await fetch(`${API}/promoted-suppliers/${id}/activate`, { method: 'POST' });
            const res = await fetch(`${API}/promoted-suppliers`);
            const data = await res.json();
            setPromotedSuppliers(data.suppliers || []);
            return;
          } catch (e) {
            if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000));
          }
        }
      };
      activatePromo(promoSuccess);
      window.history.replaceState({}, '', '/');
    }
    const interval = setInterval(() => {
      fetch(`${API}/platform/stats`).then(r => r.json()).then(setPlatformStats).catch(() => {});
    }, 30000);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => { clearInterval(interval); window.removeEventListener('scroll', onScroll); };
  }, []);

  const handlePromoLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPromoUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/upload/public`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPromoForm(p => ({ ...p, logo_url: res.data.url }));
    } catch { /* ignore */ }
    setPromoUploadingLogo(false);
  };

  const handlePromoSubmit = async () => {
    if (!promoForm.company_name || !promoForm.bio || !promoForm.phone) return;
    setPromoLoading(true);
    try {
      const res = await axios.post(`${API}/promoted-suppliers`, promoForm);
      const checkoutRes = await axios.post(`${API}/promoted-suppliers/${res.data.id}/create-checkout`);
      window.location.href = checkoutRes.data.checkout_url;
    } catch (err) {
      setPromoLoading(false);
    }
  };

  const handleQuickDemand = async () => {
    if (!quickForm.first_name || !quickForm.last_name || !quickForm.phone || !quickForm.email) {
      setQuickError('Vyplnte vsechna povinna pole');
      return;
    }
    setQuickLoading(true);
    setQuickError('');
    try {
      await axios.post(`${API}/demands/quick`, quickForm);
      setQuickSuccess(true);
    } catch (err) {
      setQuickError(err.response?.data?.detail || 'Nepodařilo se odeslat poptávku');
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl backdrop-saturate-150 border-b border-zinc-200/60 dark:border-zinc-800/60 shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-5">
              <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
                <CraftBoltLogo size="sm" />
              </Link>
              <div className="hidden sm:block">
                <HeaderWidget />
              </div>
            </div>
            <nav className="flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors" data-testid="dashboard-link">
                    Hlavní menu
                  </Link>
                  <button onClick={logout} className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors" data-testid="logout-btn">
                    Odhlásit
                  </button>
                </>
              ) : (
                <>
                  <Link to="/prihlaseni" className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors" data-testid="login-link">
                    Přihlášení
                  </Link>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <Link to="/registrace" className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors" data-testid="register-btn">
                    Registrace
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <HeroSection />

      {/* Platform Stats */}
      {platformStats && (
        <section className="border-y border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950" data-testid="platform-stats-section">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
            <div className="grid grid-cols-3 divide-x divide-zinc-200/80 dark:divide-zinc-800">
              {[
                { label: 'Zákazníci', value: platformStats.customers, color: 'text-emerald-500', id: 'stat-customers' },
                { label: 'Dodavatelé', value: platformStats.suppliers, color: 'text-orange-500', id: 'stat-suppliers' },
                { label: 'Online', value: platformStats.online || 0, color: 'text-emerald-500', id: 'stat-online', isOnline: true },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-center gap-3 py-5" data-testid={stat.id}>
                  {stat.isOnline ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${stat.color === 'text-emerald-500' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  )}
                  <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">{stat.label}</span>
                  <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <AdvantagesSection />
      <MobileAppBanner />
      <HowItWorksSection />
      <PricingSection />
      <PromotedSuppliersSection promotedSuppliers={promotedSuppliers} onShowPromoForm={() => setShowPromoForm(true)} />
      <CTASection />
      <HomeFooter />

      {showCookies && <CookieBanner onAccept={() => setShowCookies(false)} />}

      {showQuickDemand && (
        <QuickDemandModal
          quickForm={quickForm} setQuickForm={setQuickForm}
          quickLoading={quickLoading} quickSuccess={quickSuccess} quickError={quickError}
          onSubmit={handleQuickDemand} onClose={() => setShowQuickDemand(false)}
          onReset={() => { setShowQuickDemand(false); setQuickSuccess(false); setQuickForm({ first_name: '', last_name: '', email: '', phone: '', description: '' }); }}
        />
      )}

      {showPromoForm && (
        <PromoFormModal
          promoForm={promoForm} setPromoForm={setPromoForm}
          promoLoading={promoLoading} promoUploadingLogo={promoUploadingLogo}
          onSubmit={handlePromoSubmit} onClose={() => setShowPromoForm(false)}
          onLogoUpload={handlePromoLogoUpload}
        />
      )}
    </div>
  );
};

export default HomePage;
