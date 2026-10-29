export const TOURNAMENT_ID = 'death-grip-2026';
export const TOURNAMENT_NAME = 'Death Grip Arm Wrestling Championship';
export const BRACKET_TOURNAMENT_ID = 0;
export const D1_DATABASE_ID = 'e5e9a5e2-46c6-4d7e-be0b-a273bd4a7345';

export const DIVISION_IDS = ['femmes', 'mascs'] as const;
export const DIVISION_NAMES = {
  femmes: 'Femmes Championship',
  mascs: 'Mascs Championship',
} as const;

export const ACTIVE_LIMIT = 8;
export const ALTERNATE_LIMIT = 3;

export const STAGE_SETTINGS = {
  type: 'double_elimination',
  grandFinal: 'double',
} as const;

export const POLL_INTERVAL_MS = 2000;
