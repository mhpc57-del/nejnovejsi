import React from 'react';
import { DeviceMobile } from '@phosphor-icons/react';

export const MobileAppBanner = () => (
  <section className="px-6 md:px-12" data-testid="mobile-app-banner">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 border border-zinc-200/60 dark:border-zinc-700">
        <div className="w-16 h-16 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
          <DeviceMobile weight="duotone" className="w-8 h-8 text-orange-500" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-2.5 justify-center md:justify-start mb-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Mobilní aplikace CraftBolt</h3>
            <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wide">Ve vývoji</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-lg">
            Pracujeme na nativní aplikaci pro <span className="text-zinc-900 dark:text-white font-medium">Google Play</span> i <span className="text-zinc-900 dark:text-white font-medium">Apple App Store</span>.
            Registrovaní uživatelé budou informováni o možnosti bezplatného stažení.
          </p>
        </div>
      </div>
    </div>
  </section>
);
