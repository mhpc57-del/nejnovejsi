import React from 'react';
import { Link } from 'react-router-dom';
import CraftBoltLogo from '../CraftBoltLogo';

export const HomeFooter = () => (
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
);
