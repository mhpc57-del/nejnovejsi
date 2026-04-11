import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  UserCircle, 
  Briefcase, 
  ShieldCheck, 
  CurrencyDollar, 
  DeviceMobile, 
  MapPin,
  Lightning,
  ChatCircle,
  Tag,
  Star,
  Users,
  ArrowRight,
  Check,
  X,
  Clock,
  Wrench,
  House,
  CaretDown,
  Play,
  Plus
} from '@phosphor-icons/react';
import HeroSection from '../components/HeroSection';
import StepsSlider from '../components/StepsSlider';
import CraftBoltLogo from '../components/CraftBoltLogo';
import ThemeToggle from '../components/ThemeToggle';
import HeaderWidget from '../components/HeaderWidget';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } })
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } }
};

const HomePage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showCookies, setShowCookies] = useState(true);
  const [activeStep, setActiveStep] = useState(null);
  const [showQuickDemand, setShowQuickDemand] = useState(false);
  const [quickForm, setQuickForm] = useState({ first_name: '', last_name: '', email: '', phone: '', description: '' });
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [platformStats, setPlatformStats] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [promotedSuppliers, setPromotedSuppliers] = useState([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ company_name: '', bio: '', phone: '', website: '', logo_url: '' });
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoUploadingLogo, setPromoUploadingLogo] = useState(false);

  useEffect(() => {
    fetch(`${API}/platform/stats`).then(r => r.json()).then(setPlatformStats).catch(() => {});
    fetch(`${API}/promoted-suppliers`).then(r => r.json()).then(d => setPromotedSuppliers(d.suppliers || [])).catch(() => {});
    // Handle promo success redirect from Stripe
    const params = new URLSearchParams(window.location.search);
    const promoSuccess = params.get('promo_success');
    if (promoSuccess) {
      fetch(`${API}/promoted-suppliers/${promoSuccess}/activate`, { method: 'POST' })
        .then(() => fetch(`${API}/promoted-suppliers`).then(r => r.json()).then(d => setPromotedSuppliers(d.suppliers || [])))
        .catch(() => {});
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

  const advantages = [
    { icon: UserCircle, title: "Registrace bez IČ", desc: "Možnost přivýdělku jako zaměstnanec. Nepotřebujete živnostenský list." },
    { icon: CurrencyDollar, title: "Nejlevnější platforma", desc: "Měsíční paušál bez dalších poplatků a skrytých provizí." },
    { icon: DeviceMobile, title: "Mobilní aplikace", desc: "Nativní aplikace pro Android i iOS je ve vývoji.", badge: "Již brzy" },
    { icon: ShieldCheck, title: "Neřešíme registry", desc: "Každý se může dostat do problémů. Dáváme druhou šanci." },
    { icon: MapPin, title: "Geolokace", desc: "Zjištění online polohy mezi zákazníkem a dodavatelem." },
    { icon: Lightning, title: "Rychlé zakázky", desc: "Bez zbytečného papírování. Zakázka do 5 minut." },
    { icon: ChatCircle, title: "Online CHAT", desc: "Diskrétní chat přímo v aplikaci." },
    { icon: Tag, title: "Zjištění ceny", desc: "Dodavatel nabídne odhadovanou cenu před zahájením." },
    { icon: Star, title: "Hodnocení", desc: "Hodnocení udělují skuteční zákazníci." },
    { icon: Users, title: "Skutečné profily", desc: "Žádné FAKE účty. Pouze ověření uživatelé." },
  ];

  const steps = [
    { num: "01", title: "Zákazník zadá zakázku", desc: "Vybere kategorii, popíše požadavek, přidá fotografie, zadá adresu a termín." },
    { num: "02", title: "Dodavatel přijme zakázku", desc: "Dodavatel z okolí dostane upozornění, prohlédne poptávku a zahájí chat." },
    { num: "03", title: "Realizace díla", desc: "Dodavatel provede práci transparentně a bez prostředníka." },
    { num: "04", title: "Předání díla", desc: "Dodavatel řádně předá provedené dílo či službu." },
    { num: "05", title: "Vzájemné hodnocení", desc: "Obě strany ohodnotí spolupráci. Recenze budují důvěru." },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      {/* ───── Header ───── */}
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

      {/* ───── Hero ───── */}
      <HeroSection />

      {/* ───── Platform Stats ───── */}
      {platformStats && (
        <section className="border-y border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm" data-testid="platform-stats-section">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-5">
            <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
              {[
                { label: 'Zákazníci', value: platformStats.customers, color: 'bg-emerald-500', textColor: 'text-emerald-600', id: 'stat-customers' },
                { label: 'Dodavatelé', value: platformStats.suppliers, color: 'bg-red-500', textColor: 'text-red-500', id: 'stat-suppliers' },
                { label: 'Zákazníci/Dodavatelé', value: platformStats.customer_suppliers, color: 'bg-orange-500', textColor: 'text-orange-500', id: 'stat-both' },
                { label: 'Online', value: platformStats.online || 0, color: 'bg-emerald-500', textColor: 'text-emerald-500', id: 'stat-online', isOnline: true },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2.5" data-testid={stat.id}>
                  {stat.isOnline ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                  ) : (
                    <div className={`w-2.5 h-2.5 rounded-full ${stat.color}`} />
                  )}
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-medium">{stat.label}</span>
                  <span className={`text-base font-bold ${stat.textColor}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── Advantages ───── */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div className="mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={staggerContainer}>
            <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Proč si vybrat nás</motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-4" style={{ fontFamily: 'Outfit' }}>
              Výhody oproti konkurenci
            </motion.h2>
          </motion.div>
          
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={staggerContainer}>
            {advantages.map((adv, index) => (
              <motion.div key={index} variants={fadeUp} custom={index}
                className="group bg-white dark:bg-zinc-900 rounded-lg p-5 border border-zinc-200/80 dark:border-zinc-800 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20 transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 bg-orange-500/10 rounded-md flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <adv.icon weight="duotone" className="w-4.5 h-4.5 text-orange-500" />
                  </div>
                  {adv.badge && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded uppercase tracking-wide">{adv.badge}</span>
                  )}
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm mb-1.5">{adv.title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">{adv.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───── Mobile App Banner ───── */}
      <section className="px-6 md:px-12" data-testid="mobile-app-banner">
        <div className="max-w-7xl mx-auto">
          <div className="bg-zinc-900 dark:bg-zinc-800 rounded-xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <DeviceMobile weight="duotone" className="w-8 h-8 text-orange-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2.5 justify-center md:justify-start mb-2">
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Outfit' }}>Mobilní aplikace CraftBolt</h3>
                <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wide">Ve vývoji</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
                Pracujeme na nativní aplikaci pro <span className="text-white font-medium">Google Play</span> i <span className="text-white font-medium">Apple App Store</span>.
                Registrovaní uživatelé budou informováni o možnosti bezplatného stažení.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section className="py-24 px-6 md:px-12 bg-white dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
                <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Proces</motion.span>
                <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-4 mb-4" style={{ fontFamily: 'Outfit' }}>
                  Jak to celé funguje
                </motion.h2>
                <motion.p variants={fadeUp} custom={2} className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">
                  Od zadání poptávky po dokončení zakázky. Pět jednoduchých kroků.
                </motion.p>
              </motion.div>
              <StepsSlider activeStep={activeStep} />
            </div>

            <motion.div className="lg:col-span-7 space-y-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
              {steps.map((step, index) => (
                <motion.div key={index} variants={fadeUp} custom={index}
                  className={`bg-stone-50 dark:bg-zinc-900 rounded-lg p-5 border cursor-pointer transition-all duration-200 ${
                    activeStep === index 
                      ? 'border-orange-400 shadow-md ring-1 ring-orange-200/50 dark:ring-orange-800/40' 
                      : 'border-zinc-200/80 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800'
                  }`}
                  onMouseEnter={() => setActiveStep(index)}
                  onMouseLeave={() => setActiveStep(null)}
                  data-testid={`step-card-${index}`}
                >
                  <div className="flex gap-4">
                    <span className="text-3xl font-bold text-orange-500 tracking-tight" style={{ fontFamily: 'Outfit' }}>{step.num}</span>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Important Notice */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="mt-20 bg-orange-500/5 dark:bg-orange-500/5 rounded-xl p-8 border border-orange-200/50 dark:border-orange-900/30">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4" style={{ fontFamily: 'Outfit' }}>Důležité upozornění</h3>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <p>V případě, že si obě smluvní strany předají osobní kontakty z důvodu dalších realizací služeb nebo z důvodu poskytnutí záruk, je jim toto samozřejmě umožněno. Pamatujte však na to, že sjednávání dalších služeb mimo tuto platformu je mnohdy rizikovější.</p>
              <p>Sjednávání zakázek přes naši platformu je pohodlné, rychlé, efektivní a máte vždy jasný přehled o svých zakázkách. Veškerá historie (zakázky, chat, fotografie, hodnocení či případné spory) se Vám nikdy neztratí.</p>
              <p className="font-semibold text-orange-600 dark:text-orange-400">Doporučení: Nikdy neřešte spor osobně či po telefonu. Vždy pamatujte na to, že co je psáno, to je dáno!</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── Video ───── */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.span variants={fadeUp} className="text-xs font-bold text-zinc-500 dark:text-zinc-500 tracking-[0.2em] uppercase">Podívejte se</motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-3" style={{ fontFamily: 'Outfit' }}>
              Jak CraftBolt funguje v praxi
            </motion.h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video shadow-2xl ring-1 ring-zinc-200/50 dark:ring-zinc-800">
            <iframe src="https://www.youtube.com/embed/eR8_-m_mYoE?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3" title="Jak CraftBolt funguje"
              frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen className="w-full h-full" data-testid="promo-video-youtube" />
          </motion.div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section className="py-24 px-6 md:px-12 bg-stone-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Ceník</motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-4" style={{ fontFamily: 'Outfit' }}>
              Jednoduchý a férový ceník
            </motion.h2>
          </motion.div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12" data-testid="billing-toggle">
            <span className={`text-sm font-medium transition-colors ${billingPeriod === 'monthly' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Měsíčně</span>
            <button onClick={() => setBillingPeriod(p => p === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 bg-zinc-200 dark:bg-zinc-700 rounded-full transition-colors"
              data-testid="billing-toggle-btn">
              <div className={`absolute top-1 w-5 h-5 bg-orange-500 rounded-full transition-all duration-200 ${billingPeriod === 'yearly' ? 'left-8' : 'left-1'}`} />
            </button>
            <span className={`text-sm font-medium transition-colors ${billingPeriod === 'yearly' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
              Ročně <span className="text-orange-500 font-bold">-10%</span>
            </span>
          </div>
          
          <motion.div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            {/* Zákazník */}
            <motion.div variants={fadeUp} custom={0}
              className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200/80 dark:border-zinc-800 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
              <div className="mb-6">
                <span className="text-xs font-bold text-zinc-500 tracking-[0.2em] uppercase">Zákazník</span>
                {billingPeriod === 'monthly' ? (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-zinc-500">od</span>
                      <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>99</span>
                      <span className="text-zinc-500 text-sm">Kč/měsíc</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-zinc-500">od</span>
                      <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>1 069</span>
                      <span className="text-zinc-500 text-sm">Kč/rok</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-400 line-through text-sm">1 188 Kč</span>
                      <span className="text-orange-500 text-xs font-bold">UŠETŘÍTE 119 Kč</span>
                    </div>
                  </div>
                )}
                <span className="text-orange-500 text-sm font-medium block mt-1">14 dní zdarma</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Neomezený počet poptávek","Výběr z ověřených dodavatelů","Online chat s dodavateli","Zamítnutí nabídek","Úpravy stávajících poptávek","Vkládání fotografií","Notifikace (E-mail, SMS)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check weight="bold" className="w-4 h-4 text-orange-500 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <Link to="/registrace?role=customer" className="block w-full text-center py-3 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg font-medium text-white text-sm transition-colors" data-testid="pricing-customer-btn">
                Začít jako zákazník
              </Link>
            </motion.div>

            {/* Dodavatel — Featured */}
            <motion.div variants={fadeUp} custom={1}
              className="bg-white dark:bg-zinc-900 rounded-xl p-8 border-2 border-orange-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-200 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-4 py-1 rounded tracking-wider uppercase">
                Pro řemeslníky
              </span>
              <div className="mb-6">
                <span className="text-xs font-bold text-zinc-500 tracking-[0.2em] uppercase">Dodavatel</span>
                {billingPeriod === 'monthly' ? (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-zinc-500">od</span>
                      <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>199</span>
                      <span className="text-zinc-500 text-sm">Kč/měsíc</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-zinc-500">od</span>
                      <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>2 149</span>
                      <span className="text-zinc-500 text-sm">Kč/rok</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-400 line-through text-sm">2 388 Kč</span>
                      <span className="text-orange-500 text-xs font-bold">UŠETŘÍTE 239 Kč</span>
                    </div>
                  </div>
                )}
                <span className="text-orange-500 text-sm font-medium block mt-1">14 dní zdarma</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Neomezený přístup k zakázkám","Výběr zakázky dle svých možností","Online chat se zákazníky","Ověřený profil nahráním oprávnění","Volba více kategorií","Vkládání fotografií","Notifikace (E-mail, SMS)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check weight="bold" className="w-4 h-4 text-orange-500 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <Link to="/registrace?role=supplier" className="block w-full text-center py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium text-white text-sm transition-colors" data-testid="pricing-dodavatel-btn">
                Začít jako dodavatel
              </Link>
            </motion.div>

            {/* Zákazník i dodavatel */}
            <motion.div variants={fadeUp} custom={2}
              className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200/80 dark:border-zinc-800 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
              <div className="mb-6">
                <span className="text-xs font-bold text-zinc-500 tracking-[0.2em] uppercase">Zákazník i dodavatel</span>
                {billingPeriod === 'monthly' ? (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>299</span>
                      <span className="text-zinc-500 text-sm">Kč/měsíc</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>3 229</span>
                      <span className="text-zinc-500 text-sm">Kč/rok</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-400 line-through text-sm">3 588 Kč</span>
                      <span className="text-orange-500 text-xs font-bold">UŠETŘÍTE 359 Kč</span>
                    </div>
                  </div>
                )}
                <span className="text-orange-500 text-sm font-medium block mt-1">14 dní zdarma</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Vše z profilu zákazníka","Vše z profilu dodavatele","Zadávání i přijímání zakázek","Online chat s oběma stranami","Ověřený profil","Vkládání fotografií","Notifikace (E-mail, SMS)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check weight="bold" className="w-4 h-4 text-orange-500 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <Link to="/registrace?role=customer_supplier" className="block w-full text-center py-3 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg font-medium text-white text-sm transition-colors" data-testid="pricing-both-btn">
                Začít jako obojí
              </Link>
            </motion.div>
          </motion.div>
          <p className="text-center text-zinc-500 text-sm mt-8">
            Platba kartou přes zabezpečenou bránu Stripe. <strong className="text-zinc-700 dark:text-zinc-300">Předplatné můžete kdykoliv zrušit.</strong> Ceny jsou uvedeny bez DPH.
          </p>
        </div>
      </section>

      {/* ───── Promoted Suppliers ───── */}
      <section className="py-24 px-6 md:px-12" data-testid="promoted-suppliers-section">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold tracking-tight text-orange-500 uppercase mt-4" style={{ fontFamily: 'Outfit' }}>
              Topovaní dodavatelé
            </motion.h2>
          </motion.div>

          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            {Array.from({ length: 8 }).map((_, i) => {
              const supplier = promotedSuppliers[i];
              if (supplier) {
                const logoUrl = supplier.logo_url
                  ? (supplier.logo_url.startsWith('http') ? supplier.logo_url : `${API.replace('/api', '')}${supplier.logo_url.startsWith('/api') ? supplier.logo_url : '/api' + (supplier.logo_url.startsWith('/') ? '' : '/') + supplier.logo_url}`)
                  : null;
                return (
                  <motion.div key={supplier.id} variants={fadeUp} custom={i}
                    className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                    data-testid={`promo-card-${i}`}>
                    <div className="flex items-center gap-4 mb-3">
                      {logoUrl ? (
                        <img src={logoUrl} alt={supplier.company_name} className="w-14 h-14 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
                      ) : (
                        <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/15 rounded-lg flex items-center justify-center">
                          <Briefcase weight="duotone" className="w-7 h-7 text-orange-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{supplier.company_name}</h3>
                        {supplier.website && <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:text-orange-600 truncate block">{supplier.website}</a>}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-2">{supplier.bio}</p>
                    {supplier.phone && <p className="text-xs text-zinc-400">{supplier.phone}</p>}
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Sponzorovaný banner</span>
                    </div>
                  </motion.div>
                );
              }
              return (
                <motion.button key={`empty-${i}`} variants={fadeUp} custom={i}
                  onClick={() => setShowPromoForm(true)}
                  className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-md transition-all duration-200 text-center group cursor-pointer"
                  data-testid={`promo-empty-${i}`}>
                  <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/15 rounded-lg flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Plus weight="bold" className="w-6 h-6 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors mb-1">Přejete si mít reklamu zde?</p>
                  <p className="text-xs font-bold text-orange-500">300 Kč/den</p>
                </motion.button>
              );
            })}
          </motion.div>

          {promotedSuppliers.length >= 8 && (
            <div className="text-center mt-8">
              <button onClick={() => setShowPromoForm(true)}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 text-sm hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/25"
                data-testid="add-promo-banner-btn">
                <Plus weight="bold" className="w-4 h-4" />
                Přidat reklamní banner za 300 Kč/den
              </button>
            </div>
          )}
        </div>
      </section>



      {/* ───── CTA ───── */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>
              Připraveni začít?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-zinc-500 dark:text-zinc-400 mt-4 mb-10">
              Zaregistrujte se ještě dnes a vyzkoušejte CraftBolt 14 dní zcela zdarma.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link to="/registrace" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/25" data-testid="cta-register-btn">
                Vytvořit účet zdarma
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="bg-zinc-900 dark:bg-zinc-950 text-white py-14 px-6 md:px-12 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center mb-4">
                <CraftBoltLogo size="xs" />
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">Platforma pro propojení zákazníků s ověřenými řemeslníky v okolí.</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Užitečné odkazy</h4>
              <ul className="space-y-2.5 text-zinc-500 text-sm">
                <li><Link to="/cenik" className="hover:text-orange-400 transition-colors">Ceník</Link></li>
                <li><Link to="/registrace" className="hover:text-orange-400 transition-colors">Registrace</Link></li>
                <li><Link to="/prihlaseni" className="hover:text-orange-400 transition-colors">Přihlášení</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Právní informace</h4>
              <ul className="space-y-2.5 text-zinc-500 text-sm">
                <li><Link to="/obchodni-podminky" className="hover:text-orange-400 transition-colors">Obchodní podmínky</Link></li>
                <li><Link to="/caste-dotazy" className="hover:text-orange-400 transition-colors">Časté dotazy</Link></li>
                <li><Link to="/kontakt" className="hover:text-orange-400 transition-colors">Kontakt</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-8 text-center">
            <p className="text-zinc-600 text-xs tracking-wide">© 2026 CraftBolt. Všechna práva vyhrazena.</p>
          </div>
        </div>
      </footer>

      {/* ───── Cookie Banner ───── */}
      {showCookies && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-xl text-white py-4 px-6 md:px-12 z-50 border-t border-zinc-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-400 text-center sm:text-left">
              Tento web používá cookies nezbytné pro fungování služby.
              <a href="#" className="text-orange-400 hover:text-orange-300 ml-1">Více informací</a>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCookies(false)} className="px-4 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors" data-testid="cookies-necessary-btn">
                Pouze nezbytné
              </button>
              <button onClick={() => setShowCookies(false)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-white transition-colors" data-testid="cookies-accept-btn">
                Přijmout vše
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ───── Quick Demand Modal ───── */}
      {showQuickDemand && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !quickLoading && setShowQuickDemand(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800" onClick={e => e.stopPropagation()} data-testid="quick-demand-modal">
            {quickSuccess ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-5">
                  <Check weight="bold" className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2" style={{ fontFamily: 'Outfit' }}>Poptávka odeslána!</h2>
                <p className="text-sm text-zinc-500 mb-1">Vaše rychlá poptávka byla úspěšně přijata.</p>
                <p className="text-sm text-zinc-500 mb-6">Jakmile dodavatel zareaguje, budeme vás informovat emailem a SMS.</p>
                <div className="flex gap-3">
                  <button onClick={() => { setShowQuickDemand(false); setQuickSuccess(false); setQuickForm({ first_name: '', last_name: '', email: '', phone: '', description: '' }); }}
                    className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm">
                    Zavřít
                  </button>
                  <Link to="/registrace" className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-center text-sm">
                    Dokončit registraci
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Rychlá poptávka</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Bez registrace — stačí základní údaje</p>
                  </div>
                  <button onClick={() => setShowQuickDemand(false)} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {quickError && <div className="p-3 bg-red-500/5 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 text-sm">{quickError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Jméno *</label>
                      <input type="text" value={quickForm.first_name} onChange={e => setQuickForm(p => ({...p, first_name: e.target.value}))}
                        className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="Jan" data-testid="quick-first-name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Příjmení *</label>
                      <input type="text" value={quickForm.last_name} onChange={e => setQuickForm(p => ({...p, last_name: e.target.value}))}
                        className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="Novák" data-testid="quick-last-name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email *</label>
                    <input type="email" value={quickForm.email} onChange={e => setQuickForm(p => ({...p, email: e.target.value}))}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="jan@email.cz" data-testid="quick-email" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Telefon *</label>
                    <input type="tel" value={quickForm.phone} onChange={e => setQuickForm(p => ({...p, phone: e.target.value}))}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="+420" data-testid="quick-phone" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Stručný popis poptávky</label>
                    <textarea value={quickForm.description} onChange={e => setQuickForm(p => ({...p, description: e.target.value}))} rows={3}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm resize-none" placeholder="Popište, co potřebujete..." data-testid="quick-description" />
                  </div>
                  <button onClick={handleQuickDemand} disabled={quickLoading}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2" data-testid="quick-submit-btn">
                    {quickLoading ? 'Odesílám...' : 'Odeslat poptávku'}
                  </button>
                  <p className="text-[11px] text-zinc-400 text-center">Odesláním souhlasíte se zpracováním osobních údajů.</p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* ───── Promo Form Modal ───── */}
      {showPromoForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !promoLoading && setShowPromoForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800" onClick={e => e.stopPropagation()} data-testid="promo-form-modal">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Reklamní banner</h2>
                <p className="text-xs text-zinc-400 mt-0.5">300 Kč/den + 21% DPH = <strong>363 Kč</strong></p>
              </div>
              <button onClick={() => setShowPromoForm(false)} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Název firmy *</label>
                <input type="text" value={promoForm.company_name} onChange={e => setPromoForm(p => ({...p, company_name: e.target.value}))}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="Název vaší firmy" data-testid="promo-company-name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Stručný popis *</label>
                <textarea value={promoForm.bio} onChange={e => setPromoForm(p => ({...p, bio: e.target.value}))} rows={2}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm resize-none" placeholder="Co nabízíte..." data-testid="promo-bio" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Telefon *</label>
                  <input type="tel" value={promoForm.phone} onChange={e => setPromoForm(p => ({...p, phone: e.target.value}))}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="+420..." data-testid="promo-phone" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Web</label>
                  <input type="text" value={promoForm.website} onChange={e => setPromoForm(p => ({...p, website: e.target.value}))}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white dark:bg-zinc-900 text-sm" placeholder="www.firma.cz" data-testid="promo-website" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Logo</label>
                <div className="flex items-center gap-3">
                  {promoForm.logo_url ? (
                    <img src={promoForm.logo_url.startsWith('http') ? promoForm.logo_url : `${API.replace('/api', '')}${promoForm.logo_url.startsWith('/api') ? promoForm.logo_url : '/api' + (promoForm.logo_url.startsWith('/') ? '' : '/') + promoForm.logo_url}`} alt="Logo" className="w-14 h-14 rounded-lg object-cover border border-zinc-200" />
                  ) : (
                    <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-zinc-400" />
                    </div>
                  )}
                  <label className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                    {promoUploadingLogo ? 'Nahrávám...' : 'Nahrát logo'}
                    <input type="file" accept="image/*" onChange={handlePromoLogoUpload} className="hidden" disabled={promoUploadingLogo} />
                  </label>
                </div>
              </div>
              <button onClick={handlePromoSubmit} disabled={promoLoading || !promoForm.company_name || !promoForm.bio || !promoForm.phone}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2" data-testid="promo-submit-btn">
                {promoLoading ? 'Přesměrování na platbu...' : 'Pokračovat k platbě — 363 Kč'}
              </button>
              <p className="text-[11px] text-zinc-400 text-center">Cena 300 Kč + 21% DPH. Banner bude aktivní 24 hodin od zaplacení.</p>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default HomePage;
