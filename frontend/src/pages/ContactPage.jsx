import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Envelope, MapPin, Clock } from '@phosphor-icons/react';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            <span className="text-zinc-900 dark:text-white">Craft</span>
            <span className="text-orange-500">Bolt</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-white">
            <ArrowLeft weight="bold" />
            Zpět na hlavní stránku
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">Kontaktujte nás</h1>
          <p className="text-zinc-600 text-lg">
            Máte dotaz nebo potřebujete pomoc? Jsme tu pro vás.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Kontaktní údaje</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Envelope weight="fill" className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">E-mail</h3>
                  <a href="mailto:info@craftbolt.cz" className="text-orange-500 hover:text-orange-600">
                    info@craftbolt.cz
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin weight="fill" className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Adresa</h3>
                  <p className="text-zinc-600">
                    Provozovatel: AC/DC MONT s.r.o.<br />
                    Sportovní 7<br />
                    789 63 Ruda nad Moravou<br />
                    Česká republika
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock weight="fill" className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Provozní doba podpory</h3>
                  <p className="text-zinc-600">
                    Pondělí – Pátek: 8:00 – 16:00<br />
                    Sobota – Neděle: Zavřeno
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Napište nám</h2>
            
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
                  Jméno a příjmení
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                  placeholder="Jan Novák"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                  placeholder="jan@email.cz"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-zinc-700 mb-1">
                  Předmět
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                >
                  <option value="">Vyberte předmět</option>
                  <option value="general">Obecný dotaz</option>
                  <option value="technical">Technická podpora</option>
                  <option value="billing">Fakturace a platby</option>
                  <option value="partnership">Spolupráce</option>
                  <option value="other">Jiné</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-zinc-700 mb-1">
                  Zpráva
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Napište svou zprávu..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Odeslat zprávu
              </button>
            </form>
          </div>
        </div>

        {/* Company Info */}
        <div className="mt-12 bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Fakturační údaje</h2>
          <div className="grid md:grid-cols-2 gap-6 text-zinc-600">
            <div>
              <p><strong>Provozovatel:</strong> AC/DC MONT s.r.o.</p>
              <p><strong>Sídlo:</strong> Sportovní 7, 789 63 Ruda nad Moravou</p>
              <p><strong>IČ:</strong> 097 44 550</p>
              <p><strong>DIČ:</strong> CZ09744550</p>
            </div>
            <div>
              <p><strong>Zapsáno:</strong> v obchodním rejstříku vedeném</p>
              <p>Krajským soudem v Ostravě</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-8 text-center space-x-6">
          <Link to="/obchodni-podminky" className="text-orange-500 hover:text-orange-600 font-medium">
            Obchodní podmínky
          </Link>
          <Link to="/ochrana-udaju" className="text-orange-500 hover:text-orange-600 font-medium">
            Ochrana osobních údajů
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-400 text-sm">
            © 2026 CraftBolt. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
