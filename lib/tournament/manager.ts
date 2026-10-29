import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import type { BracketsData } from './types.ts';

/** Fresh, isolated manager hydrated from native records. Nothing is shared between calls. */
export function openManager(brackets: BracketsData) {
  const storage = new InMemoryDatabase();
  storage.setData(JSON.parse(JSON.stringify(brackets)));
  const manager = new BracketsManager(storage);
  return {
    manager,
    exportData: async (): Promise<BracketsData> => JSON.parse(JSON.stringify(await manager.export())),
  };
}
