import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wall, Lightning, Drop, Fire, PlusCircle, ArrowRight,
  ChatCircle, CurrencyCircleDollar, Broadcast, Broom
} from '@phosphor-icons/react';
import { Drill, PaintRoller } from 'lucide-react';

const categories = [
  {
    icon: Drill,
    label: 'Hodinový manžel',
    image: '/hero/instalater.jpg',
    isLucide: true,
  },
  {
    icon: PaintRoller,
    label: 'Malířské práce',
    image: '/hero/malir.jpg',
    isLucide: true,
  },
  {
    icon: Broom,
    label: 'Úklidové práce',
    image: '/hero/uklizecka.png',
    isLucide: false,
  },
  {
    icon: Wall,
    label: 'Zednické práce',
    image: '/hero/zednik.jpg',
    isLucide: false,
  },
  {
    icon: Lightning,
    label: 'Elektrikářské práce',
    image: '/hero/elektrikar.jpg',
    isLucide: false,
  },
  {
    icon: Drop,
    label: 'Vodařské práce',
    image: '/hero/obkladac.jpg',
    isLucide: false,
  },
  {
    icon: Fire,
    label: 'Topenářské práce',
    image: '/hero/topenar.jpg',
    isLucide: false,
  },
  {
    icon: PlusCircle,
    label: 'Další kategorie',
    image: '/hero/bagrista.png',
    isLucide: false,
  },
];

const HeroSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % categories.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleSelect = useCallback((index) => {
    setActiveIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 6000);
  }, []);

  const active = categories[activeIndex];

  const renderIcon = (cat, isActive, sizeClass) => {
    const Icon = cat.icon;
    const colorClass = isActive
      ? 'text-orange-500'
      : 'text-zinc-400 dark:text-orange-400 group-hover:text-orange-500 dark:group-hover:text-orange-300';

    if (cat.isLucide) {
      return <Icon className={`${sizeClass} ${colorClass} transition-colors duration-300`} strokeWidth={isActive ? 2.5 : 2} />;
    }
    return <Icon weight={isActive ? 'fill' : 'duotone'} className={`${sizeClass} ${colorClass} transition-colors duration-300`} />;
  };

  return (
    <section className="relative bg-stone-50 dark:bg-zinc-900 overflow-hidden" data-testid="hero-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-28 pb-10 md:pt-36 md:pb-14 relative">
        {/* Left-aligned titles */}
        <div className="mb-8 md:mb-10">
          <h1
            className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white uppercase"
            style={{ fontFamily: 'Outfit' }}
            data-testid="hero-title"
          >
            Portál pro vkládání poptávek
          </h1>
          <p
            className="text-3xl sm:text-4xl md:text-5xl text-orange-500 font-bold mt-2"
            style={{ fontFamily: 'Outfit' }}
          >
            Jednoduše, rychle, spolehlivě
          </p>
        </div>

        {/* Main content: categories grid + photo */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left — Category grid + CTA */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="hero-categories">
              {categories.map((cat, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className={`relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                      isActive
                        ? 'bg-white dark:bg-white border-zinc-200 dark:border-white shadow-lg shadow-zinc-200/50 dark:shadow-white/10 scale-105'
                        : 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/50 hover:border-orange-300 dark:hover:border-zinc-600 hover:shadow-md'
                    }`}
                    data-testid={`hero-cat-${i}`}
                  >
                    {renderIcon(cat, isActive, 'w-7 h-7')}
                    <span
                      className={`text-[11px] font-semibold text-center leading-tight transition-colors duration-300 ${
                        isActive
                          ? 'text-zinc-900'
                          : 'text-zinc-600 dark:text-white/80 group-hover:text-zinc-900 dark:group-hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </span>
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

            {/* CTA Button */}
            <div className="mt-6">
              <Link
                to="/registrace"
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/25 text-sm"
                data-testid="hero-register-btn"
              >
                Přidat poptávku
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Link>
            </div>

            {/* Orange description text */}
            <p className="text-orange-500 italic text-sm mt-4 leading-relaxed max-w-md" style={{ fontFamily: 'Outfit' }}>
              Jednoduše přidejte poptávku ... počkejte na nabídku a napřímo se dohodněte s dodavatelem.
            </p>
          </div>

          {/* Right — Category label + Photo */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <h3
                  className="text-2xl md:text-3xl font-medium text-zinc-900 dark:text-white mb-4"
                  style={{ fontFamily: 'Outfit' }}
                  data-testid="hero-active-label"
                >
                  {active.label}
                </h3>
                <div className="rounded-2xl overflow-hidden">
                  <img
                    src={active.image}
                    alt={active.label}
                    className="w-full h-[300px] lg:h-[380px] object-cover"
                    data-testid="hero-active-image"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Micro features: mobilní aplikace label + features */}
        <div className="mt-10">
          <p className="text-xs font-bold text-zinc-900 dark:text-white tracking-wider uppercase text-center mb-3">
            od 99 Kč měsíčně
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap">
            {[
              { Icon: ChatCircle, label: 'SMS notifikace', isPhosphor: true },
              { Icon: CurrencyCircleDollar, label: 'od 99 Kč měsíčně', isPhosphor: true },
              { Icon: Broadcast, label: 'RealTime sledování příjezdů', isPhosphor: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-orange-500/15 flex items-center justify-center">
                  <item.Icon weight="duotone" className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                </div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
