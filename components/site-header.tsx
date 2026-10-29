import Link from 'next/link';

/** Poster-style band: date left, ruled title frame centre, hours right. */
export function SiteHeader() {
  return (
    <header className="band px-6 py-4">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-6">
        <p className="label m-0 text-center text-sm leading-tight">
          Thursday
          <br />
          Oct 29
        </p>
        <Link href="/" className="frame px-10 py-2 text-center no-underline">
          <span className="font-display text-3xl tracking-tighter text-white md:text-4xl">Death Grip Arm Wrestling</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="label hidden gap-5 text-xs sm:flex">
            <Link href="/" className="no-underline">Bracket</Link>
            <Link href="/admin" className="no-underline">Director</Link>
          </nav>
          <p className="label m-0 text-center text-sm leading-tight">
            8PM to
            <br />
            2AM
          </p>
        </div>
      </div>
    </header>
  );
}
