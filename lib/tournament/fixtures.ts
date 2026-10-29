import { faker } from '@faker-js/faker';
import type { DivisionId } from './types.ts';

export const FIXTURE_SEED = 2026;

const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Realistic ring names for development. Deterministic: the faker seed is reset on every call,
 * so the same entrants (and bracket seeding order) come back each time.
 */
export function realisticEntrants(count = 8, seed = FIXTURE_SEED): Record<DivisionId, string[]> {
  faker.seed(seed);
  const make = (sex: 'female' | 'male') => {
    const names = new Set<string>();
    while (names.size < count) {
      const adjective = title(faker.word.adjective({ length: { min: 4, max: 8 } }));
      const name =
        faker.number.int({ min: 0, max: 1 }) === 0
          ? `${faker.person.firstName(sex)} the ${adjective}`
          : `${adjective} ${title(faker.animal.type())}`;
      names.add(name); // Set keeps them unique within the division
    }
    return [...names];
  };
  return { femmes: make('female'), mascs: make('male') };
}
