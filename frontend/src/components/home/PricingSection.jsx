import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from './animations';

export const PricingSection = () => (
  <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24" data-testid="pricing-section">
    <div className="max-w-5xl mx-auto">
      <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
        <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Ceník</motion.span>
        <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mt-4" style={{ fontFamily: 'Outfit' }}>
          Jednoduchý a férový ceník
        </motion.h2>
      </motion.div>
      
      <motion.div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
        {/* Zákazník — ZDARMA */}
        <motion.div variants={fadeUp} custom={0}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 flex flex-col" data-testid="pricing-card-customer">
          <div className="mb-8">
            <span className="text-xs font-bold text-zinc-400 tracking-[0.2em] uppercase">Zákazník</span>
            <p className="text-sm text-zinc-500 mt-2">Vkládání poptávek je</p>
            <div className="mt-4">
              <span className="text-5xl lg:text-6xl font-black text-orange-500 tracking-tighter" style={{ fontFamily: 'Outfit' }}>ZDARMA</span>
            </div>
          </div>
          <div className="border-t border-orange-500/30 pt-6 flex-1">
            <p className="text-sm text-orange-500 font-bold mb-2">Při vytváření poptávky je doporučené</p>
            <p className="text-2xl font-black text-orange-500 mb-4 tracking-tight" style={{ fontFamily: 'Outfit' }}>Ověření za 49 Kč</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Ověřením poptávky dáváte dodavatelům najevo, že poptávku myslíte vážně, a že se nejedná například o nezávazné zjišťování ceny.
            </p>
          </div>
          <Link to="/registrace?role=customer" className="mt-8 block w-full text-center py-4 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl font-bold text-white text-sm tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-lg" data-testid="pricing-customer-btn">
            Registrace zákazníka
          </Link>
        </motion.div>

        {/* Dodavatel — highlighted */}
        <motion.div variants={fadeUp} custom={1}
          className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col relative overflow-hidden ring-2 ring-orange-500/50 shadow-[0_0_40px_rgba(249,115,22,0.15)]" data-testid="pricing-card-supplier">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />
          <div className="p-8 pb-6">
            <span className="text-xs font-bold text-zinc-400 tracking-[0.2em] uppercase">Dodavatel</span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Jednorázová platba na 1 měsíc</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl lg:text-6xl font-black text-orange-500 tracking-tighter" style={{ fontFamily: 'Outfit' }}>190</span>
              <span className="text-xl text-zinc-400 dark:text-zinc-500 font-medium">Kč</span>
            </div>
          </div>
          <div className="p-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex-1">
            <span className="text-xs font-bold text-zinc-400 tracking-[0.2em] uppercase">Dodavatel</span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Jednorázová platba na celý rok</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl lg:text-6xl font-black text-orange-500 tracking-tighter" style={{ fontFamily: 'Outfit' }}>1.890</span>
              <span className="text-xl text-zinc-400 dark:text-zinc-500 font-medium">Kč</span>
            </div>
            <p className="text-sm text-orange-500 font-bold mt-3">* ušetříte 390 Kč</p>
          </div>
          <div className="px-8 pb-8">
            <Link to="/registrace?role=supplier" className="block w-full text-center py-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-white text-sm tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25" data-testid="pricing-dodavatel-btn">
              Registrace dodavatele
            </Link>
          </div>
        </motion.div>
      </motion.div>
      <p className="text-center text-zinc-400 text-sm mt-10">
        Platba kartou přes zabezpečenou bránu Stripe. <strong className="text-zinc-600 dark:text-zinc-300">Všechny ceny jsou uvedeny včetně 21% DPH.</strong>
      </p>
    </div>
  </section>
);
