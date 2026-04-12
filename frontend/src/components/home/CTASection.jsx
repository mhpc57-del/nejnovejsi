import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { fadeUp, staggerContainer } from './animations';

export const CTASection = () => (
  <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24">
    <div className="max-w-7xl mx-auto">
      <div className="bg-zinc-100 dark:bg-zinc-900 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.12),transparent_60%)]" />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="relative z-10">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>
            Připraveni začít?
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-lg text-zinc-500 dark:text-zinc-400 mt-6 mb-12 max-w-md mx-auto leading-relaxed">
            Zaregistrujte se ještě dnes a začněte používat CraftBolt.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Link to="/registrace" className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-5 rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/25 text-sm tracking-wide uppercase" data-testid="cta-register-btn">
              Vytvořit účet
              <ArrowRight weight="bold" className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  </section>
);
