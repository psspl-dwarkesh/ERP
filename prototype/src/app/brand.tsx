/** Threadline mark: one thread passing through three record nodes. */
export function LogoMark({ size = 28, inverse = false }: { size?: number; inverse?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo-mark">
      <rect width="32" height="32" rx="8" fill={inverse ? "#0b7a85" : "#0c1820"} />
      <path d="M6 21 C 11 21, 11 11, 16 11 S 21 21, 26 21" fill="none" stroke={inverse ? "#e6f4f5" : "#45c4cd"} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="6.5" cy="21" r="2.6" fill="#fff" />
      <circle cx="16" cy="11" r="2.6" fill="#fff" />
      <circle cx="25.5" cy="21" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Logo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <span className={`logo ${inverse ? "logo-inverse" : ""}`}>
      <LogoMark inverse={false} />
      {!compact && (
        <span className="logo-text">
          <span className="logo-word">Threadline</span>
          <span className="logo-sub">Engineering ERP</span>
        </span>
      )}
    </span>
  );
}

export const PRODUCT = "Threadline";
export const TENANT = "ABC Limited";
