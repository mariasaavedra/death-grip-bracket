import { Ballot } from '../../../components/ballot.tsx';
import { DIVISION_IDS } from '../../../lib/tournament/constants.ts';
import type { DivisionId } from '../../../lib/tournament/types.ts';

export const dynamic = 'force-dynamic';

export default async function VotePage({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  if (!DIVISION_IDS.includes(division as DivisionId)) return <main className="p-6">Unknown division.</main>;
  return <Ballot division={division as DivisionId} />;
}
