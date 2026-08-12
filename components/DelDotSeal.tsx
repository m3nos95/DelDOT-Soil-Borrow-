export function DelDotSeal({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="Delaware Department of Transportation">
      <circle cx="32" cy="32" r="31" fill="#0b2545" stroke="#c9a227" strokeWidth="2" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="#c9a227" strokeWidth="1.2" />
      <path d="M10 36c8-2 14 4 22 4s14-6 22-4" fill="none" stroke="#7fb3e8" strokeWidth="3" />
      <path d="M12 40c7 1 13-3 20-3s13 4 20 3" fill="none" stroke="#c9a227" strokeWidth="2" />
      <text x="32" y="24" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="Public Sans, sans-serif">
        DelDOT
      </text>
      <text x="32" y="52" textAnchor="middle" fill="#c9a227" fontSize="5.2" fontWeight="600" fontFamily="Public Sans, sans-serif">
        DELAWARE
      </text>
    </svg>
  );
}
