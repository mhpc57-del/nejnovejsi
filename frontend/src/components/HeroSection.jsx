import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, PaintBrush, Broom, Wall, Lightning, Drop, Fire, PlusCircle, ArrowRight,
  ChatCircle, CurrencyCircleDollar, Broadcast
} from '@phosphor-icons/react';

const categories = [
  {
    icon: Wrench,
    label: 'Hodinový manžel',
    image: '/hero/instalater.jpg',
  },
  {
    icon: PaintBrush,
    label: 'Malířské práce',
    image: '/hero/malir.jpg',
  },
  {
    icon: Broom,
    label: 'Úklidové práce',
    image: '/hero/uklizecka.png',
  },
  {
    icon: Wall,
    label: 'Zednické práce',
    image: '/hero/zednik.jpg',
  },
  {
    icon: Lightning,
    label: 'Elektrikářské práce',
    image: '/hero/elektrikar.jpg',
  },
  {
    icon: Drop,
    label: 'Vodařské práce',
    image: '/hero/obkladac.jpg',
  },
  {
    icon: Fire,
    label: 'Topenářské práce',
    image: '/hero/topenar.jpg',
  },
  {
    icon: PlusCircle,
    label: 'Další kategorie',
    image: '/hero/bagrista.png',
  },
];

const HeroSection = ({ onQuickDemand }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % categories.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleSelect = useCallback((index) => {
    setActiveIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 6000);
  }, []);

  const active = categories[activeIndex];

  return (
    <section className="relative bg-zinc-900 overflow-hidden" data-testid="hero-section">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-28 pb-16 md:pt-36 md:pb-20 relative">
        {/* Title area */}
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white uppercase" style={{ fontFamily: 'Outfit' }} data-testid="hero-title">
            Portál pro vkládání poptávek
          </h1>
          <p className="text-lg sm:text-xl text-orange-400 italic mt-3 font-medium" style={{ fontFamily: 'Outfit' }}>
            Jednoduše, rychle, spolehlivě
          </p>
        </div>

        {/* Main content: categories grid + photo */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Left — Category grid */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2" data-testid="hero-categories">
              {categories.map((cat, i) => {
                const isActive = i === activeIndex;
                const Icon = cat.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className={`relative flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-xl border transition-all duration-300 cursor-pointer group ${
                      isActive
                        ? 'bg-white border-white shadow-lg shadow-white/10'
                        : 'bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
                    }`}
                    data-testid={`hero-cat-${i}`}
                  >
                    <Icon
                      weight={isActive ? 'fill' : 'duotone'}
                      className={`w-8 h-8 transition-colors duration-300 ${
                        isActive ? 'text-orange-500' : 'text-orange-400 group-hover:text-orange-300'
                      }`}
                    />
                    <span className={`text-xs font-semibold text-center leading-tight transition-colors duration-300 ${
                      isActive ? 'text-zinc-900' : 'text-white/80 group-hover:text-white'
                    }`}>
                      {cat.label}
                    </span>
                    {/* Active indicator dot */}
                    {isActive && (
                      <motion.div
                        layoutId="activeDot"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* CTA Buttons below categories */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link
                to="/registrace"
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3.5 rounded-lg transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/25 text-sm"
                data-testid="hero-register-btn"
              >
                Přidat poptávku
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Link>
              <button
                onClick={onQuickDemand}
                className="inline-flex items-center justify-center gap-2 border border-zinc-600 hover:border-orange-500/60 text-zinc-300 hover:text-white font-medium px-6 py-3.5 rounded-lg transition-all duration-200 text-sm"
                data-testid="quick-demand-btn"
              >
                Rychlá poptávka bez registrace
              </button>
            </div>
          </div>

          {/* Right — Photo */}
          <div className="lg:col-span-7 relative min-h-[320px] lg:min-h-[440px] rounded-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <img
                  src={active.image}
                  alt={active.label}
                  className="w-full h-full object-cover"
                  data-testid="hero-active-image"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-transparent to-transparent" />
                {/* Category label overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                      <active.icon weight="fill" className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-bold text-lg" style={{ fontFamily: 'Outfit' }}>{active.label}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="absolute top-4 right-4 flex gap-1.5 z-10">
              {categories.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? 'w-6 bg-orange-500' : 'w-1.5 bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Description text */}
        <p className="text-center text-zinc-400 text-sm mt-10 max-w-2xl mx-auto leading-relaxed">
          Jednoduše přidejte poptávku, vyberte kategorii, popište svůj požadavek, počkejte na nabídku a napřímo se dohodněte s dodavatelem.
        </p>

        {/* Micro stats: SMS, Pricing, RealTime */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 mt-8 flex-wrap">
          {[
            { Icon: ChatCircle, label: 'SMS notifikace' },
            { Icon: CurrencyCircleDollar, label: 'od 199 Kč bez dalších poplatků' },
            { Icon: Broadcast, label: 'RealTime sledování příjezdů' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-orange-500/15 flex items-center justify-center">
                <item.Icon weight="duotone" className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <span className="text-xs font-medium text-zinc-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
