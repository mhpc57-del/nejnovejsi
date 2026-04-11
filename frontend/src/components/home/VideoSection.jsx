import React from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from './animations';

export const VideoSection = () => (
  <section className="py-24 px-6 md:px-12">
    <div className="max-w-5xl mx-auto">
      <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
        <motion.span variants={fadeUp} className="text-xs font-bold text-zinc-500 dark:text-zinc-500 tracking-[0.2em] uppercase">Podívejte se</motion.span>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-3" style={{ fontFamily: 'Outfit' }}>
          Jak CraftBolt funguje v praxi
        </motion.h2>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video shadow-2xl ring-1 ring-zinc-200/50 dark:ring-zinc-800">
        <iframe src="https://www.youtube.com/embed/eR8_-m_mYoE?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3" title="Jak CraftBolt funguje"
          frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen className="w-full h-full" data-testid="promo-video-youtube" />
      </motion.div>
    </div>
  </section>
);
