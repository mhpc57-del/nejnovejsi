import React from 'react';

/* ============================================================
   KONCEPT A – "Blesk v klíči"
   Moderní, minimalistický. Francouzský klíč tvoří obrys,
   blesk prochází středem. Jasná symbolika: řemeslo + energie.
   ============================================================ */
const LogoA = ({ size = 200, showText = true, dark = false }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Wrench body */}
        <rect x="54" y="30" width="12" height="60" rx="3" fill={fg} />
        {/* Wrench top jaw */}
        <path d="M46 18C46 12 52 6 60 6C68 6 74 12 74 18V30H66V20C66 16.7 63.3 14 60 14C56.7 14 54 16.7 54 20V30H46V18Z" fill={fg} />
        {/* Wrench bottom jaw */}
        <path d="M48 90H72L74 96C74 102 68 108 60 108C52 108 46 102 46 96L48 90Z" fill={fg} />
        {/* Lightning bolt - orange accent */}
        <path d="M66 34L54 58H63L52 86L72 54H62L66 34Z" fill="#f97316" />
        {/* Circular background ring */}
        <circle cx="60" cy="60" r="56" stroke={fg} strokeWidth="2.5" strokeDasharray="4 6" opacity="0.15" />
      </svg>
      {showText && (
        <div className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.22, fontFamily: 'Outfit, sans-serif' }}>
          <span style={{ color: fg }}>Craft</span>
          <span style={{ color: '#f97316' }}>Bolt</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   KONCEPT B – "Štít řemeslníka"
   Tradiční, důvěryhodný. Štítový tvar s křížem nástrojů
   (kladivo + klíč). Vhodný pro firemní identitu.
   ============================================================ */
const LogoB = ({ size = 200, showText = true, dark = false }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shield shape */}
        <path d="M60 6L16 24V56C16 82 36 104 60 114C84 104 104 82 104 56V24L60 6Z" fill={fg} />
        {/* Inner shield */}
        <path d="M60 12L22 28V56C22 78.5 39.5 98 60 108C80.5 98 98 78.5 98 56V28L60 12Z" fill={dark ? '#27272a' : '#fafafa'} />
        {/* Crossed tools - Hammer */}
        <g transform="rotate(-35 60 60)">
          <rect x="56" y="28" width="8" height="48" rx="2" fill="#f97316" />
          <rect x="48" y="24" width="24" height="14" rx="3" fill="#f97316" />
        </g>
        {/* Crossed tools - Wrench */}
        <g transform="rotate(35 60 60)">
          <rect x="57" y="30" width="6" height="44" rx="2" fill={fg} />
          <circle cx="60" cy="28" r="8" stroke={fg} strokeWidth="4" fill={dark ? '#27272a' : '#fafafa'} />
          <path d="M52 72H68L70 76C70 80 66 84 60 84C54 84 50 80 50 76L52 72Z" fill={fg} />
        </g>
        {/* Small bolt accent */}
        <path d="M62 56L56 64H61L55 74" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showText && (
        <div className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.22, fontFamily: 'Outfit, sans-serif' }}>
          <span style={{ color: fg }}>Craft</span>
          <span style={{ color: '#f97316' }}>Bolt</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   KONCEPT C – "Dům + Blesk"
   Přímá asociace: domácí služby. Obrys domu s bleskem místo
   komínu / prostupujícím skrz střechu. Čistý, rozpoznatelný.
   ============================================================ */
const LogoC = ({ size = 200, showText = true, dark = false }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* House body */}
        <rect x="28" y="56" width="64" height="50" rx="4" fill={fg} />
        {/* Roof */}
        <path d="M18 60L60 16L102 60H18Z" fill={fg} />
        {/* Inner cutout - door/window area */}
        <rect x="34" y="62" width="52" height="38" rx="2" fill={dark ? '#27272a' : '#fafafa'} />
        {/* Window left */}
        <rect x="38" y="66" width="16" height="14" rx="2" fill={fg} opacity="0.12" />
        {/* Window right */}
        <rect x="66" y="66" width="16" height="14" rx="2" fill={fg} opacity="0.12" />
        {/* Door */}
        <rect x="48" y="84" width="24" height="22" rx="3" fill={fg} opacity="0.12" />
        {/* Door handle */}
        <circle cx="66" cy="96" r="2" fill="#f97316" />
        {/* LIGHTNING BOLT - hero element cutting through roof */}
        <path d="M68 8L52 44H64L46 80L50 52H40L68 8Z" fill="#f97316" />
        {/* Bolt glow effect */}
        <path d="M68 8L52 44H64L46 80L50 52H40L68 8Z" fill="#f97316" opacity="0.3" filter="url(#glowC)" />
        <defs>
          <filter id="glowC" x="-4" y="-4" width="80" height="92" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
      </svg>
      {showText && (
        <div className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.22, fontFamily: 'Outfit, sans-serif' }}>
          <span style={{ color: fg }}>Craft</span>
          <span style={{ color: '#f97316' }}>Bolt</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   KONCEPT D – "Šestihranný šroub + Blesk"
   Dvojí význam slova Bolt: šroub i blesk. Šestihranná matice
   s bleskem uvnitř. Průmyslový, silný, moderní.
   ============================================================ */
const LogoD = ({ size = 200, showText = true, dark = false }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  // Hexagon points
  const hex = (cx, cy, r) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  };
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer hexagon (bolt head) */}
        <polygon points={hex(60, 60, 54)} fill={fg} />
        {/* Inner hexagon cutout */}
        <polygon points={hex(60, 60, 40)} fill={dark ? '#27272a' : '#fafafa'} />
        {/* Center circle (bolt shaft cross-section) */}
        <circle cx="60" cy="60" r="18" fill={fg} />
        {/* Lightning bolt in center */}
        <path d="M66 42L52 62H62L50 82L70 58H60L66 42Z" fill="#f97316" />
        {/* Thread lines decorative */}
        <line x1="60" y1="4" x2="60" y2="12" stroke={fg} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        <line x1="60" y1="108" x2="60" y2="116" stroke={fg} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        {/* Corner accents */}
        <circle cx="60" cy="6" r="2" fill="#f97316" opacity="0.5" />
        <circle cx="60" cy="114" r="2" fill="#f97316" opacity="0.5" />
      </svg>
      {showText && (
        <div className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.22, fontFamily: 'Outfit, sans-serif' }}>
          <span style={{ color: fg }}>Craft</span>
          <span style={{ color: '#f97316' }}>Bolt</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   KONCEPT E – "CB Monogram + Nástroje"
   Elegantní monogram C a B propojených s nástrojovým motivem.
   Ideální pro vizitky a malé formáty. Prémiový dojem.
   ============================================================ */
const LogoE = ({ size = 200, showText = true, dark = false }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Rounded square background */}
        <rect x="8" y="8" width="104" height="104" rx="24" fill={fg} />
        {/* Inner background */}
        <rect x="14" y="14" width="92" height="92" rx="20" fill={dark ? '#27272a' : '#fafafa'} />
        {/* Letter C */}
        <path d="M56 36C44 36 34 46 34 60C34 74 44 84 56 84" stroke="#f97316" strokeWidth="8" strokeLinecap="round" fill="none" />
        {/* Letter B */}
        <path d="M62 36H74C80 36 86 40 86 48C86 54 82 57 78 58C83 59 88 63 88 70C88 78 82 84 74 84H62V36Z" fill={fg} />
        <rect x="68" y="42" width="12" height="12" rx="4" fill={dark ? '#27272a' : '#fafafa'} />
        <rect x="68" y="62" width="14" height="16" rx="5" fill={dark ? '#27272a' : '#fafafa'} />
        {/* Lightning bolt accent between C and B */}
        <path d="M60 48L55 60H60L55 72" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Small wrench icon bottom */}
        <circle cx="30" cy="96" r="4" stroke="#f97316" strokeWidth="1.5" fill="none" opacity="0.4" />
        <line x1="33" y1="99" x2="38" y2="104" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </svg>
      {showText && (
        <div className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.22, fontFamily: 'Outfit, sans-serif' }}>
          <span style={{ color: fg }}>Craft</span>
          <span style={{ color: '#f97316' }}>Bolt</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   SHOWCASE PAGE
   ============================================================ */
const LogoShowcase = () => {
  const concepts = [
    {
      id: 'A',
      name: 'Blesk v klíči',
      desc: 'Moderní, minimalistický. Francouzský klíč s bleskem. Jasná symbolika: řemeslo + rychlost.',
      use: 'Sociální sítě, web, vizitky',
      Component: LogoA,
    },
    {
      id: 'B',
      name: 'Štít řemeslníka',
      desc: 'Tradiční, důvěryhodný. Štít s překříženými nástroji. Vzbuzuje pocit spolehlivosti a profesionality.',
      use: 'Polepy aut, oblečení, firemní identita',
      Component: LogoB,
    },
    {
      id: 'C',
      name: 'Dům + Blesk',
      desc: 'Přímá asociace s domácími službami. Dům prostoupený bleskem — rychlé řešení pro váš domov.',
      use: 'Reklama, bannery, velkoformátový tisk',
      Component: LogoC,
    },
    {
      id: 'D',
      name: 'Šestihranný šroub',
      desc: 'Hraje na dvojí význam slova Bolt (šroub i blesk). Průmyslový, silný, zapamatovatelný.',
      use: 'Favicon, app ikona, razítka, ražba',
      Component: LogoD,
    },
    {
      id: 'E',
      name: 'CB Monogram',
      desc: 'Elegantní propojení písmen C a B s nástrojovým motivem. Prémiový, čistý dojem.',
      use: 'Vizitky, oblečení, malé formáty',
      Component: LogoE,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-100" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
      {/* Header */}
      <div className="bg-zinc-900 text-white py-10 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="text-white">Craft</span>
          <span className="text-orange-500">Bolt</span>
          <span className="text-zinc-400 ml-3 text-xl font-normal">— Návrhy loga</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto mt-2">
          5 konceptů optimalizovaných pro: sociální sítě, polepy aut, tisk na oblečení, vizitky, web a mobilní aplikaci
        </p>
      </div>

      {/* Concepts */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {concepts.map(({ id, name, desc, use, Component }) => (
          <div key={id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            {/* Concept header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg">{id}</span>
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{name}</h2>
                <p className="text-zinc-500 text-sm">{desc}</p>
              </div>
            </div>

            {/* Logo previews */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Light background */}
              <div className="flex flex-col items-center justify-center p-10 bg-white">
                <p className="text-xs text-zinc-400 mb-4 uppercase tracking-wider font-semibold">Světlé pozadí</p>
                <Component size={160} dark={false} />
              </div>
              {/* Dark background */}
              <div className="flex flex-col items-center justify-center p-10 bg-zinc-900">
                <p className="text-xs text-zinc-500 mb-4 uppercase tracking-wider font-semibold">Tmavé pozadí</p>
                <Component size={160} dark={true} />
              </div>
            </div>

            {/* Size variants */}
            <div className="px-6 py-5 bg-zinc-50 border-t border-zinc-100">
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-4">Velikostní varianty (škálovatelnost)</p>
              <div className="flex items-end gap-8 flex-wrap">
                <div className="text-center">
                  <Component size={28} showText={false} dark={false} />
                  <p className="text-xs text-zinc-400 mt-1">Favicon</p>
                </div>
                <div className="text-center">
                  <Component size={48} showText={false} dark={false} />
                  <p className="text-xs text-zinc-400 mt-1">App ikona</p>
                </div>
                <div className="text-center">
                  <Component size={72} dark={false} />
                  <p className="text-xs text-zinc-400 mt-1">Vizitka</p>
                </div>
                <div className="text-center">
                  <Component size={110} dark={false} />
                  <p className="text-xs text-zinc-400 mt-1">Web</p>
                </div>
              </div>
            </div>

            {/* Use cases */}
            <div className="px-6 py-3 bg-orange-50 border-t border-orange-100">
              <p className="text-sm text-orange-700">
                <span className="font-semibold">Ideální pro:</span> {use}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="text-center py-8 px-4">
        <p className="text-zinc-500 text-sm max-w-lg mx-auto">
          Vyberte koncept, který se vám nejvíce líbí. Mohu ho dále upravit — změnit barvy, proporce, styl textu, nebo zkombinovat prvky z více návrhů.
        </p>
      </div>
    </div>
  );
};

export default LogoShowcase;
