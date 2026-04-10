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
  Play
} from '@phosphor-icons/react';
import HeroSlider from '../components/HeroSlider';
import StepsSlider from '../components/StepsSlider';
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

  useEffect(() => {
    fetch(`${API}/platform/stats`).then(r => r.json()).then(setPlatformStats).catch(() => {});
    const interval = setInterval(() => {
      fetch(`${API}/platform/stats`).then(r => r.json()).then(setPlatformStats).catch(() => {});
    }, 30000);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => { clearInterval(interval); window.removeEventListener('scroll', onScroll); };
  }, []);

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
              <Link to="/" className="flex items-center" data-testid="logo-link">
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Craft</span>
                <span className="text-2xl font-bold tracking-tight text-orange-500" style={{ fontFamily: 'Outfit' }}>Bolt</span>
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
                  <Link to="/prihlaseni" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors" data-testid="login-link">
                    Přihlášení
                  </Link>
                  <Link to="/registrace" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/20" data-testid="register-btn">
                    Přidat poptávku
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section className="relative pt-28 pb-24 md:pt-36 md:pb-32 px-6 md:px-12 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left — Text */}
            <motion.div className="lg:col-span-6" initial="hidden" animate="visible" variants={staggerContainer}>
              <motion.div variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-4 py-1.5 rounded-md text-xs font-bold tracking-[0.15em] uppercase">
                  <Lightning weight="fill" className="w-3.5 h-3.5" />
                  Bezkonkurenční platforma
                </span>
              </motion.div>
              <motion.p variants={fadeUp} custom={1} className="text-xs font-bold text-zinc-500 dark:text-zinc-500 tracking-[0.2em] uppercase mt-6 mb-4">
                Poptávky — Nabídky — Služby
              </motion.p>
              <motion.h1 variants={fadeUp} custom={2} className="text-5xl sm:text-6xl font-semibold tracking-tighter leading-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>
                Jednoduše,{' '}
                <span className="text-orange-500">rychle,</span>{' '}
                efektivně.
              </motion.h1>
              <motion.p variants={fadeUp} custom={3} className="text-lg text-zinc-500 dark:text-zinc-400 mt-6 leading-relaxed max-w-md">
                Zadejte poptávku, nebo se registrujte jako dodavatel. Začněte teď hned.
              </motion.p>
              <motion.div variants={fadeUp} custom={4} className="flex flex-wrap gap-3 mt-10">
                <Link to="/registrace" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3.5 rounded-lg transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/25 text-sm" data-testid="hero-register-btn">
                  Začít zdarma — 14 dní
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Link>
                <button onClick={() => setShowQuickDemand(true)} className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-700 text-zinc-700 dark:text-zinc-300 font-medium px-7 py-3.5 rounded-lg transition-all duration-200 text-sm" data-testid="quick-demand-btn">
                  Rychlá poptávka bez registrace
                </button>
              </motion.div>

              {/* Micro stats */}
              <motion.div variants={fadeUp} custom={5} className="flex items-center gap-6 mt-12">
                {[
                  { icon: ChatCircle, label: 'SMS notifikace' },
                  { icon: CurrencyDollar, label: 'od 199 Kč / měs.' },
                  { icon: Clock, label: '24/7 NON-STOP' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-orange-500/10 flex items-center justify-center">
                      <item.icon weight="duotone" className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Slider */}
            <motion.div className="lg:col-span-6" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <div className="h-[380px] lg:h-[480px]">
                <HeroSlider />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───── Platform Stats ───── */}
      {platformStats && (
        <section className="border-y border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm" data-testid="platform-stats-section">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-5">
            <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
              {[
                { label: 'Zákazníci', value: platformStats.customers, color: 'bg-emerald-500', textColor: 'text-emerald-600', id: 'stat-customers' },
                { label: 'Dodavatelé', value: platformStats.suppliers, color: 'bg-red-500', textColor: 'text-red-500', id: 'stat-suppliers' },
                { label: 'Zákazníci/Dodavatelé', value: platformStats.customer_suppliers, color: 'bg-orange-500', textColor: 'text-orange-500', id: 'stat-both' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2.5" data-testid={stat.id}>
                  <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-medium">{stat.label}</span>
                  <span className={`text-base font-bold ${stat.textColor}`}>{stat.value}</span>
                </div>
              ))}
              {platformStats.online > 0 && (
                <div className="flex items-center gap-2.5" data-testid="stat-online">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-medium">Online</span>
                  <span className="text-base font-bold text-emerald-600">{platformStats.online}</span>
                </div>
              )}
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

      {/* ───── Comparison Section ───── */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Konec otravování</motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-4 mb-4" style={{ fontFamily: 'Outfit' }}>
              Žádné telefonáty. Žádný spam.
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Na jiných platformách vás po zadání poptávky ihned volá telefonista, 10 minut s vámi poptávku "ověřuje" a pak vám přijde 30 emailů. U nás ne.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-red-200/60 dark:border-red-900/30">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 bg-red-500/10 rounded-md flex items-center justify-center">
                  <X weight="bold" className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Konkurenční platformy</h3>
              </div>
              <ul className="space-y-3">
                {['Telefonista vás volá ihned po zadání poptávky','5–10 minut "ověřování" po telefonu','Desítky emailů od dodavatelů z celé ČR','Neustále zvonící telefon s nabídkami','Po půl hodině nevíte, s kým jste mluvili','Časově náročné a otravné'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-zinc-500 dark:text-zinc-400 text-sm">
                    <X weight="bold" className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-emerald-200/60 dark:border-emerald-900/30">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-md flex items-center justify-center">
                  <Check weight="bold" className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">CraftBolt</h3>
              </div>
              <ul className="space-y-3">
                {['Poptávku zadáte sami za 2 minuty — bez telefonátů','Žádné ověřování, žádný telefonista','Reagují jen dodavatelé z vašeho okolí','Komunikace přes chat — v klidu, kdy se vám hodí','Přehled všech nabídek na jednom místě','Administrátoři pracují 24/7 NON-STOP','Jednoduše, rychle, efektivně'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-zinc-500 dark:text-zinc-400 text-sm">
                    <Check weight="bold" className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
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
            <iframe src="https://www.youtube.com/embed/eR8_-m_mYoE?rel=0" title="Jak CraftBolt funguje"
              frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen className="w-full h-full" data-testid="promo-video-youtube" />
          </motion.div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section className="py-24 px-6 md:px-12 bg-stone-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Ceník</motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-4" style={{ fontFamily: 'Outfit' }}>
              Jednoduchý a férový ceník
            </motion.h2>
          </motion.div>
          
          <motion.div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            {/* Zákazník */}
            <motion.div variants={fadeUp} custom={0}
              className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-zinc-200/80 dark:border-zinc-800 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
              <div className="mb-6">
                <span className="text-xs font-bold text-zinc-500 tracking-[0.2em] uppercase">Zákazník</span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>199</span>
                  <span className="text-zinc-500 text-sm">Kč/měsíc</span>
                </div>
                <span className="text-orange-500 text-sm font-medium">14 dní zdarma</span>
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
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>299</span>
                  <span className="text-zinc-500 text-sm">Kč/měsíc</span>
                </div>
                <span className="text-orange-500 text-sm font-medium">14 dní zdarma</span>
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
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-5xl font-bold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>399</span>
                  <span className="text-zinc-500 text-sm">Kč/měsíc</span>
                </div>
                <span className="text-orange-500 text-sm font-medium">14 dní zdarma</span>
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
            Platba kartou přes zabezpečenou bránu Stripe. <strong className="text-zinc-700 dark:text-zinc-300">Předplatné můžete kdykoliv zrušit.</strong>
          </p>
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
                <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Outfit' }}>Craft</span>
                <span className="text-xl font-bold tracking-tight text-orange-500" style={{ fontFamily: 'Outfit' }}>Bolt</span>
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
    </div>
  );
};

export default HomePage;
