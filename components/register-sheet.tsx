'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DIVISION_SCHEDULE } from '../lib/guide.ts';
import { ACTIVE_LIMIT, ALTERNATE_LIMIT } from '../lib/tournament/constants.ts';
import type { DivisionId } from '../lib/tournament/types.ts';
import { useTournamentState } from '../lib/use-tournament-state.ts';

const LETTERS = ['A', 'B', 'C'];

/** Ornamental header approximating the printed sheet: ruled frame, flourish panels, division name. */
function SheetHeader({ title }: { title: string }) {
  return (
    <div className="border-2 border-ink p-1">
      <div className="grid grid-cols-[1fr_2.2fr_1fr] gap-1 border border-ink">
        <div className="flex items-center justify-center border-r border-ink py-3 text-3xl leading-none sm:text-5xl" aria-hidden>
          ❦
        </div>
        <div className="m-1 border border-ink p-1">
          <div className="border border-ink px-2 py-1 text-center">
            <h1 className="m-0 font-display text-4xl uppercase tracking-tighter sm:text-6xl">{title}</h1>
          </div>
        </div>
        <div className="flex items-center justify-center border-l border-ink py-3 text-3xl leading-none sm:text-5xl" aria-hidden>
          ❦
        </div>
      </div>
    </div>
  );
}

function SlotTable({ heading, labels, names, nextIndex }: { heading: string; labels: string[]; names: (string | undefined)[]; nextIndex: number }) {
  return (
    <section className="mt-6">
      <h2 className="m-0 mb-2 font-display text-2xl uppercase tracking-tighter sm:text-3xl">{heading}</h2>
      <table className="w-full table-fixed border-collapse border border-ink bg-white/60 text-left">
        <thead>
          <tr className="[&>th]:border [&>th]:border-ink [&>th]:px-2 [&>th]:py-2 [&>th]:text-xs [&>th]:font-normal [&>th]:uppercase sm:[&>th]:text-base">
            <th className="w-10 sm:w-16 font-bold!">#</th>
            <th className="w-[34%]">Ring name</th>
            <th>First name</th>
            <th>Phone</th>
            <th className="w-14 sm:w-24">Initial</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={label} className={`h-12 sm:h-16 [&>td]:border [&>td]:border-ink [&>td]:px-2 ${i === nextIndex ? 'bg-mist/70' : ''}`}>
              <td className="label text-lg">{label}</td>
              <td className="truncate text-sm sm:text-xl">{names[i] ?? (i === nextIndex ? <span className="text-muted-foreground">← you</span> : '')}</td>
              <td className="text-center text-muted-foreground">{names[i] ? '·' : ''}</td>
              <td className="text-center text-muted-foreground">{names[i] ? '·' : ''}</td>
              <td className="text-center text-muted-foreground">{names[i] ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Public sign-up sheet. Other people's contact details are never shown, only ring names. */
export function RegisterSheet({ division }: { division: DivisionId }) {
  const { state, refresh } = useTournamentState();
  const [form, setForm] = useState({ ringName: '', firstName: '', phone: '', initials: '', website: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ slot: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const title = division === 'femmes' ? 'Femmes' : 'Mascs';

  const div = state?.app.divisions[division];
  const roster = div?.competitors ?? [];
  const actives = roster.filter((c) => c.status === 'active');
  const alternates = roster.filter((c) => c.status === 'alternate');
  const open = div?.status === 'registration';
  const full = actives.length >= ACTIVE_LIMIT && alternates.length >= ALTERNATE_LIMIT;
  const joiningAlternate = actives.length >= ACTIVE_LIMIT;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/register', { method: 'POST', body: JSON.stringify({ division, ...form }) });
      const json = (await res.json()) as { slot?: string; error?: { message?: string } };
      if (res.ok) {
        setDone({ slot: json.slot ?? '' });
        setForm({ ringName: '', firstName: '', phone: '', initials: '', website: '' });
        await refresh();
      } else setError(json.error?.message ?? 'Could not sign you up');
    } catch {
      setError('Connection problem. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <SheetHeader title={title} />

      <SlotTable
        heading="Competitors"
        labels={Array.from({ length: ACTIVE_LIMIT }, (_, i) => String(i + 1))}
        names={Array.from({ length: ACTIVE_LIMIT }, (_, i) => actives[i]?.name)}
        nextIndex={actives.length < ACTIVE_LIMIT ? actives.length : -1}
      />
      <SlotTable
        heading="If someone doesn't show"
        labels={LETTERS}
        names={LETTERS.map((_, i) => alternates[i]?.name)}
        nextIndex={joiningAlternate && alternates.length < ALTERNATE_LIMIT ? alternates.length : -1}
      />

      <section className="mt-6 border border-ink bg-white/60 p-4">
        {done ? (
          <p className="m-0 text-lg">
            <strong>You&apos;re in!</strong> {/^\d$/.test(done.slot) ? `Slot #${done.slot}.` : `You're on the if-someone-doesn't-show list (${done.slot}).`} See you at the Coal Bin Club.
          </p>
        ) : !state ? (
          <p className="m-0">Loading…</p>
        ) : !open ? (
          <p className="m-0 text-lg">Registration is closed for {title}.</p>
        ) : full ? (
          <p className="m-0 text-lg">All {title} slots are full.</p>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <h2 className="m-0 font-display text-2xl uppercase tracking-tighter">
              {joiningAlternate ? `Join the list (${LETTERS[alternates.length]})` : `Claim slot #${actives.length + 1}`}
            </h2>
            <Input required maxLength={60} placeholder="Ring name" value={form.ringName} onChange={set('ringName')} className="h-12 text-base" />
            <Input required maxLength={40} placeholder="First name" value={form.firstName} onChange={set('firstName')} className="h-12 text-base" autoComplete="given-name" />
            <Input required type="tel" inputMode="tel" maxLength={20} placeholder="Phone" value={form.phone} onChange={set('phone')} className="h-12 text-base" autoComplete="tel" />
            <Input required maxLength={4} placeholder="Initial (you enter at your own risk)" value={form.initials} onChange={set('initials')} className="h-12 text-base uppercase" />
            {/* Honeypot: hidden from people, tempting to bots. */}
            <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.website} onChange={set('website')} />
            {error && <p role="alert" className="alert m-0">{error}</p>}
            <Button type="submit" disabled={busy} className="h-12 text-base">{busy ? 'Signing up…' : 'Sign up'}</Button>
          </form>
        )}
      </section>

      <p className="mx-auto mt-6 max-w-2xl text-center font-mono text-sm leading-relaxed">
        Eight slots, first come first served. Registration closes at 9:45. Matches start at 10 in the Coal Bin Club. By initialing you&apos;re
        entering at your own risk. {DIVISION_SCHEDULE[division]} Double elimination, two losses and you&apos;re out.
      </p>
    </main>
  );
}
