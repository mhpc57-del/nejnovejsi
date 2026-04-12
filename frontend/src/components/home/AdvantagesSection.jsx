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

const AdvantageCard = ({ adv, index, prefix, dark }) => (
  <motion.div variants={fadeUp} custom={index}
    className={`group rounded-2xl p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
      dark
        ? 'bg-zinc-800 border-zinc-700/50 hover:border-orange-500/40 hover:shadow-orange-500/5'
        : 'bg-white border-zinc-200/80 hover:border-orange-500/30 hover:shadow-zinc-900/5'
    }`}
    data-testid={`${prefix}-adv-${index}`}
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors ${
      dark ? 'bg-orange-500/15 group-hover:bg-orange-500/25' : 'bg-orange-50 group-hover:bg-orange-100'
    }`}>
      <adv.icon weight="duotone" className="w-5 h-5 text-orange-500" />
    </div>
    <h3 className={`font-bold text-sm mb-2 ${dark ? 'text-white' : 'text-zinc-900'}`}>{adv.title}</h3>
    <p className={`text-sm leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{adv.desc}</p>
  </motion.div>
);

export const AdvantagesSection = () => (
  <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24" data-testid="advantages-section">
    <div className="max-w-7xl mx-auto space-y-24">

      {/* Customer Advantages — light bg */}
      <div data-testid="customer-advantages">
        <motion.div className="mb-12" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={staggerContainer}>
          <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Pro zadavatele</motion.span>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mt-4" style={{ fontFamily: 'Outfit' }}>
            Výhody pro zákazníky
          </motion.h2>
        </motion.div>
        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={staggerContainer}>
          {customerAdvantages.map((adv, index) => (
            <AdvantageCard key={index} adv={adv} index={index} prefix="customer" dark={false} />
          ))}
        </motion.div>
      </div>

      {/* Supplier Advantages — dark bg */}
      <div className="bg-zinc-900 rounded-3xl p-8 md:p-12" data-testid="supplier-advantages">
        <motion.div className="mb-12" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={staggerContainer}>
          <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Pro dodavatele</motion.span>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mt-4" style={{ fontFamily: 'Outfit' }}>
            Výhody pro dodavatele
          </motion.h2>
        </motion.div>
        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={staggerContainer}>
          {supplierAdvantages.map((adv, index) => (
            <AdvantageCard key={index} adv={adv} index={index} prefix="supplier" dark={true} />
          ))}
        </motion.div>
      </div>

    </div>
  </section>
);
