import React from 'react';
import { DeviceMobile } from '@phosphor-icons/react';

export const MobileAppBanner = () => (
  <section className="px-6 md:px-12 lg:px-24" data-testid="mobile-app-banner">
    <div className="max-w-7xl mx-auto">
      <div className="bg-zinc-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 border border-zinc-800">
        <div className="w-16 h-16 bg-orange-500/15 rounded-2xl flex items-center justify-center flex-shrink-0">
          <DeviceMobile weight="duotone" className="w-8 h-8 text-orange-400" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
            <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>Mobilní aplikace CraftBolt</h3>
            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Ve vývoji</span>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
            Pracujeme na nativní aplikaci pro <span className="text-white font-medium">Google Play</span> i <span className="text-white font-medium">Apple App Store</span>.
            Registrovaní uživatelé budou informováni o možnosti bezplatného stažení.
          </p>
        </div>
      </div>
    </div>
  </section>
);
