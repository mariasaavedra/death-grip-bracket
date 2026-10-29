import type { Database } from 'brackets-model';

export type DivisionId = 'femmes' | 'mascs';
export type DivisionStatus = 'registration' | 'active' | 'completed';
export type CompetitorStatus = 'active' | 'alternate';
export type DisplayMode = 'guide' | 'matchup' | 'bracket' | 'champion' | 'vote';

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
  /** Director-controlled reveal of the ring-name vote results on the public display. */
  showVotes: boolean;
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
