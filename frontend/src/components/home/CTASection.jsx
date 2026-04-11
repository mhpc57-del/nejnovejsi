import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { fadeUp, staggerContainer } from './animations';

export const CTASection = () => (
  <section className="py-24 px-6 md:px-12">
    <div className="max-w-3xl mx-auto text-center">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
        <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>
          Připraveni začít?
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="text-lg text-zinc-500 dark:text-zinc-400 mt-4 mb-10">
          Zaregistrujte se ještě dnes a začněte používat CraftBolt.
        </motion.p>
        <motion.div variants={fadeUp} custom={2}>
          <Link to="/registrace" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/25" data-testid="cta-register-btn">
            Vytvořit účet
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  </section>
);
