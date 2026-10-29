'use client';

import { useEffect, useState } from 'react';
import { QrCode } from './qr-code.tsx';
import { GUIDE_SECTIONS } from '../lib/guide.ts';
import { ACTIVE_LIMIT, ALTERNATE_LIMIT, DIVISION_IDS, DIVISION_NAMES } from '../lib/tournament/constants.ts';
import type { AppState } from '../lib/tournament/types.ts';

/** Pre-event guide screen modelled on the poster: curtain-style banner, then Enter / Prizes / Rules. */
export function GuideView({ divisions }: { divisions: AppState['divisions'] }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-1 items-center">
    <div className="mx-auto grid w-full max-w-[110rem] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] min-[1900px]:grid-cols-[48rem_auto] min-[1900px]:justify-center min-[1900px]:gap-x-28">
      {/* Left: banner, then registration QR codes (sized to scan from across a room). */}
      <div className="flex flex-col gap-8 min-[1900px]:gap-12">
        <div className="mx-auto w-full max-w-md min-[1900px]:max-w-xl">
          {/* Curtain rod */}
          <div className="relative h-3">
            <div className="absolute inset-x-1 top-1/2 border-t-2 border-ink" />
            <span className="absolute left-0 top-0 size-3 rounded-full bg-ink" />
            <span className="absolute right-0 top-0 size-3 rounded-full bg-ink" />
          </div>
          <div className="mx-5 border-x border-ink px-8 pb-8 pt-6 text-center min-[1900px]:pb-12 min-[1900px]:pt-10">
            <h2 className="m-0 font-display text-6xl leading-[0.9] tracking-tighter xl:text-7xl min-[1900px]:text-8xl">
              Arm
              <br />
              Wrestling
            </h2>
          </div>
          <div className="fringe mx-5" />
        </div>

        <section className="border-t border-ink pt-6">
          <h2 className="m-0 mb-4 text-center font-display text-3xl tracking-tighter xl:text-4xl min-[1900px]:mb-6 min-[1900px]:text-5xl">Scan to register</h2>
          <div className="grid grid-cols-2 gap-6">
            {DIVISION_IDS.map((d) => {
              const roster = divisions[d].competitors;
              const actives = roster.filter((c) => c.status === 'active').length;
              const alternates = roster.filter((c) => c.status === 'alternate').length;
              const open = divisions[d].status === 'registration' && !(actives >= ACTIVE_LIMIT && alternates >= ALTERNATE_LIMIT);
              const url = `${origin}/register/${d}`;
              return (
                <div key={d} className="flex flex-col items-center gap-2 text-center">
                  <h3 className="m-0 font-display text-3xl normal-case tracking-tighter min-[1900px]:text-4xl">{DIVISION_NAMES[d].replace(' Championship', '')}</h3>
                  {open && origin ? (
                    <QrCode value={url} className="w-full max-w-[17rem] border border-ink min-[1600px]:max-w-[19rem] min-[1900px]:max-w-[23rem]" />
                  ) : (
                    <div className="label flex aspect-square w-full max-w-[17rem] items-center justify-center border border-dashed border-ink text-center text-xl min-[1600px]:max-w-[19rem] min-[1900px]:max-w-[23rem] min-[1900px]:text-2xl">
                      {origin ? 'Registration closed' : ''}
                    </div>
                  )}
                  <p className="label m-0 text-sm min-[1600px]:text-base min-[1900px]:text-lg">
                    {Math.min(actives, ACTIVE_LIMIT)} of {ACTIVE_LIMIT} slots taken
                    {actives >= ACTIVE_LIMIT && open ? ` · ${alternates} of ${ALTERNATE_LIMIT} alternates` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right: Enter / Prizes / Rules */}
      <div className="flex flex-col gap-8 min-[1900px]:gap-12">
        {GUIDE_SECTIONS.map((section) => (
          <section key={section.label} className="grid grid-cols-[7rem_1fr] gap-6 xl:grid-cols-[9rem_1fr] min-[1900px]:grid-cols-[12rem_1fr]">
            <h3 className="m-0 font-display text-3xl normal-case tracking-tighter xl:text-4xl min-[1900px]:text-5xl">{section.label}</h3>
            <div className="text-xl leading-snug xl:text-2xl min-[1900px]:text-3xl">
              {section.lines.map((line) => (
                <p
                  key={line.text}
                  className={`m-0 ${line.kind === 'heading' ? 'label' : 'font-light'} ${line.kind === 'heading' || line.kind === 'plain' ? 'uppercase' : ''}`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
    </div>
  );
}
