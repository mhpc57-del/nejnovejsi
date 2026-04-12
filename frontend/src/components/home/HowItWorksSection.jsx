import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { fadeUp, staggerContainer } from './animations';

const steps = [
  { num: "01", title: "Zákazník zadá poptávku", desc: "Vybere kategorii, popíše požadavek, přidá fotografie, zadá adresu a termín." },
  { num: "02", title: "Dodavatel vytvoří nabídku", desc: "Dodavatel dostane upozornění o poptávce, vytvoří a odešle nabídku" },
  { num: "03", title: "Zákazník přijme nabídku", desc: "Zákazník přijme nabídku, informuje dodavatele a dohodnou se na dalším postupu" },
  { num: "04", title: "Dodavatel zrealizuje zakázku", desc: "Dodavatel provede práci a předá ji zákazníkovi" },
  { num: "05", title: "Nahrání fotografií z realizace", desc: "Dodavatel nahraje fotografie z průběhu a dokončení realizace zakázky" },
  { num: "06", title: "Vzájemné hodnocení", desc: "Obě strany ohodnotí spolupráci. Recenze budují důvěru." },
];

export const HowItWorksSection = () => (
  <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-zinc-900" data-testid="how-it-works">
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <div className="lg:col-span-5">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.span variants={fadeUp} className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase">Proces</motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mt-4 mb-4" style={{ fontFamily: 'Outfit' }}>
              Jak to celé funguje
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-zinc-400 leading-relaxed mb-10">
              Od zadání poptávky po dokončení zakázky. Šest jednoduchých kroků.
            </motion.p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="relative">
            <svg viewBox="0 0 300 340" className="w-full max-w-[500px] mx-auto" fill="none">
              <path d="M150 30 L260 80" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
              <path d="M260 80 L260 200" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
              <path d="M260 200 L150 260" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
              <path d="M150 260 L40 200" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
              <path d="M40 200 L40 80" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
              <path d="M40 80 L150 30" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
              <polygon points="255,78 265,85 253,85" fill="#f97316" opacity="0.7" />
              <polygon points="257,195 265,195 261,205" fill="#f97316" opacity="0.7" />
              <polygon points="155,257 145,264 145,252" fill="#f97316" opacity="0.7" />
              <polygon points="45,202 35,195 47,195" fill="#f97316" opacity="0.7" />
              <polygon points="43,85 35,85 39,75" fill="#f97316" opacity="0.7" />
              <polygon points="145,33 155,33 150,23" fill="#f97316" opacity="0.7" />
              {[
                { cx: 150, cy: 28, num: "01", label: "POPTÁVKA" },
                { cx: 260, cy: 80, num: "02", label: "NABÍDKA" },
                { cx: 260, cy: 200, num: "03", label: "PŘIJMUTÍ" },
                { cx: 150, cy: 260, num: "04", label: "REALIZACE" },
                { cx: 40, cy: 200, num: "05", label: "FOTOGRAFIE", fontSize: 5 },
                { cx: 40, cy: 80, num: "06", label: "HODNOCENÍ", fontSize: 5 },
              ].map((s) => (
                <g key={s.num}>
                  <circle cx={s.cx} cy={s.cy} r="24" fill="#f97316" opacity="0.15" />
                  <circle cx={s.cx} cy={s.cy} r="18" fill="#f97316" opacity="0.25" />
                  <text x={s.cx} y={s.cy - 3} textAnchor="middle" fill="#f97316" fontSize="14" fontWeight="bold">{s.num}</text>
                  <text x={s.cx} y={s.cy + 8} textAnchor="middle" fill="#fb923c" fontSize={s.fontSize || 5.5} fontWeight="500">{s.label}</text>
                </g>
              ))}
              <text x="150" y="145" textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="bold" opacity="0.6">CraftBolt</text>
            </svg>
          </motion.div>
        </div>

        <motion.div className="lg:col-span-7 space-y-3" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          {steps.map((step, index) => (
            <motion.div key={index} variants={fadeUp} custom={index}
              className="bg-zinc-800/80 rounded-2xl p-6 border border-zinc-700/50 hover:border-orange-500/40 transition-all duration-200"
              data-testid={`step-card-${index}`}
            >
              <div className="flex gap-5">
                <span className="text-3xl font-black text-orange-500 tracking-tighter" style={{ fontFamily: 'Outfit' }}>{step.num}</span>
                <div>
                  <h3 className="font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
          <div className="pt-6">
            <Link to="/registrace" className="inline-flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/25 text-sm tracking-wide uppercase" data-testid="how-it-works-cta">
              Přidat poptávku
              <ArrowRight weight="bold" className="w-4 h-4" />
            </Link>
            <p className="text-orange-400 text-sm mt-4 leading-relaxed max-w-md" style={{ fontFamily: 'Outfit' }}>
              Jednoduše přidejte poptávku ... počkejte na nabídku a napřímo se dohodněte s dodavatelem.
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="mt-24 bg-orange-500/5 rounded-2xl p-8 md:p-10 border border-orange-500/20">
        <h3 className="font-bold text-white mb-5 text-lg" style={{ fontFamily: 'Outfit' }}>Důležité upozornění</h3>
        <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
          <p>V případě, že si obě smluvní strany předají osobní kontakty z důvodu dalších realizací služeb nebo z důvodu poskytnutí záruk, je jim toto samozřejmě umožněno. Pamatujte však na to, že sjednávání dalších služeb mimo tuto platformu je mnohdy rizikovější.</p>
          <p>Sjednávání zakázek přes naši platformu je pohodlné, rychlé, efektivní a máte vždy jasný přehled o svých zakázkách. Veškerá historie (zakázky, chat, fotografie, hodnocení či případné spory) se Vám nikdy neztratí.</p>
          <p className="font-bold text-orange-400">Doporučení: Nikdy neřešte spor osobně či po telefonu. Vždy pamatujte na to, že co je psáno, to je dáno!</p>
        </div>
      </motion.div>
    </div>
  </section>
);
