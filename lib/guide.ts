/** Copy for the audience "guide" view, taken from the event poster. */
export const GUIDE_TITLE = 'Guide to Death Grip';

export interface GuideSection {
  label: string;
  /** `heading` renders as heavy caps, `body` as light text, `plain` as light caps (rules). */
  lines: { kind: 'heading' | 'body' | 'plain'; text: string }[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    label: 'Enter',
    lines: [
      { kind: 'heading', text: 'Sign Up' },
      { kind: 'body', text: 'Doors at 8. Registration closes at 9:45' },
      { kind: 'heading', text: 'Pick a ring name' },
      { kind: 'body', text: 'Best ring name wins a drink ticket' },
      { kind: 'heading', text: 'Pick a division. Eight per side' },
      { kind: 'body', text: 'Femmes 10PM – 11PM' },
      { kind: 'body', text: 'Mascs 11PM – 12AM' },
    ],
  },
  {
    label: 'Prizes',
    lines: [
      { kind: 'heading', text: '1st place' },
      { kind: 'body', text: 'Trophy & Bottle of Bubbles' },
      { kind: 'heading', text: '2nd place' },
      { kind: 'body', text: 'Trophy & Le Lounge Hat' },
      { kind: 'heading', text: '3rd place' },
      { kind: 'body', text: 'Trophy & Keychain' },
    ],
  },
  {
    label: 'Rules',
    lines: [
      { kind: 'plain', text: 'One pin wins' },
      { kind: 'plain', text: 'Elbow stays on the table' },
      { kind: 'plain', text: 'Moving before go is a foul' },
      { kind: 'plain', text: 'Hands slip = reset' },
      { kind: 'plain', text: "Two losses & you're out" },
    ],
  },
];

/** Per-division copy for the sign-up sheet. */
export const DIVISION_SCHEDULE: Record<'femmes' | 'mascs', string> = {
  femmes: 'Femmes run 10 to 11.',
  mascs: 'Mascs run 11 to 12.',
};
