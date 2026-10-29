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
    <div className="flex flex-col gap-10">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="mx-auto w-full max-w-md">
          {/* Curtain rod */}
          <div className="relative h-3">
            <div className="absolute inset-x-1 top-1/2 border-t-2 border-ink" />
            <span className="absolute left-0 top-0 size-3 rounded-full bg-ink" />
            <span className="absolute right-0 top-0 size-3 rounded-full bg-ink" />
          </div>
          <div className="mx-5 border-x border-ink px-8 pb-12 pt-10 text-center">
            <h2 className="m-0 font-display text-7xl leading-[0.9] tracking-tighter xl:text-8xl">
              Arm
              <br />
              Wrestling
            </h2>
          </div>
          <div className="fringe mx-5" />
        </div>

        <div className="flex flex-col gap-8">
          {GUIDE_SECTIONS.map((section) => (
            <section key={section.label} className="grid grid-cols-[7rem_1fr] gap-6 xl:grid-cols-[9rem_1fr]">
              <h3 className="m-0 font-display text-3xl normal-case tracking-tighter xl:text-4xl">{section.label}</h3>
              <div className="text-xl leading-snug xl:text-2xl">
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

      <section className="border-t border-ink pt-8">
        <h2 className="m-0 mb-6 text-center font-display text-4xl tracking-tighter xl:text-5xl">Scan to register</h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {DIVISION_IDS.map((d) => {
            const roster = divisions[d].competitors;
            const actives = roster.filter((c) => c.status === 'active').length;
            const alternates = roster.filter((c) => c.status === 'alternate').length;
            const open = divisions[d].status === 'registration' && !(actives >= ACTIVE_LIMIT && alternates >= ALTERNATE_LIMIT);
            const url = `${origin}/register/${d}`;
            return (
              <div key={d} className="flex flex-col items-center gap-3 text-center">
                <h3 className="m-0 font-display text-3xl normal-case tracking-tighter">{DIVISION_NAMES[d].replace(' Championship', '')}</h3>
                {open && origin ? <QrCode value={url} className="w-48 border border-ink xl:w-60" /> : <p className="label m-0 py-16 text-xl">{origin ? 'Registration closed' : ''}</p>}
                <p className="label m-0 text-sm">
                  {Math.min(actives, ACTIVE_LIMIT)} of {ACTIVE_LIMIT} slots taken
                  {actives >= ACTIVE_LIMIT && open ? ` · ${alternates} of ${ALTERNATE_LIMIT} alternates` : ''}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
