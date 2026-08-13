export function DelDotSeal({ className = "h-12 w-12" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/deldot-logo.png?v=official"
      alt="Delaware Department of Transportation"
      className={`rounded-full bg-transparent object-contain ${className}`}
    />
  );
}
