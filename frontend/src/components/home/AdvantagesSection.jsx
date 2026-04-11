import React from 'react';
import { motion } from 'framer-motion';
import { CurrencyDollar, Tag, ShieldCheck, Star, ChatCircle, Lightning, UserCircle } from '@phosphor-icons/react';
import { fadeUp, staggerContainer } from './animations';

const customerAdvantages = [
  { icon: CurrencyDollar, title: "Nejlevnější platforma", desc: "Nepotřebujeme zbohatnout. Pomáháme lidem." },
  { icon: Tag, title: "Rychlé zjištění ceny", desc: "Dodavatel nabídne odhadovanou cenu před zahájením." },
  { icon: ShieldCheck, title: "Ověřené profily dodavatelů", desc: "Žádné FAKE účty. Pouze ověření uživatelé." },
  { icon: Star, title: "Hodnocení dodavatelů", desc: "Hodnocení udělují skuteční zákazníci." },
  { icon: ChatCircle, title: "Online CHAT", desc: "Diskrétní chat přímo v aplikaci." },
];

const supplierAdvantages = [
  { icon: CurrencyDollar, title: "Nejlevnější platforma", desc: "Nepotřebujeme zbohatnout. Pomáháme lidem." },
  { icon: Lightning, title: "Rychlé získání zakázky", desc: "Bez zbytečného papírování. Zakázka do 5 minut." },
  { icon: UserCircle, title: "Registrace bez IČ", desc: "Možnost jednorázového přivýdělku bez ŽL." },
  { icon: ShieldCheck, title: "Neřešíme registry", desc: "Každý se může dostat do problémů. Dáváme druhou šanci." },
  { icon: ChatCircle, title: "Online CHAT", desc: "Diskrétní chat přímo v aplikaci." },
];

const AdvantageCard = ({ adv, index, prefix }) => (
  <motion.div variants={fadeUp} custom={index}
    className="group bg-white dark:bg-zinc-900 rounded-lg p-5 border border-zinc-200/80 dark:border-zinc-800 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20 transition-all duration-200"
    data-testid={`${prefix}-adv-${index}`}
  >
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-9 h-9 bg-orange-500/10 rounded-md flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
        <adv.icon weight="duotone" className="w-4.5 h-4.5 text-orange-500" />
      </div>
    </div>
    <h3 className="font-semibold text-zinc-900 dark:text-white text-sm mb-1.5">{adv.title}</h3>
    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{adv.desc}</p>
  </motion.div>
);

const AdvantageGroup = ({ label, title, advantages, prefix }) => (
  <div data-testid={`${prefix}-advantages`}>
    <motion.div className="mb-10" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={staggerContainer}>
      <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">{label}</motion.span>
      <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-white mt-4" style={{ fontFamily: 'Outfit' }}>
        {title}
      </motion.h2>
    </motion.div>
    <motion.div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={staggerContainer}>
      {advantages.map((adv, index) => (
        <AdvantageCard key={index} adv={adv} index={index} prefix={prefix} />
      ))}
    </motion.div>
  </div>
);

export const AdvantagesSection = () => (
  <section className="py-24 px-6 md:px-12" data-testid="advantages-section">
    <div className="max-w-7xl mx-auto space-y-20">
      <AdvantageGroup label="Pro zadavatele" title="Výhody pro zákazníky" advantages={customerAdvantages} prefix="customer" />
      <AdvantageGroup label="Pro dodavatele" title="Výhody pro dodavatele" advantages={supplierAdvantages} prefix="supplier" />
    </div>
  </section>
);
