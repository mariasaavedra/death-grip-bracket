import { headers } from 'next/headers';
import { DirectorConsole } from '../../components/director-console.tsx';
import { isAdmin } from '../../lib/api.ts';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authed = await isAdmin((await headers()).get('cookie'));
  return <DirectorConsole authed={authed} />;
}
