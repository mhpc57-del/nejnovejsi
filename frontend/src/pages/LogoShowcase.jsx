import React from 'react';

/* ============================================================
   Hard hat SVG - orange construction helmet
   ============================================================ */
const HardHatIcon = () => {
  return (
    <g>
      {/* Main dome */}
      <path
        d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62 Z"
        fill="#f97316"
      />
      {/* Right side shadow */}
      <path
        d="M60,32 C80,35 88,47 90,62 L75,62 C75,50 70,40 60,36 Z"
        fill="#ea580c"
      />
      {/* Ridge highlight */}
      <path
        d="M52,34 C49,42 46,52 45,62"
        stroke="#fdba74"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Ridge edge */}
      <path
        d="M57,33 C54,42 52,52 51,62"
        stroke="#ea580c"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Brim */}
      <path
        d="M22,62 C22,58 38,55 60,55 C82,55 98,58 98,62 C98,68 82,72 60,72 C38,72 22,68 22,62 Z"
        fill="#f97316"
      />
      {/* Brim bottom edge */}
      <path
        d="M26,64 C26,68 40,72 60,72 C80,72 94,68 94,64"
        fill="none"
        stroke="#c2410c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Brim highlight */}
      <path
        d="M28,61 C28,58 42,56 60,56 C78,56 92,58 92,61"
        fill="none"
        stroke="#fdba74"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Dome outline */}
      <path
        d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62"
        fill="none"
        stroke="#9a3412"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

/* ============================================================
   VARIANTA 1: Vertikalni (ikona nahore, text dole)
   ============================================================ */
const LogoVertical = ({ size = 200, showText = true, dark = false }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  const bg = dark ? '#18181b' : '#ffffff';
  return (
    <div className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer hexagon only */}
        <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill={fg} />
        {/* Inner hexagon - background color to create border effect */}
        <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill={bg} />
        {/* Hard hat centered in white hex space */}
        <g transform="translate(12, 18) scale(0.78)">
          <HardHatIcon />
        </g>
      </svg>
      {showText && (
        <div className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.2, fontFamily: 'Outfit, sans-serif' }}>
          <span style={{ color: fg }}>Craft</span>
          <span style={{ color: '#f97316' }}>Bolt</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   VARIANTA 2: Horizontalni (ikona vlevo, text vpravo)
   ============================================================ */
const LogoHorizontal = ({ size = 80, dark = false }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  const bg = dark ? '#18181b' : '#ffffff';
  return (
    <div className="inline-flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer hexagon */}
        <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill={fg} />
        {/* Inner hexagon */}
        <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill={bg} />
        {/* Hard hat */}
        <g transform="translate(12, 18) scale(0.78)">
          <HardHatIcon />
        </g>
      </svg>
      <div className="font-bold tracking-tight leading-none" style={{ fontSize: size * 0.55, fontFamily: 'Outfit, sans-serif' }}>
        <span style={{ color: fg }}>Craft</span>
        <span style={{ color: '#f97316' }}>Bolt</span>
      </div>
    </div>
  );
};

/* ============================================================
   SHOWCASE PAGE
   ============================================================ */
const LogoShowcase = () => {
  return (
    <div className="min-h-screen bg-zinc-100" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
      {/* Header */}
      <div className="bg-zinc-900 text-white py-8 px-6 text-center">
        <h1 className="text-3xl font-bold mb-1">
          <span className="text-white">Craft</span>
          <span className="text-orange-500">Bolt</span>
          <span className="text-zinc-400 ml-3 text-lg font-normal">— Navrh loga</span>
        </h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

        {/* ===== VARIANTA 1: VERTIKALNI ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg">1</span>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Varianta 1 — Vertikalni</h2>
              <p className="text-zinc-500 text-sm">Logo nahore, text dole</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center p-14 bg-white">
              <LogoVertical size={220} dark={false} />
            </div>
            <div className="flex flex-col items-center justify-center p-14 bg-zinc-900">
              <LogoVertical size={220} dark={true} />
            </div>
          </div>
        </div>

        {/* ===== VARIANTA 2: HORIZONTALNI ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg">2</span>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Varianta 2 — Horizontalni</h2>
              <p className="text-zinc-500 text-sm">Logo vlevo, text CraftBolt vpravo</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center p-14 bg-white">
              <LogoHorizontal size={100} dark={false} />
            </div>
            <div className="flex flex-col items-center justify-center p-14 bg-zinc-900">
              <LogoHorizontal size={100} dark={true} />
            </div>
          </div>
        </div>

        {/* ===== VELIKOSTNI VARIANTY ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="text-xl font-bold text-zinc-900">Velikostni varianty</h2>
          </div>
          <div className="p-8">
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-6">Vertikalni</p>
            <div className="flex items-end gap-10 flex-wrap mb-10">
              <div className="text-center"><LogoVertical size={40} showText={false} /><p className="text-[10px] text-zinc-400 mt-2">Favicon</p></div>
              <div className="text-center"><LogoVertical size={60} showText={false} /><p className="text-[10px] text-zinc-400 mt-2">App ikona</p></div>
              <div className="text-center"><LogoVertical size={100} /><p className="text-[10px] text-zinc-400 mt-2">Stredni</p></div>
              <div className="text-center"><LogoVertical size={160} /><p className="text-[10px] text-zinc-400 mt-2">Velke</p></div>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-6">Horizontalni</p>
            <div className="flex flex-col gap-6">
              <div><LogoHorizontal size={36} /><p className="text-[10px] text-zinc-400 mt-1">Male (header webu)</p></div>
              <div><LogoHorizontal size={56} /><p className="text-[10px] text-zinc-400 mt-1">Stredni (vizitka)</p></div>
              <div><LogoHorizontal size={80} /><p className="text-[10px] text-zinc-400 mt-1">Velke (polep auta)</p></div>
            </div>
          </div>
        </div>

      </div>

      <div className="text-center py-6 px-4">
        <p className="text-zinc-500 text-sm">Vyberte variantu. Muzu dale upravit proporce, barvy nebo font.</p>
      </div>
    </div>
  );
};

export default LogoShowcase;
