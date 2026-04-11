import React, { useRef, useCallback } from 'react';

/* ============================================================
   Hard hat SVG element - reusable
   ============================================================ */
const HardHat = () => (
  <g>
    <path d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62 Z" fill="#f97316"/>
    <path d="M60,32 C80,35 88,47 90,62 L75,62 C75,50 70,40 60,36 Z" fill="#ea580c"/>
    <path d="M52,34 C49,42 46,52 45,62" stroke="#fdba74" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M57,33 C54,42 52,52 51,62" stroke="#ea580c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M22,62 C22,58 38,55 60,55 C82,55 98,58 98,62 C98,68 82,72 60,72 C38,72 22,68 22,62 Z" fill="#f97316"/>
    <path d="M26,64 C26,68 40,72 60,72 C80,72 94,68 94,64" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round"/>
    <path d="M28,61 C28,58 42,56 60,56 C78,56 92,58 92,61" fill="none" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <path d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62" fill="none" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </g>
);

/* ============================================================
   Logo Icon (square)
   ============================================================ */
const LogoIcon = ({ size = 120, dark = false, bgColor }) => {
  const fg = dark ? '#ffffff' : '#18181b';
  const bg = bgColor || (dark ? '#18181b' : '#ffffff');
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ backgroundColor: bgColor ? bgColor : undefined }}>
      {bgColor && <rect width="120" height="120" fill={bgColor} />}
      <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill={fg}/>
      <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill={bg}/>
      <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
    </svg>
  );
};

/* ============================================================
   Download helper using canvas
   ============================================================ */
const downloadSvgAs = (svgElement, filename, format, width, height) => {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

  if (format === 'svg') {
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
  };
  img.src = URL.createObjectURL(svgBlob);
};

/* ============================================================
   Export Card Component
   ============================================================ */
const ExportCard = ({ title, desc, width, height, children, bgClass = 'bg-white', id }) => {
  const svgRef = useRef(null);

  const handleDownload = useCallback((format) => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;
    const ext = format === 'jpg' ? 'jpg' : format === 'png' ? 'png' : 'svg';
    downloadSvgAs(svg, `craftbolt-${id}.${ext}`, format, width, height);
  }, [id, width, height]);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-100">
        <h3 className="font-bold text-zinc-900 text-sm">{title}</h3>
        <p className="text-zinc-400 text-xs">{desc} — {width}x{height}px</p>
      </div>
      <div className={`flex items-center justify-center p-6 ${bgClass}`} ref={svgRef}>
        {children}
      </div>
      <div className="px-4 py-2 border-t border-zinc-100 flex gap-2">
        <button onClick={() => handleDownload('svg')} className="text-xs px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-700 font-medium" data-testid={`dl-svg-${id}`}>SVG</button>
        <button onClick={() => handleDownload('png')} className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium" data-testid={`dl-png-${id}`}>PNG</button>
        <button onClick={() => handleDownload('jpg')} className="text-xs px-3 py-1.5 bg-zinc-500 text-white rounded-md hover:bg-zinc-600 font-medium" data-testid={`dl-jpg-${id}`}>JPG</button>
      </div>
    </div>
  );
};

/* ============================================================
   LOGO EXPORT PAGE
   ============================================================ */
const LogoShowcase = () => {
  return (
    <div className="min-h-screen bg-zinc-100" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
      {/* Header */}
      <div className="bg-zinc-900 text-white py-8 px-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          <span className="text-white">Craft</span>
          <span className="text-orange-500">Bolt</span>
          <span className="text-zinc-400 ml-3 text-base font-normal">— Marketingovy balicek loga</span>
        </h1>
        <p className="text-zinc-500 text-xs mt-1">Kliknete na SVG / PNG / JPG pro stazeni</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ===== SVG SOUBORY ===== */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">SVG soubory (vektorove)</h2>
          <p className="text-zinc-500 text-sm mb-4">Nekonecne skalovatene. Pro grafika, tisk, vysivky, polepy.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 mb-2 font-semibold">Ikona — svetla varianta</p>
              <a href="/logo/craftbolt-icon-light.svg" download className="text-orange-500 text-sm font-medium underline">Stahnout SVG</a>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 mb-2 font-semibold">Ikona — tmava varianta</p>
              <a href="/logo/craftbolt-icon-dark.svg" download className="text-orange-500 text-sm font-medium underline">Stahnout SVG</a>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 mb-2 font-semibold">Horizontalni — svetla</p>
              <a href="/logo/craftbolt-horizontal-light.svg" download className="text-orange-500 text-sm font-medium underline">Stahnout SVG</a>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 mb-2 font-semibold">Horizontalni — tmava</p>
              <a href="/logo/craftbolt-horizontal-dark.svg" download className="text-orange-500 text-sm font-medium underline">Stahnout SVG</a>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 mb-2 font-semibold">Vertikalni — svetla</p>
              <a href="/logo/craftbolt-vertical-light.svg" download className="text-orange-500 text-sm font-medium underline">Stahnout SVG</a>
            </div>
          </div>
        </div>

        {/* ===== SOCIALNI SITE - PROFILOVE OBRAZKY ===== */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Profilove obrazky — socialni site</h2>
          <p className="text-zinc-500 text-sm mb-4">Facebook, Instagram, TikTok, Google Maps</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Facebook profile */}
            <ExportCard title="Facebook profil" desc="Ctvercovy" width={180} height={180} id="fb-profile" bgClass="bg-white">
              <svg width={180} height={180} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="180" height="180" fill="white"/>
                <g transform="translate(15, 15) scale(1.25)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>

            {/* Instagram profile */}
            <ExportCard title="Instagram profil" desc="Ctvercovy" width={320} height={320} id="ig-profile" bgClass="bg-white">
              <svg width={160} height={160} viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="320" height="320" fill="white"/>
                <g transform="translate(27, 27) scale(2.22)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>

            {/* TikTok profile */}
            <ExportCard title="TikTok profil" desc="Ctvercovy" width={200} height={200} id="tt-profile" bgClass="bg-zinc-900">
              <svg width={160} height={160} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="#18181b"/>
                <g transform="translate(17, 17) scale(1.39)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="white"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="#18181b"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>

            {/* Google Maps */}
            <ExportCard title="Google Mapy / ikona" desc="Ctvercovy" width={250} height={250} id="maps-icon" bgClass="bg-white">
              <svg width={150} height={150} viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="250" height="250" fill="white"/>
                <g transform="translate(21, 21) scale(1.74)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>
          </div>
        </div>

        {/* ===== FACEBOOK COVER ===== */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Uvodni fotka Facebook</h2>
          <p className="text-zinc-500 text-sm mb-4">820x312px — horizontalni logo na tmavem pozadi</p>
          <ExportCard title="Facebook cover / uvodni fotka" desc="Siroka" width={820} height={312} id="fb-cover" bgClass="bg-zinc-900">
            <svg width={620} height={236} viewBox="0 0 820 312" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="820" height="312" fill="#18181b"/>
              {/* Centered horizontal logo */}
              <g transform="translate(195, 70)">
                {/* Icon */}
                <g transform="scale(1.45)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="white"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="#18181b"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
                {/* Text */}
                <text x="190" y="95" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="62" fill="white">Craft</text>
                <text x="350" y="95" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="62" fill="#f97316">Bolt</text>
              </g>
            </svg>
          </ExportCard>
        </div>

        {/* ===== VELKE ROZLISENI PRO GRAFIKA ===== */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Velke rozliseni pro grafika</h2>
          <p className="text-zinc-500 text-sm mb-4">Pro tisk, polepy aut, banery, obleceni</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* High-res icon light */}
            <ExportCard title="Ikona velka — svetla" desc="Pro tisk" width={2000} height={2000} id="hires-icon-light" bgClass="bg-white">
              <svg width={160} height={160} viewBox="0 0 2000 2000" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="2000" height="2000" fill="white"/>
                <g transform="translate(167, 167) scale(13.89)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>

            {/* High-res icon dark */}
            <ExportCard title="Ikona velka — tmava" desc="Pro tisk" width={2000} height={2000} id="hires-icon-dark" bgClass="bg-zinc-900">
              <svg width={160} height={160} viewBox="0 0 2000 2000" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="2000" height="2000" fill="#18181b"/>
                <g transform="translate(167, 167) scale(13.89)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="white"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="#18181b"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>

            {/* High-res horizontal light */}
            <ExportCard title="Horizontalni velka — svetla" desc="Polepy aut, banery" width={3000} height={1200} id="hires-horiz-light" bgClass="bg-white">
              <svg width={300} height={120} viewBox="0 0 3000 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="3000" height="3000" fill="white"/>
                <g transform="translate(250, 100) scale(8.33)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
                <text x="1250" y="740" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="300" fill="#18181b">Craft</text>
                <text x="1950" y="740" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="300" fill="#f97316">Bolt</text>
              </svg>
            </ExportCard>

            {/* High-res horizontal dark */}
            <ExportCard title="Horizontalni velka — tmava" desc="Polepy aut, banery" width={3000} height={1200} id="hires-horiz-dark" bgClass="bg-zinc-900">
              <svg width={300} height={120} viewBox="0 0 3000 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="3000" height="3000" fill="#18181b"/>
                <g transform="translate(250, 100) scale(8.33)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="white"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="#18181b"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
                <text x="1250" y="740" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="300" fill="white">Craft</text>
                <text x="1950" y="740" fontFamily="Outfit, Arial, sans-serif" fontWeight="700" fontSize="300" fill="#f97316">Bolt</text>
              </svg>
            </ExportCard>
          </div>
        </div>

        {/* ===== FAVICON ===== */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Favicon a App ikona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ExportCard title="Favicon 32x32" desc="Pro prohlizec" width={32} height={32} id="favicon-32" bgClass="bg-white">
              <svg width={64} height={64} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" fill="white"/>
                <g transform="translate(2.7, 2.7) scale(0.222)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>

            <ExportCard title="App ikona 192x192" desc="Android/PWA" width={192} height={192} id="app-icon-192" bgClass="bg-white">
              <svg width={128} height={128} viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="192" height="192" rx="24" fill="white"/>
                <g transform="translate(16, 16) scale(1.333)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>

            <ExportCard title="App ikona 512x512" desc="iOS/Store" width={512} height={512} id="app-icon-512" bgClass="bg-white">
              <svg width={128} height={128} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="512" height="512" rx="64" fill="white"/>
                <g transform="translate(43, 43) scale(3.556)">
                  <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                  <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                  <g transform="translate(12, 18) scale(0.78)"><HardHat /></g>
                </g>
              </svg>
            </ExportCard>
          </div>
        </div>

        {/* ===== JEDNOBAREVE VARIANTY ===== */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Jednobareve varianty</h2>
          <p className="text-zinc-500 text-sm mb-4">Pro razitka, razbu, jednobarevny tisk, vysivky</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Black only */}
            <ExportCard title="Cerna na bilem" desc="Razitka, tisk" width={500} height={500} id="mono-black" bgClass="bg-white">
              <svg width={140} height={140} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#18181b"/>
                <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                <g transform="translate(12, 18) scale(0.78)">
                  <path d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62 Z" fill="#18181b"/>
                  <path d="M22,62 C22,58 38,55 60,55 C82,55 98,58 98,62 C98,68 82,72 60,72 C38,72 22,68 22,62 Z" fill="#18181b"/>
                  <path d="M52,34 C49,42 46,52 45,62" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/>
                </g>
              </svg>
            </ExportCard>

            {/* White only */}
            <ExportCard title="Bila na cernem" desc="Tmave materialy" width={500} height={500} id="mono-white" bgClass="bg-zinc-900">
              <svg width={140} height={140} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="#18181b"/>
                <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="white"/>
                <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="#18181b"/>
                <g transform="translate(12, 18) scale(0.78)">
                  <path d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62 Z" fill="white"/>
                  <path d="M22,62 C22,58 38,55 60,55 C82,55 98,58 98,62 C98,68 82,72 60,72 C38,72 22,68 22,62 Z" fill="white"/>
                  <path d="M52,34 C49,42 46,52 45,62" stroke="#18181b" strokeWidth="5" fill="none" strokeLinecap="round"/>
                </g>
              </svg>
            </ExportCard>

            {/* Orange only */}
            <ExportCard title="Oranzova na bilem" desc="Obleceni, branding" width={500} height={500} id="mono-orange" bgClass="bg-white">
              <svg width={140} height={140} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" fill="#f97316"/>
                <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" fill="white"/>
                <g transform="translate(12, 18) scale(0.78)">
                  <path d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62 Z" fill="#f97316"/>
                  <path d="M22,62 C22,58 38,55 60,55 C82,55 98,58 98,62 C98,68 82,72 60,72 C38,72 22,68 22,62 Z" fill="#f97316"/>
                  <path d="M52,34 C49,42 46,52 45,62" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/>
                </g>
              </svg>
            </ExportCard>
          </div>
        </div>
      </div>

      <div className="text-center py-6 px-4 text-zinc-500 text-xs">
        Kliknete na tlacitka SVG / PNG / JPG u kazde varianty pro stazeni.
      </div>
    </div>
  );
};

export default LogoShowcase;
