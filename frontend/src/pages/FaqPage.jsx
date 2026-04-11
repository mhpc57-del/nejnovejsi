import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CaretDown, Question, ArrowLeft, Envelope } from '@phosphor-icons/react';
import CraftBoltLogo from '../components/CraftBoltLogo';

const faqs = [
  {
    question: 'Na mobilu mám špatné responzivní rozložení.',
    answers: [
      'Pošlete nám Váš typ telefonu na email info@craftbolt.cz a problém vyřešíme do 1 hod.',
      'Zkontrolujte všechny aktualizace',
      'Vyzkoušejte na jiném mobilním zařízení',
    ],
  },
  {
    question: 'Nepřišel mi notifikační email s potvrzením registrace',
    answers: [
      'Zkontrolujte nejdříve svůj email, zda-li jste jej zadali správně',
      'Vyžádejte si u nás opětovné zaslání ověření prostřednictvím emailu',
      'Pokud problém setrvává, napište nám na info@craftbolt.cz',
    ],
  },
  {
    question: 'Nefunguje mi zobrazení polohy mezi zákazníkem a dodavatelem',
    answers: [
      'Zkontrolujte, zda-li máte zapnuté sdílení polohy v prohlížeči',
      'Zkontrolujte, zda-li máte zapnuté sdílení polohy na mobilu',
      'Protistrana má možná vypnutou polohu (napište jí v online chatu žádost o sdílení polohy)',
    ],
  },
  {
    question: 'Dodavatel přijmul zakázku, ale nic se neděje a nereaguje na chat',
    answers: [
      'Napište nám na info@craftbolt.cz a naši administrátoři se pokusí dodavatele zkontaktovat emailem',
      'Možná se pouze omylem překliknul a teď neví, jak z toho ven (kontaktujte admina, který problém vyřeší)',
      'Problém možná bude někde jinde (budeme se pokoušet dodavatele zkontaktovat také přes mobil)',
    ],
  },
];

const FaqItem = ({ faq, index }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden" data-testid={`faq-item-${index}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
        data-testid={`faq-toggle-${index}`}
      >
        <span className="font-semibold text-zinc-900 dark:text-white text-sm pr-4">{faq.question}</span>
        <CaretDown
          weight="bold"
          className={`w-5 h-5 text-zinc-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5" data-testid={`faq-answer-${index}`}>
          <ul className="space-y-2.5">
            {faq.answers.map((answer, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                <span>{answer}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const FaqPage = () => {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
            <CraftBoltLogo size="xs" />
          </Link>
          <Link
            to="/kontakt"
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-500 transition-colors"
          >
            <Envelope className="w-4 h-4" />
            Kontakt
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Question weight="fill" className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-3" style={{ fontFamily: 'Outfit' }}>
            Časté dotazy
          </h1>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Odpovědi na nejčastější otázky ohledně platformy CraftBolt. Další dotazy budeme postupně přidávat.
          </p>
        </div>

        <div className="space-y-3" data-testid="faq-list">
          {faqs.map((faq, index) => (
            <FaqItem key={index} faq={faq} index={index} />
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-500 mb-3">Nenašli jste odpověď na svou otázku?</p>
          <a
            href="mailto:info@craftbolt.cz"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl text-sm transition-colors"
            data-testid="faq-contact-btn"
          >
            <Envelope className="w-4 h-4" />
            Napište nám na info@craftbolt.cz
          </a>
          <p className="text-xs text-zinc-400 mt-4">Další časté dotazy budeme postupně přidávat. Děkujeme za pochopení.</p>
        </div>
      </main>
    </div>
  );
};

export default FaqPage;
