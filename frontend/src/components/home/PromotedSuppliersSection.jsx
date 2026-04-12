import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Plus, Clock } from '@phosphor-icons/react';
import { API } from '../../App';
import { fadeUp, staggerContainer } from './animations';

const CountdownTimer = ({ paidUntil }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const end = new Date(paidUntil);
      const diff = end - now;
      if (diff <= 0) { setTimeLeft('Vypršelo'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else setTimeLeft(`${hours}h ${mins}m`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [paidUntil]);

  return (
    <span className="flex items-center gap-1.5 text-[10px] text-orange-500 font-bold font-mono">
      <Clock weight="bold" className="w-3 h-3" /> {timeLeft}
    </span>
  );
};

export const PromotedSuppliersSection = ({ promotedSuppliers, onShowPromoForm }) => (
  <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24" data-testid="promoted-suppliers-section">
    <div className="max-w-7xl mx-auto">
      <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
        <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Sponzorovaní</motion.span>
        <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mt-4" style={{ fontFamily: 'Outfit' }}>
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
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                data-testid={`promo-card-${i}`}>
                <div className="flex items-center gap-4 mb-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt={supplier.company_name} className="w-14 h-14 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
                  ) : (
                    <div className="w-14 h-14 bg-orange-50 dark:bg-orange-500/15 rounded-xl flex items-center justify-center">
                      <Briefcase weight="duotone" className="w-7 h-7 text-orange-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-900 dark:text-white text-sm truncate">{supplier.company_name}</h3>
                    {supplier.website && <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:text-orange-600 truncate block">{supplier.website}</a>}
                  </div>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 mb-3">{supplier.bio}</p>
                {supplier.phone && <p className="text-xs text-zinc-400 mb-3">{supplier.phone}</p>}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Sponzor</span>
                  {supplier.paid_until && <CountdownTimer paidUntil={supplier.paid_until} />}
                </div>
              </motion.div>
            );
          }
          return (
            <motion.button key={`empty-${i}`} variants={fadeUp} custom={i}
              onClick={onShowPromoForm}
              className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-6 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg transition-all duration-200 text-center group cursor-pointer"
              data-testid={`promo-empty-${i}`}>
              <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-500/15 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                <Plus weight="bold" className="w-6 h-6 text-zinc-300 group-hover:text-orange-500 transition-colors" />
              </div>
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-orange-500 transition-colors mb-1">Přejete si reklamu zde?</p>
              <p className="text-xs font-bold text-orange-500">od 39 Kč/den</p>
            </motion.button>
          );
        })}
      </motion.div>

      {promotedSuppliers.length >= 8 && (
        <div className="text-center mt-10">
          <button onClick={onShowPromoForm}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 text-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/25 tracking-wide uppercase"
            data-testid="add-promo-banner-btn">
            <Plus weight="bold" className="w-4 h-4" />
            Přidat reklamní banner
          </button>
        </div>
      )}
    </div>
  </section>
);
