import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wall, Lightning, Drop, Fire, PlusCircle, ArrowRight,
  ChatCircle, Broadcast, DeviceMobile
} from '@phosphor-icons/react';
import {
  Drill, PaintRoller, Car, Snowflake, Flame, Wrench,
  Construction, HardHat, Axe, Pipette
} from 'lucide-react';

// Custom bucket + broom icon for cleaning
const BucketBroomIcon = ({ className, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 10h12l-1.5 10H5.5L4 10z" />
    <path d="M3.5 10h13" />
    <ellipse cx="10" cy="10" rx="6.5" ry="1.5" />
    <line x1="18" y1="3" x2="14" y2="18" />
    <path d="M17 19l-3-1 3 3" />
  </svg>
);

// Chimney/komín icon
const ChimneyIcon = ({ className, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="8" y="8" width="8" height="14" rx="1" />
    <path d="M10 8V5h4v3" />
    <path d="M9 2c0 1.5 1 2.5 1 4" />
    <path d="M12 1c0 1.5 1 2.5 1 4" />
    <path d="M15 2c0 1.5 1 2.5 1 4" />
  </svg>
);

// Klempíř (sheet metal worker) icon
const SheetMetalIcon = ({ className, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7l9-4 9 4" />
    <path d="M3 7v4l9 4 9-4V7" />
    <path d="M3 11v4l9 4 9-4v-4" />
  </svg>
);

// Pokrývač (roofer) icon
const RoofIcon = ({ className, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21h18" />
    <path d="M5 21V10l7-7 7 7v11" />
    <path d="M9 21v-6h6v6" />
    <path d="M2 10l10-8 10 8" />
  </svg>
);

// Svářeč (welder) icon
const WelderIcon = ({ className, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="5" />
    <path d="M7 12v3a5 5 0 0010 0v-3" />
    <line x1="12" y1="13" x2="12" y2="21" />
    <line x1="8" y1="18" x2="16" y2="18" />
    <path d="M3 5l2 2" />
    <path d="M19 5l2 2" />
  </svg>
);

// Sádrokartonář icon (drywall)
const DrywallIcon = ({ className, strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M7 7h2v2H7z" />
    <path d="M15 15h2v2h-2z" />
  </svg>
);

// Extra categories for the 3x3 grid (shown when "Další kategorie" is active)
const extraCategories = [
  { icon: Axe, label: 'Truhlář', isLucide: true },
  { icon: Car, label: 'Automechanik', isLucide: true },
  { icon: Snowflake, label: 'Chlaďaři', isLucide: true },
  { icon: ChimneyIcon, label: 'Kominíci', isLucide: true },
  { icon: SheetMetalIcon, label: 'Klempíři', isLucide: true },
  { icon: Pipette, label: 'Plynaři', isLucide: true },
  { icon: RoofIcon, label: 'Pokrývači', isLucide: true },
  { icon: WelderIcon, label: 'Svářeči', isLucide: true },
  { icon: DrywallIcon, label: 'Sádrokartonáři', isLucide: true },
];

const categories = [
  {
    icon: Drill,
    label: 'Hodinový manžel',
    image: '/hero/hodinovy-manzel.jpg',
    isLucide: true,
  },
  {
    icon: PaintRoller,
    label: 'Malířské práce',
    image: '/hero/malirske-prace.jpg',
    isLucide: true,
  },
  {
    icon: BucketBroomIcon,
    label: 'Úklidové práce',
    image: '/hero/uklidove-prace.jpg',
    isLucide: true,
  },
  {
    icon: Wall,
    label: 'Zednické práce',
    image: '/hero/zednicke-prace.jpg',
    isLucide: false,
  },
  {
    icon: Lightning,
    label: 'Elektrikářské práce',
    image: '/hero/elektrikar-new.jpg',
    isLucide: false,
  },
  {
    icon: Drop,
    label: 'Vodařské práce',
    image: '/hero/vodarske-prace.jpg',
    isLucide: false,
  },
  {
    icon: Fire,
    label: 'Topenářské práce',
    image: '/hero/topenarske-prace.jpg',
    isLucide: false,
  },
  {
    icon: PlusCircle,
    label: 'Další náhodné kategorie',
    image: null, // Uses 3x3 grid instead
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
  const isExtraGrid = activeIndex === categories.length - 1;

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
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* === Block 1: Title (always first) === */}
          <div className="lg:col-span-5 order-1">
            <div className="mb-2 lg:mb-8">
              <h1
                className="hidden lg:block text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white uppercase"
                style={{ fontFamily: 'Outfit' }}
                data-testid="hero-title"
              >
                Portál pro vkládání poptávek
              </h1>
              <p
                className="text-3xl sm:text-4xl md:text-5xl text-orange-500 font-bold"
                style={{ fontFamily: 'Outfit' }}
              >
                Jednoduše, rychle, spolehlivě
              </p>
            </div>

            {/* Desktop only: categories + CTA inline */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-4 gap-3" data-testid="hero-categories-desktop">
                {categories.map((cat, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button key={i} onClick={() => handleSelect(i)}
                      className={`relative flex flex-col items-center justify-center gap-2 py-6 px-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                        isActive
                          ? 'bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-500 shadow-lg shadow-zinc-200/50 dark:shadow-black/20 scale-105'
                          : 'bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/50 hover:border-orange-300 dark:hover:border-zinc-500 hover:shadow-md'
                      }`}
                      data-testid={`hero-cat-${i}`}
                    >
                      {renderIcon(cat, isActive, 'w-7 h-7')}
                      <span className={`text-[11px] font-semibold text-center leading-tight transition-colors duration-300 ${isActive ? 'text-zinc-900 dark:text-white' : 'text-orange-500 dark:text-orange-400'}`}>
                        {cat.label}
                      </span>
                      {isActive && <motion.div layoutId="activeDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6">
                <Link to="/registrace" className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/25 text-sm" data-testid="hero-register-btn">
                  Přidat poptávku
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-orange-400 dark:text-orange-400 text-sm mt-4 leading-relaxed max-w-md" style={{ fontFamily: 'Outfit' }}>
                Jednoduše přidejte poptávku ... počkejte na nabídku a napřímo se dohodněte s dodavatelem.
              </p>
            </div>
          </div>

          {/* === Block 2: Photo/Grid (mobile: 2nd, desktop: right column) === */}
          <div className="lg:col-span-7 order-2">
            <AnimatePresence mode="wait">
              {isExtraGrid ? (
                <motion.div key="extra-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                  className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 flex flex-col justify-center"
                  data-testid="extra-categories-grid"
                >
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-5 text-center" style={{ fontFamily: 'Outfit' }}>
                    Další náhodné kategorie
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {extraCategories.map((cat, i) => {
                      const Icon = cat.icon;
                      return (
                        <div key={i}
                          className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl bg-stone-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-orange-400 hover:shadow-md transition-all duration-200 cursor-default"
                          data-testid={`extra-cat-${i}`}
                        >
                          <Icon className="w-6 h-6 text-orange-500" strokeWidth={2} />
                          <span className="text-[11px] font-semibold text-orange-500 dark:text-orange-400 text-center leading-tight">{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div key={activeIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="relative rounded-2xl overflow-hidden"
                >
                  <img src={active.image} alt={active.label} className="w-full object-cover" data-testid="hero-active-image" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                        {active.isLucide
                          ? <active.icon className="w-5 h-5 text-white" strokeWidth={2} />
                          : <active.icon weight="fill" className="w-5 h-5 text-white" />
                        }
                      </div>
                      <span className="text-white font-bold text-lg md:text-xl" style={{ fontFamily: 'Outfit' }} data-testid="hero-active-label">
                        {active.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* === Block 3: Mobile-only categories + CTA (after photo) === */}
          <div className="lg:hidden order-3 col-span-full">
            <div className="grid grid-cols-2 gap-2" data-testid="hero-categories">
              {categories.map((cat, i) => {
                const isActive = i === activeIndex;
                return (
                  <button key={i} onClick={() => handleSelect(i)}
                    className={`relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                      isActive
                        ? 'bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-500 shadow-lg shadow-zinc-200/50 dark:shadow-black/20 scale-105'
                        : 'bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/50 hover:border-orange-300 dark:hover:border-zinc-500 hover:shadow-md'
                    }`}
                    data-testid={`hero-cat-mobile-${i}`}
                  >
                    {renderIcon(cat, isActive, 'w-7 h-7')}
                    <span className={`text-[11px] font-semibold text-center leading-tight transition-colors duration-300 ${isActive ? 'text-zinc-900 dark:text-white' : 'text-orange-500 dark:text-orange-400'}`}>
                      {cat.label}
                    </span>
                    {isActive && <motion.div layoutId="activeDotMobile" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-6">
              <Link to="/registrace" className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm" data-testid="hero-register-btn-mobile">
                Přidat poptávku
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-orange-400 dark:text-orange-400 text-sm mt-4 leading-relaxed" style={{ fontFamily: 'Outfit' }}>
              Jednoduše přidejte poptávku ... počkejte na nabídku a napřímo se dohodněte s dodavatelem.
            </p>
          </div>

        </div>

        {/* Micro features */}
        <div className="mt-10">
          <div className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap">
            {[
              { Icon: ChatCircle, label: 'SMS notifikace' },
              { Icon: DeviceMobile, label: 'mobilní aplikace' },
              { Icon: Broadcast, label: 'RealTime sledování příjezdů' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-orange-500/15 flex items-center justify-center">
                  <item.Icon weight="duotone" className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                </div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
