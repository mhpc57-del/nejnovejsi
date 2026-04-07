import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, CalendarCheck, XCircle, Info } from '@phosphor-icons/react';

const RecurringPaymentsPage = () => {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Podmínky opakovaných plateb</h1>
        <p className="text-gray-600 mb-8">
          Informace o automatickém strhávání plateb za předplatné služby CraftBolt.cz
        </p>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8 text-gray-700 leading-relaxed">
          
          {/* Info box */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex gap-4">
            <Info weight="fill" className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Co jsou opakované platby?</h3>
              <p className="text-gray-600">
                Opakované platby umožňují automatické měsíční strhávání předplatného z vaší platební karty. 
                Nemusíte každý měsíc ručně platit – platba proběhne automaticky a vy můžete službu využívat bez přerušení.
              </p>
            </div>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <CreditCard weight="fill" className="text-orange-500" />
              1. Jak opakované platby fungují
            </h2>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>První platba:</strong> Při registraci provedete úhradu prvního měsíčního předplatného 
                prostřednictvím zabezpečené platební brány GoPay.
              </li>
              <li>
                <strong>Autorizace:</strong> Úhradou první platby souhlasíte s automatickým strhávání dalších 
                plateb z vaší platební karty.
              </li>
              <li>
                <strong>Automatické platby:</strong> Každý následující měsíc bude z vaší karty automaticky 
                stržena částka odpovídající vašemu tarifu.
              </li>
              <li>
                <strong>Upozornění:</strong> Před každou platbou vám zašleme e-mailové upozornění.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <CalendarCheck weight="fill" className="text-orange-500" />
              2. Výše a frekvence plateb
            </h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-semibold">Tarif</th>
                    <th className="text-right py-3 font-semibold">Měsíční platba</th>
                    <th className="text-right py-3 font-semibold">Frekvence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3">Zákazník</td>
                    <td className="text-right py-3">99 Kč bez DPH</td>
                    <td className="text-right py-3">Měsíčně</td>
                  </tr>
                  <tr>
                    <td className="py-3">Dodavatel</td>
                    <td className="text-right py-3">399 Kč bez DPH</td>
                    <td className="text-right py-3">Měsíčně</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              K uvedeným cenám bude připočtena DPH dle platných právních předpisů.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <XCircle weight="fill" className="text-orange-500" />
              3. Zrušení opakovaných plateb
            </h2>
            <p className="mb-4">
              <strong>Opakované platby můžete kdykoliv zrušit</strong> jedním z následujících způsobů:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>V nastavení účtu:</strong> Přihlaste se do svého účtu na CraftBolt.cz a v sekci 
                „Předplatné" klikněte na „Zrušit předplatné".
              </li>
              <li>
                <strong>E-mailem:</strong> Napište nám na <a href="mailto:info@craftbolt.cz" className="text-orange-500 hover:text-orange-600">info@craftbolt.cz</a> s 
                žádostí o zrušení opakovaných plateb.
              </li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
              <p className="text-green-800">
                <strong>Po zrušení</strong> opakovaných plateb zůstane vaše předplatné aktivní do konce 
                aktuálního zaplaceného období. Žádné další platby nebudou strhovány.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Neúspěšná platba</h2>
            <p className="mb-4">
              Pokud se nepodaří platbu z karty strhnout (nedostatek prostředků, expirovaná karta apod.):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Budete informováni e-mailem o neúspěšné platbě.</li>
              <li>Systém se pokusí o další stržení platby během následujících dnů.</li>
              <li>Pokud platba nebude úspěšná ani po opakovaných pokusech, bude vaše předplatné pozastaveno.</li>
              <li>Pro obnovení služby aktualizujte platební údaje nebo proveďte platbu ručně.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Bezpečnost plateb</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Všechny platby jsou zpracovávány prostřednictvím zabezpečené platební brány <strong>GoPay</strong>.</li>
              <li>Údaje o vaší platební kartě jsou šifrovány a nejsou uloženy na našich serverech.</li>
              <li>Platební brána splňuje bezpečnostní standard PCI DSS.</li>
              <li>Pro vyšší bezpečnost může být vyžadováno 3D Secure ověření.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Změna tarifu</h2>
            <p>
              Tarif můžete kdykoliv změnit v nastavení svého účtu. Při změně tarifu bude nová cena 
              účtována od následujícího platebního období.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Kontakt</h2>
            <p>
              V případě dotazů ohledně opakovaných plateb nás kontaktujte na e-mailu{' '}
              <a href="mailto:info@craftbolt.cz" className="text-orange-500 hover:text-orange-600">
                info@craftbolt.cz
              </a>.
            </p>
          </section>

          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Provozovatel</h2>
            <p className="text-gray-600">
              <strong>AC/DC MONT s.r.o.</strong><br />
              Sportovní 7, 789 63 Ruda nad Moravou<br />
              IČ: 097 44 550 | DIČ: CZ09744550
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8 pt-4 border-t border-gray-200">
            Tyto podmínky opakovaných plateb jsou platné od 1. 4. 2026.
          </p>

        </div>

        {/* Links */}
        <div className="mt-8 text-center space-x-6">
          <Link to="/obchodni-podminky" className="text-orange-500 hover:text-orange-600 font-medium">
            Obchodní podmínky
          </Link>
          <Link to="/kontakt" className="text-orange-500 hover:text-orange-600 font-medium">
            Kontakt
          </Link>
          <Link to="/cenik" className="text-orange-500 hover:text-orange-600 font-medium">
            Ceník
          </Link>
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

export default RecurringPaymentsPage;
