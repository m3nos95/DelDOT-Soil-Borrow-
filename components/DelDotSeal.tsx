export function DelDotSeal({ className = "h-12 w-12" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/deldot-logo.png"
      alt="Delaware Department of Transportation"
      className={className}
    />
  );
}
