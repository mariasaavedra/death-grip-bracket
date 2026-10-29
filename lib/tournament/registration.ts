import { ACTIVE_LIMIT, ALTERNATE_LIMIT } from './constants.ts';
import { addCompetitor, assertDivision, mutate } from './service.ts';
import { loadState } from './storage.ts';
import { ApiError, VersionConflictError } from './types.ts';
import type { DivisionId } from './types.ts';

/**
 * Public self-registration from the QR sign-up sheet.
 *
 * The ring name joins the normal (publicly readable) roster. First name, phone and initials are
 * stored separately in `contacts-<division>` rows, which no public endpoint ever returns.
 */
export interface Contact {
  firstName: string;
  phone: string;
  initials: string;
}

export interface RegisterInput extends Contact {
  division: unknown;
  ringName: unknown;
  /** Honeypot: real people leave it empty. */
  website?: unknown;
}

export interface RegisterResult {
  /** "1".."8" for a main slot, "A".."C" for the if-someone-doesn't-show list. */
  slot: string;
  status: 'active' | 'alternate';
}

const rowId = (division: DivisionId) => `contacts-${division}`;
const MAX_ATTEMPTS = 5;

function text(value: unknown, label: string, max: number): string {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) throw new ApiError(400, `${label} is required`);
  if (v.length > max) throw new ApiError(400, `${label} is too long`);
  return v;
}

export function cleanContact(input: Partial<Record<keyof Contact, unknown>>): Contact {
  const firstName = text(input.firstName, 'First name', 40);
  const phone = text(input.phone, 'Phone', 20);
  if (!/^[0-9+().\-\s]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7) throw new ApiError(400, 'Enter a valid phone number');
  const initials = text(input.initials, 'Initials', 4).toUpperCase();
  if (!/^[A-Z.]{1,4}$/.test(initials)) throw new ApiError(400, 'Initials should be letters only');
  return { firstName, phone, initials };
}

async function ensureRow(db: D1Database, division: DivisionId) {
  await db.prepare('INSERT OR IGNORE INTO tournament_state (id, data, version) VALUES (?, ?, 0)').bind(rowId(division), '{}').run();
}

async function saveContact(db: D1Database, division: DivisionId, competitorId: string, contact: Contact) {
  await ensureRow(db, division);
  await db
    .prepare(
      `UPDATE tournament_state
         SET data = json_set(data, '$."' || ? || '"', json(?)), version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(competitorId, JSON.stringify(contact), rowId(division))
    .run();
}

export async function getContacts(db: D1Database, division: DivisionId): Promise<Record<string, Contact>> {
  await ensureRow(db, division);
  const row = await db.prepare('SELECT data FROM tournament_state WHERE id = ?').bind(rowId(division)).first<{ data: string }>();
  return JSON.parse(row!.data);
}

export async function deleteAllContacts(db: D1Database) {
  await db.prepare(`DELETE FROM tournament_state WHERE id LIKE 'contacts-%'`).run();
}

/**
 * First come, first served: the next open main slot, then A-C, then "full". The visitor has no
 * revision to send, so on a version conflict we simply reload and try again.
 */
export async function registerSelf(db: D1Database, input: RegisterInput): Promise<RegisterResult> {
  if (typeof input.website === 'string' && input.website.trim() !== '') return { slot: '—', status: 'active' }; // bot: pretend success
  const division = assertDivision(input.division);
  const contact = cleanContact(input);
  const id = crypto.randomUUID();
  let result: RegisterResult | undefined;

  for (let attempt = 1; !result; attempt++) {
    const { version } = await loadState(db);
    let claimed: RegisterResult | undefined;
    try {
      await mutate(db, version, ({ app }) => {
        const roster = app.divisions[division].competitors;
        const actives = roster.filter((c) => c.status === 'active').length;
        const alternates = roster.filter((c) => c.status === 'alternate').length;
        const status = actives < ACTIVE_LIMIT ? 'active' : alternates < ALTERNATE_LIMIT ? 'alternate' : null;
        if (!status) throw new ApiError(409, 'All slots are full');
        addCompetitor(app, division, input.ringName, status, id);
        claimed = { status, slot: status === 'active' ? String(actives + 1) : 'ABC'[alternates] };
      });
      result = claimed; // only once the write has committed
    } catch (e) {
      if (e instanceof VersionConflictError && attempt < MAX_ATTEMPTS) continue;
      throw e;
    }
  }
  await saveContact(db, division, id, contact);
  return result;
}
