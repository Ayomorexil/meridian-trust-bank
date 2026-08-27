export default function Logo({ size = 40, showWordmark = false, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" className="flex-shrink-0">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#002B72" />
            <stop offset="100%" stopColor="#0062CC" />
          </linearGradient>
        </defs>
        <path d="M32 3 L58 13 V29 C58 45 47 56 32 61 C17 56 6 45 6 29 V13 Z" fill="url(#logoGradient)" />
        <path
          d="M32 8 L53 16.5 V29 C53 42.5 44 51.8 32 56 C20 51.8 11 42.5 11 29 V16.5 Z"
          fill="none"
          stroke="#FF6A2B"
          strokeWidth="1.5"
          opacity="0.55"
        />
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fontFamily="'DM Sans', system-ui, sans-serif"
          fontWeight="800"
          fontSize="22"
          fill="#FFFFFF"
        >
          MT
        </text>
      </svg>
      {showWordmark && (
        <div className={`font-extrabold leading-none tracking-wide ${light ? 'text-white' : 'text-navy'}`}>
          MERIDIAN <span className="text-brand-mid">TRUST</span>
        </div>
      )}
    </div>
  );
}
