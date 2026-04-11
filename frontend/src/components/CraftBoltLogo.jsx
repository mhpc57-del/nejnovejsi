const CraftBoltLogo = ({ size = 'md', showText = true, className = '', layout = 'horizontal' }) => {
  const sizes = {
    xs: { icon: 24, text: 'text-sm', gap: 'gap-1' },
    sm: { icon: 32, text: 'text-lg', gap: 'gap-1.5' },
    md: { icon: 40, text: 'text-xl', gap: 'gap-2' },
    lg: { icon: 56, text: 'text-3xl', gap: 'gap-2.5' },
    xl: { icon: 72, text: 'text-4xl', gap: 'gap-3' },
  };

  const s = sizes[size] || sizes.md;
  const isHorizontal = layout === 'horizontal';

  return (
    <div
      className={`inline-flex ${isHorizontal ? 'flex-row items-center' : 'flex-col items-center'} ${s.gap} ${className}`}
      data-testid="craftbolt-logo"
    >
      <svg width={s.icon} height={s.icon} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer hexagon */}
        <polygon points="60,6 107.3,33 107.3,87 60,114 12.7,87 12.7,33" className="fill-zinc-900 dark:fill-white" />
        {/* Inner hexagon */}
        <polygon points="60,18 98,40 98,80 60,102 22,80 22,40" className="fill-white dark:fill-zinc-800" />
        {/* Hard hat */}
        <g transform="translate(12, 18) scale(0.78)">
          <path d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62 Z" fill="#f97316"/>
          <path d="M60,32 C80,35 88,47 90,62 L75,62 C75,50 70,40 60,36 Z" fill="#ea580c"/>
          <path d="M52,34 C49,42 46,52 45,62" stroke="#fdba74" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <path d="M57,33 C54,42 52,52 51,62" stroke="#ea580c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M22,62 C22,58 38,55 60,55 C82,55 98,58 98,62 C98,68 82,72 60,72 C38,72 22,68 22,62 Z" fill="#f97316"/>
          <path d="M26,64 C26,68 40,72 60,72 C80,72 94,68 94,64" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round"/>
          <path d="M28,61 C28,58 42,56 60,56 C78,56 92,58 92,61" fill="none" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          <path d="M30,62 C28,50 35,36 60,32 C85,36 92,50 90,62" fill="none" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
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
