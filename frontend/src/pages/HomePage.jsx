import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
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
  Play,
  Check,
  X,
  Clock
} from '@phosphor-icons/react';
import HeroSlider from '../components/HeroSlider';
import StepsSlider from '../components/StepsSlider';

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

  const handleQuickDemand = async () => {
    if (!quickForm.first_name || !quickForm.last_name || !quickForm.phone || !quickForm.email) {
      setQuickError('Vyplňte všechna povinná pole');
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
    { icon: CurrencyDollar, title: "Nejlevnější platforma na trhu", desc: "Měsíční paušál bez dalších poplatků a skrytých provizí." },
    { icon: DeviceMobile, title: "Chytrá mobilní aplikace", desc: "Pouze u nás. Nativní aplikace pro Android i iOS." },
    { icon: ShieldCheck, title: "Neřešíme registry", desc: "Každý se může dostat do problémů a mnohdy za to ani nemůže. Dáváme druhou šanci." },
    { icon: MapPin, title: "Geolokace", desc: "Zjištění online polohy mezi zákazníkem a dodavatelem — funkční také na počítačích." },
    { icon: Lightning, title: "Rychlé vkládání a přijímání zakázek", desc: "Bez zbytečného papírování. Zakázka do 5 minut." },
    { icon: ChatCircle, title: "Online CHAT", desc: "Diskrétní chat mezi zákazníkem a dodavatelem přímo v aplikaci." },
    { icon: Tag, title: "Rychlé zjištění ceny", desc: "Dodavatel Vám před zahájením práce nabídne odhadovanou cenu za službu." },
    { icon: Star, title: "Hodnocení řemeslníků a firem", desc: "Hodnocení udělují skuteční zákazníci. Žádné falešné recenze." },
    { icon: Users, title: "Skutečné profily", desc: "Na naší platformě nenajdete FAKE účty, ale pouze skutečné zákazníky a dodavatele." },
  ];

  const steps = [
    { num: "01", title: "Zákazník zadá zakázku", desc: "Vybere kategorii, podrobně napíše svůj požadavek, přidá případné fotografie pro lepší odhad ceny realizace, zadá adresu realizace a požadovaný termín, zvolí typ platby." },
    { num: "02", title: "Dodavatel přijme zakázku", desc: "Dodavatel z vašeho okolí dostane upozornění, prohlédne si poptávku, zahájí případný online chat pro doplnění informací, zakázku přijme a pustí se do realizace." },
    { num: "03", title: "Realizace díla/služby", desc: "Dodavatel provede práci či službu, vše transparentně a bez prostředníka." },
    { num: "04", title: "Předání díla/služby", desc: "Dodavatel řádně předá provedené dílo či službu." },
    { num: "05", title: "Vzájemné hodnocení", desc: "Obě strany ohodnotí spolupráci. Fotografie a recenze budují důvěru na platformě." },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">Craft</span>
              <span className="text-2xl font-bold text-orange-500">Bolt</span>
            </Link>
            
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="dashboard-link"
                  >
                    Můj profil
                  </Link>
                  <button 
                    onClick={logout}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="logout-btn"
                  >
                    Odhlásit
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/prihlaseni" 
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="login-link"
                  >
                    Přihlášení
                  </Link>
                  <Link 
                    to="/registrace" 
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-full transition-all duration-200 hover:-translate-y-0.5"
                    data-testid="register-btn"
                  >
                    Přidat poptávku
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <Lightning weight="fill" className="w-4 h-4" />
                BEZKONKURENČNÍ PLATFORMA
              </span>
              <p className="text-sm font-semibold text-gray-500 tracking-widest uppercase mb-3">PRO ZÁKAZNÍKY I DODAVATELE</p>
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
                <span className="text-orange-500">BĚHEM PÁR MINUT</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Vyhledání dodavatele nebo zákazníka z okolí nebylo nikdy jednodušší. Začněte teď hned.
              </p>
              <div className="flex flex-wrap gap-4 mb-12">
                <Link 
                  to="/registrace" 
                  className="btn-orange inline-flex items-center gap-2"
                  data-testid="hero-register-btn"
                >
                  Začít zdarma — 14 dní
                  <ArrowRight weight="bold" className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => setShowQuickDemand(true)}
                  className="bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-700 font-medium px-6 py-3 rounded-full transition-all duration-200"
                  data-testid="quick-demand-btn"
                >
                  Rychlá poptávka bez registrace
                </button>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <ChatCircle weight="duotone" className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="text-sm font-bold text-gray-900">SMS</div>
                  <div className="text-xs text-gray-500">notifikace</div>
                </div>
                <div className="w-px h-16 bg-gray-200"></div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <CurrencyDollar weight="duotone" className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="text-sm font-bold text-gray-900">od 199 Kč</div>
                  <div className="text-xs text-gray-500">bez dalších poplatků</div>
                </div>
                <div className="w-px h-16 bg-gray-200"></div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Clock weight="duotone" className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="text-sm font-bold text-gray-900">RealTime</div>
                  <div className="text-xs text-gray-500">sledování příjezdů</div>
                </div>
              </div>
            </div>
            <div className="animate-fade-in-up stagger-2 h-[400px] lg:h-[500px]">
              <HeroSlider />
            </div>
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Proč si vybrat nás</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-4">Výhody oproti konkurenčním platformám</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {advantages.map((adv, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl p-6 border border-gray-100 card-hover animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <adv.icon weight="duotone" className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{adv.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Proces</span>
              <h2 className="text-4xl font-bold text-gray-900 mt-4 mb-6">Jak to celé funguje</h2>
              <p className="text-gray-600 text-lg mb-8">
                Od zadání poptávky po dokončení zakázky. Pět jednoduchých kroků.
              </p>
              <StepsSlider activeStep={activeStep} />
            </div>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`bg-white rounded-xl p-6 border card-hover animate-fade-in-up cursor-pointer transition-all duration-200 ${
                    activeStep === index 
                      ? 'border-orange-400 shadow-md ring-1 ring-orange-200' 
                      : 'border-gray-100 hover:border-orange-200'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onMouseEnter={() => setActiveStep(index)}
                  onMouseLeave={() => setActiveStep(null)}
                  data-testid={`step-card-${index}`}
                >
                  <div className="flex gap-4">
                    <span className="text-4xl font-bold text-orange-500">{step.num}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">{step.title}</h3>
                      <p className="text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Important Notice */}
          <div className="mt-16 bg-orange-50 rounded-2xl p-8 border border-orange-100">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">Důležité upozornění</h3>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                V případě, že si obě smluvní strany předají osobní kontakty z důvodu dalších realizací služeb nebo z důvodu poskytnutí záruk, je jim toto samozřejmě umožněno. Pamatujte však na to, že sjednávání dalších služeb mimo tuto platformu je mnohdy rizikovější a složitější.
              </p>
              <p>
                Sjednávání zakázek přes naši platformu je pohodlné, rychlé, efektivní a máte vždy jasný přehled o svých zakázkách. Veškerá historie (zakázky, chat, fotografie, hodnocení či případné spory) se Vám nikdy neztratí a zůstanou na vašem profilu uložené. Řešení případných sporů nebo nedorozumění je přes tuto platformu vždy bezpečnější a prokazatelnější. Pokud ke sporu dojde, můžete požádat také naši podporu o pomoc, která Vám bude vždy nápomocná a bude se snažit vše vyřešit ke spokojenosti obou smluvních stran.
              </p>
              <p className="font-semibold text-orange-600">
                Doporučení: Nikdy neřešte spor osobně či po telefonu. Vždy pamatujte na to, že co je psáno, to je dáno!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-sm tracking-widest uppercase text-gray-500">Podívejte se</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Jak CraftBolt funguje v praxi</h2>
          </div>
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video shadow-2xl">
            <iframe
              src="https://www.youtube.com/embed/eR8_-m_mYoE?rel=0"
              title="Jak CraftBolt funguje"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              data-testid="promo-video-youtube"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Ceník</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-4">
              Jednoduchý a férový ceník.
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Zákazník */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 card-hover">
              <div className="mb-6">
                <span className="text-gray-500 text-sm uppercase tracking-widest font-bold">Zákazník</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-5xl font-bold text-gray-900">199</span>
                  <span className="text-gray-500">Kč/měsíc</span>
                </div>
                <span className="text-orange-500 text-sm font-medium">14 dní zdarma</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Neomezený počet poptávek", "Výběr z ověřených dodavatelů", "Online chat s dodavateli", "Zamítnutí nabídek", "Úpravy stávajících poptávek", "Vkládání fotografií", "Notifikace (E-mail, SMS)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600 text-sm">
                    <Check weight="bold" className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link 
                to="/registrace?role=customer" 
                className="block w-full text-center py-3 px-6 bg-gray-900 hover:bg-gray-800 rounded-full font-medium text-white transition-colors"
                data-testid="pricing-customer-btn"
              >
                Začít jako zákazník
              </Link>
            </div>

            {/* Dodavatel */}
            <div className="bg-white rounded-2xl p-8 border-2 border-orange-500 card-hover relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase">
                Pro řemeslníky
              </span>
              <div className="mb-6">
                <span className="text-gray-500 text-sm uppercase tracking-widest font-bold">Dodavatel</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-5xl font-bold text-gray-900">299</span>
                  <span className="text-gray-500">Kč/měsíc</span>
                </div>
                <span className="text-orange-500 text-sm font-medium">14 dní zdarma</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Neomezený přístup k zakázkám", "Výběr zakázky dle svých možností", "Online chat se zákazníky", "Ověřený profil nahráním oprávnění", "Volba více kategorií", "Vkládání fotografií", "Notifikace (E-mail, SMS)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600 text-sm">
                    <Check weight="bold" className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link 
                to="/registrace?role=supplier" 
                className="block w-full text-center py-3 px-6 bg-orange-500 hover:bg-orange-600 rounded-full font-medium text-white transition-colors"
                data-testid="pricing-dodavatel-btn"
              >
                Začít jako dodavatel
              </Link>
            </div>

            {/* Zákazník i dodavatel */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 card-hover">
              <div className="mb-6">
                <span className="text-gray-500 text-sm uppercase tracking-widest font-bold">Zákazník i dodavatel</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-5xl font-bold text-gray-900">399</span>
                  <span className="text-gray-500">Kč/měsíc</span>
                </div>
                <span className="text-orange-500 text-sm font-medium">14 dní zdarma</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Vše z profilu zákazníka", "Vše z profilu dodavatele", "Zadávání i přijímání zakázek", "Online chat s oběma stranami", "Ověřený profil", "Vkládání fotografií", "Notifikace (E-mail, SMS)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600 text-sm">
                    <Check weight="bold" className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link 
                to="/registrace?role=customer_supplier" 
                className="block w-full text-center py-3 px-6 bg-gray-900 hover:bg-gray-800 rounded-full font-medium text-white transition-colors"
                data-testid="pricing-both-btn"
              >
                Začít jako obojí
              </Link>
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm mt-8">
            Platba kartou přes zabezpečenou bránu Stripe. <strong>Předplatné můžete kdykoliv zrušit.</strong>
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Připraveni začít?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Zaregistrujte se ještě dnes a vyzkoušejte CraftBolt 14 dní zcela zdarma.
          </p>
          <Link 
            to="/registrace" 
            className="btn-orange inline-flex items-center gap-2"
            data-testid="cta-register-btn"
          >
            Vytvořit účet zdarma
            <ArrowRight weight="bold" className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold">Craft</span>
                <span className="text-2xl font-bold text-orange-500">Bolt</span>
              </div>
              <p className="text-gray-400 text-sm">
                Platforma pro propojení zákazníků s ověřenými řemeslníky v okolí.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Užitečné odkazy</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/cenik" className="hover:text-orange-400 transition-colors">Ceník</Link></li>
                <li><Link to="/registrace" className="hover:text-orange-400 transition-colors">Registrace</Link></li>
                <li><Link to="/prihlaseni" className="hover:text-orange-400 transition-colors">Přihlášení</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Právní informace</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/obchodni-podminky" className="hover:text-orange-400 transition-colors">Obchodní podmínky</Link></li>
                <li><Link to="/kontakt" className="hover:text-orange-400 transition-colors">Kontakt</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2026 CraftBolt. Všechna práva vyhrazena.
            </p>
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      {showCookies && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white py-4 px-4 sm:px-6 lg:px-8 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-300 text-center sm:text-left">
              Tento web používá cookies nezbytné pro fungování služby. Analytické cookies používáme pouze s vaším souhlasem.
              <a href="#" className="text-orange-400 hover:text-orange-300 ml-1">Více informací</a>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCookies(false)}
                className="px-4 py-2 border border-gray-600 rounded-lg text-sm hover:border-gray-400 transition-colors"
                data-testid="cookies-necessary-btn"
              >
                Pouze nezbytné
              </button>
              <button 
                onClick={() => setShowCookies(false)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
                data-testid="cookies-accept-btn"
              >
                Přijmout vše
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Demand Modal */}
      {showQuickDemand && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !quickLoading && setShowQuickDemand(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} data-testid="quick-demand-modal">
            {quickSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check weight="bold" className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Poptávka odeslána!</h2>
                <p className="text-gray-500 mb-2">Vaše rychlá poptávka byla úspěšně přijata.</p>
                <p className="text-gray-500 mb-6 text-sm">Jakmile dodavatel zareaguje, budeme vás informovat emailem a SMS. Pro plný přístup k platformě doporučujeme dokončit registraci.</p>
                <div className="flex gap-3">
                  <button onClick={() => { setShowQuickDemand(false); setQuickSuccess(false); setQuickForm({ first_name: '', last_name: '', email: '', phone: '', description: '' }); }} className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                    Zavřít
                  </button>
                  <Link to="/registrace" className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-center">
                    Dokončit registraci
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Rychlá poptávka</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Bez registrace — stačí základní údaje</p>
                  </div>
                  <button onClick={() => setShowQuickDemand(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {quickError && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{quickError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jméno *</label>
                      <input type="text" value={quickForm.first_name} onChange={e => setQuickForm(p => ({...p, first_name: e.target.value}))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="Jan" data-testid="quick-first-name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Příjmení *</label>
                      <input type="text" value={quickForm.last_name} onChange={e => setQuickForm(p => ({...p, last_name: e.target.value}))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="Novák" data-testid="quick-last-name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={quickForm.email} onChange={e => setQuickForm(p => ({...p, email: e.target.value}))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="jan@email.cz" data-testid="quick-email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                    <input type="tel" value={quickForm.phone} onChange={e => setQuickForm(p => ({...p, phone: e.target.value}))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="+420" data-testid="quick-phone" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stručný popis poptávky</label>
                    <textarea value={quickForm.description} onChange={e => setQuickForm(p => ({...p, description: e.target.value}))} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none" placeholder="Popište, co potřebujete..." data-testid="quick-description" />
                  </div>
                  <button onClick={handleQuickDemand} disabled={quickLoading} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2" data-testid="quick-submit-btn">
                    {quickLoading ? 'Odesílám...' : 'Odeslat poptávku'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">Odesláním souhlasíte se zpracováním osobních údajů.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
