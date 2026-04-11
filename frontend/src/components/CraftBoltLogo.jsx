const CraftBoltLogo = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 44, text: 'text-2xl' },
    lg: { icon: 64, text: 'text-4xl' },
    xl: { icon: 80, text: 'text-5xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`} data-testid="craftbolt-logo">
      {/* Craftsman icon */}
      <svg width={s.icon} height={s.icon} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Hard hat */}
        <path d="M20 24C20 17.4 25.4 12 32 12C38.6 12 44 17.4 44 24H20Z" fill="#f97316" />
        <rect x="17" y="23" width="30" height="5" rx="2.5" fill="#f97316" />
        {/* Head */}
        <circle cx="32" cy="34" r="6" fill="#18181b" />
        {/* Body */}
        <path d="M24 42C24 42 26 39 32 39C38 39 40 42 40 42V50C40 51.1 39.1 52 38 52H26C24.9 52 24 51.1 24 50V42Z" fill="#18181b" />
        {/* Wrench in right hand */}
        <rect x="41" y="38" width="4" height="16" rx="2" fill="#f97316" transform="rotate(15 43 38)" />
        <circle cx="44" cy="37" r="3" stroke="#f97316" strokeWidth="2" fill="none" />
        {/* Left arm */}
        <rect x="18" y="42" width="8" height="3.5" rx="1.75" fill="#18181b" />
        {/* Right arm */}
        <rect x="38" y="42" width="8" height="3.5" rx="1.75" fill="#18181b" />
        {/* Lightning bolt accent on chest */}
        <path d="M31 43L33 46H30L32 49" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showText && (
        <div className={`${s.text} font-bold tracking-tight leading-none`} style={{ fontFamily: 'Outfit' }}>
          <span className="text-zinc-900 dark:text-white">Craft</span>
          <span className="text-orange-500">Bolt</span>
        </div>
      )}
    </div>
  );
};

export default CraftBoltLogo;
