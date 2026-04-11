const CraftBoltLogo = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    xs: { icon: 24, text: 'text-sm', gap: 'gap-1' },
    sm: { icon: 32, text: 'text-lg', gap: 'gap-1' },
    md: { icon: 44, text: 'text-2xl', gap: 'gap-2' },
    lg: { icon: 64, text: 'text-4xl', gap: 'gap-2' },
    xl: { icon: 80, text: 'text-5xl', gap: 'gap-3' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex flex-col items-center ${s.gap} ${className}`} data-testid="craftbolt-logo">
      <svg width={s.icon} height={s.icon} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer hexagon (bolt head) */}
        <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" className="fill-zinc-900 dark:fill-white" />
        {/* Inner hexagon cutout */}
        <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" className="fill-white dark:fill-zinc-800" />
        {/* Center dark circle */}
        <circle cx="60" cy="60" r="22" className="fill-zinc-900 dark:fill-white" />
        {/* Orange wrench - compact, fits within circle */}
        <g transform="rotate(-45 60 60)">
          {/* Wrench shaft */}
          <rect x="57.5" y="47" width="5" height="26" rx="2.5" fill="#f97316" />
          {/* Open jaw (top) */}
          <path d="M54 49C54 44.5 56.7 41 60 41C63.3 41 66 44.5 66 49L63 49C63 46 61.7 43.5 60 43.5C58.3 43.5 57 46 57 49L54 49Z" fill="#f97316" />
          {/* Ring end (bottom) */}
          <circle cx="60" cy="75" r="6.5" fill="#f97316" />
          <circle cx="60" cy="75" r="3" className="fill-zinc-900 dark:fill-white" />
        </g>
        {/* Top/bottom bolt accent dots */}
        <circle cx="60" cy="3" r="2.5" fill="#f97316" />
        <circle cx="60" cy="117" r="2.5" fill="#f97316" />
      </svg>
      {showText && (
        <div className={`${s.text} font-bold tracking-tight leading-none`} style={{ fontFamily: 'Outfit, sans-serif' }}>
          <span className="text-zinc-900 dark:text-white">Craft</span>
          <span className="text-orange-500">Bolt</span>
        </div>
      )}
    </div>
  );
};

export default CraftBoltLogo;
