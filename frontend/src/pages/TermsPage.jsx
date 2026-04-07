import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            <span className="text-gray-900">Craft</span>
            <span className="text-orange-500">Bolt</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft weight="bold" />
            Zpět na hlavní stránku
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Obchodní podmínky</h1>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8 text-gray-700 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Úvodní ustanovení</h2>
            <p className="mb-4">
              Tyto obchodní podmínky (dále jen „Podmínky") upravují smluvní vztahy mezi provozovatelem služby 
              CraftBolt.cz – společností AC/DC MONT s.r.o., IČ: 097 44 550, se sídlem Sportovní 7, 789 63 Ruda nad Moravou 
              (dále jen „Provozovatel") a uživateli platformy CraftBolt.cz (dále jen „Služba").
            </p>
            <p className="mb-4">
              Služba CraftBolt.cz je online platforma, která zprostředkovává kontakt mezi zákazníky hledajícími 
              řemeslníky a dodavateli nabízejícími řemeslnické služby.
            </p>
            <p>
              Registrací do Služby uživatel potvrzuje, že se seznámil s těmito Podmínkami a že s nimi bez výhrad souhlasí.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Definice pojmů</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Zákazník</strong> – fyzická nebo právnická osoba, která prostřednictvím Služby poptává řemeslnické práce nebo služby.</li>
              <li><strong>Dodavatel</strong> – fyzická nebo právnická osoba (řemeslník, firma), která prostřednictvím Služby nabízí své služby a reaguje na poptávky Zákazníků.</li>
              <li><strong>Uživatel</strong> – souhrnné označení pro Zákazníka i Dodavatele.</li>
              <li><strong>Poptávka</strong> – zadání požadavku Zákazníka na provedení řemeslnických prací či služeb.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Popis služby</h2>
            <p className="mb-4">
              CraftBolt.cz umožňuje Zákazníkům zadat poptávku na řemeslnické práce a získat nabídky od ověřených 
              Dodavatelů. Dodavatelům umožňuje přístup k poptávkám a možnost nabízet své služby Zákazníkům.
            </p>
            <p className="mb-4">
              Služba zahrnuje:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Zadávání a správu poptávek</li>
              <li>Online chat mezi Zákazníkem a Dodavatelem</li>
              <li>Systém hodnocení a recenzí</li>
              <li>Notifikace (aplikace, e-mail, SMS)</li>
              <li>Profily Dodavatelů s možností ověření</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Registrace a uživatelský účet</h2>
            <p className="mb-4">
              Pro využívání Služby je nutná registrace. Uživatel je povinen uvést pravdivé a úplné údaje.
            </p>
            <p className="mb-4">
              Uživatel je odpovědný za ochranu svých přihlašovacích údajů a nesmí je sdělovat třetím osobám.
            </p>
            <p>
              Provozovatel má právo zrušit nebo pozastavit účet Uživatele, který porušuje tyto Podmínky nebo 
              jedná v rozporu s dobrými mravy či právními předpisy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Tarify a platební podmínky</h2>
            <p className="mb-4">
              Služba nabízí následující tarify:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Zákazník</strong> – 99 Kč/měsíc bez DPH</li>
              <li><strong>Dodavatel</strong> – 399 Kč/měsíc bez DPH</li>
            </ul>
            <p className="mb-4">
              Všechny tarify zahrnují 14denní zkušební období zdarma.
            </p>
            <p className="mb-4">
              Platba je prováděna měsíčně prostřednictvím platební brány. <strong>Předplatné lze kdykoliv zrušit</strong> v nastavení účtu, 
              přičemž služba zůstane aktivní do konce zaplaceného období.
            </p>
            <p>
              Ceny jsou uvedeny bez DPH. K cenám bude připočtena DPH dle platných právních předpisů.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Práva a povinnosti Zákazníka</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Zákazník je povinen zadávat poptávky pravdivě a s vážným úmyslem realizace.</li>
              <li>Zákazník nesmí zneužívat Službu k monitoringu trhu, nekalé soutěži nebo jiným negativním účelům.</li>
              <li>Zákazník má právo hodnotit Dodavatele po dokončení zakázky.</li>
              <li>Zákazník má právo odmítnout nabídky Dodavatelů.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Práva a povinnosti Dodavatele</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dodavatel je povinen uvádět pravdivé informace o své činnosti a kvalifikaci.</li>
              <li>Dodavatel nesmí kontaktovat Zákazníky za jiným účelem než je nabídka služeb souvisejících s poptávkou.</li>
              <li>Dodavatel odpovídá za kvalitu poskytnutých služeb.</li>
              <li>Dodavatel může nahrát oprávnění a certifikáty pro ověření svého profilu.</li>
              <li>Dodavatel nesmí šířit informace z poptávek třetím stranám.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Odpovědnost Provozovatele</h2>
            <p className="mb-4">
              Provozovatel pouze zprostředkovává kontakt mezi Zákazníkem a Dodavatelem. Provozovatel nenese 
              odpovědnost za:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Kvalitu služeb poskytnutých Dodavatelem</li>
              <li>Smluvní vztahy mezi Zákazníkem a Dodavatelem</li>
              <li>Škody vzniklé v důsledku činnosti Dodavatele nebo Zákazníka</li>
              <li>Nepřetržitou dostupnost Služby</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Ochrana osobních údajů</h2>
            <p className="mb-4">
              Provozovatel zpracovává osobní údaje Uživatelů v souladu s nařízením GDPR a zákonem o ochraně 
              osobních údajů. Podrobnosti jsou uvedeny v samostatném dokumentu Zásady ochrany osobních údajů.
            </p>
            <p>
              Uživatel souhlasí se zasíláním notifikací souvisejících s provozem Služby na uvedený e-mail a telefon.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Ukončení služby</h2>
            <p className="mb-4">
              Uživatel může kdykoliv zrušit svůj účet v nastavení profilu nebo kontaktováním podpory.
            </p>
            <p className="mb-4">
              Provozovatel má právo okamžitě ukončit účet Uživatele, který:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Porušuje tyto Podmínky</li>
              <li>Uvádí nepravdivé údaje</li>
              <li>Poškozuje dobré jméno Služby</li>
              <li>Jedná v rozporu s právními předpisy nebo dobrými mravy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Závěrečná ustanovení</h2>
            <p className="mb-4">
              Tyto Podmínky se řídí právním řádem České republiky.
            </p>
            <p className="mb-4">
              Provozovatel si vyhrazuje právo tyto Podmínky kdykoliv změnit. O změnách bude Uživatel informován 
              prostřednictvím e-mailu nebo oznámením v aplikaci.
            </p>
            <p className="mb-4">
              V případě sporů se smluvní strany pokusí o smírné řešení. Pokud to nebude možné, budou spory 
              řešeny u příslušného soudu v České republice.
            </p>
            <p className="text-sm text-gray-500 mt-8">
              Tyto obchodní podmínky nabývají účinnosti dnem 1. 4. 2026.
            </p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            © 2026 CraftBolt. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
