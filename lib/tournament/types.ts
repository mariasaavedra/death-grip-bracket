import type { Database } from 'brackets-model';

export type DivisionId = 'femmes' | 'mascs';
export type DivisionStatus = 'registration' | 'active' | 'completed';
export type CompetitorStatus = 'active' | 'alternate';
export type DisplayMode = 'matchup' | 'bracket' | 'champion';

export interface Competitor {
  id: string;
  name: string;
  status: CompetitorStatus;
}

export interface DivisionState {
  stageId: number | null;
  status: DivisionStatus;
  competitors: Competitor[];
}

export interface DisplayState {
  division: DivisionId;
  mode: DisplayMode;
  matchId: number | null;
}

export interface AppState {
  divisions: Record<DivisionId, DivisionState>;
  display: DisplayState;
}

/** Native brackets-model dataset: participant, stage, group, round, match, match_game. */
export type BracketsData = Database;

export interface TournamentSnapshot {
  brackets: BracketsData;
  app: AppState;
}

export interface TournamentState extends TournamentSnapshot {
  version: number;
  updatedAt: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class VersionConflictError extends ApiError {
  constructor(message = 'State has changed. Reload and try again.') {
    super(409, message);
  }
}
