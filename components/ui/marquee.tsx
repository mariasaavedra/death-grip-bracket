import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Continuous horizontal scroller. The items are rendered twice and both copies slide left by
 * their own width, so the loop is seamless. Pure CSS (see `.marquee-track` in globals.css).
 */
export function Marquee({
  items,
  separator = '•',
  seconds = 40,
  className,
}: {
  items: readonly ReactNode[];
  separator?: ReactNode;
  seconds?: number;
  className?: string;
}) {
  const track = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="marquee-track m-0 flex min-w-full shrink-0 list-none items-center justify-around gap-10 p-0 pr-10"
    >
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-10">
          <span>{item}</span>
          <span aria-hidden>{separator}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn('flex overflow-hidden whitespace-nowrap', className)} style={{ ['--marquee-seconds' as string]: `${seconds}s` }}>
      {track(false)}
      {track(true)}
    </div>
  );
}
