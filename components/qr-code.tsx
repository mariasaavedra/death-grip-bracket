import { encode } from 'uqr';

/** Inline SVG QR code (no innerHTML): one path of dark modules. */
export function QrCode({ value, className }: { value: string; className?: string }) {
  const { data, size } = encode(value, { border: 2 });
  let path = '';
  data.forEach((row, y) => row.forEach((dark, x) => dark && (path += `M${x} ${y}h1v1h-1z`)));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={`QR code for ${value}`} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#0a0a0a" />
    </svg>
  );
}
