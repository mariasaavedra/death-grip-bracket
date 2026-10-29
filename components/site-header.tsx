/** Thin poster-style band: date left, hours right, each on one line. */
export function SiteHeader() {
  return (
    <header className="band-dark px-6 py-1.5">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-6">
        <p className="label m-0 text-xs leading-none">Thursday Oct 29</p>
        <p className="label m-0 text-xs leading-none">8PM to 2AM</p>
      </div>
    </header>
  );
}
