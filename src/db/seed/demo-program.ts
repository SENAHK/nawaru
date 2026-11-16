import type { FingerCount, GripType, LoadMode, Side } from '../enums';

export type PrescriptionSeed = {
  exercise: string; // exercise slug
  sets?: number;
  reps?: number;
  durationS?: number;
  onS?: number;
  offS?: number;
  restBetweenSetsS?: number;
  rounds?: number;
  itemsPerRound?: number;
  slotDurationS?: number;
  totalDurationS?: number;
  loadMode?: LoadMode;
  loadValue?: number;
  gripType?: GripType;
  fingerCount?: FingerCount;
  side?: Side;
  edgeMm?: number;
  targetEffort?: number;
  isTest?: boolean;
  notes?: string;
};

export type SessionSeed = {
  week: number;
  day: number; // 1 = Monday
  name: string;
  isTest?: boolean;
  prescriptions: PrescriptionSeed[];
};

export const demoCoach = { displayName: 'Coach Alex' };

const HALF_CRIMP_20 = { gripType: 'half_crimp', fingerCount: 'four', side: 'both', edgeMm: 20 } as const;

const warmUp: PrescriptionSeed = {
  exercise: 'finger-warm-up',
  sets: 5,
  durationS: 10,
  restBetweenSetsS: 60,
  ...HALF_CRIMP_20,
  notes: 'Add a little load on each hang.',
};

const maxHangs = (sets: number, percent: number): PrescriptionSeed => ({
  exercise: 'max-hang',
  sets,
  durationS: 10,
  restBetweenSetsS: 180,
  loadMode: 'percent_reference',
  loadValue: percent,
  ...HALF_CRIMP_20,
});

const pullUps: PrescriptionSeed = {
  exercise: 'weighted-pull-ups',
  sets: 4,
  reps: 5,
  restBetweenSetsS: 180,
  targetEffort: 2,
};

const repeaters: PrescriptionSeed = {
  exercise: 'repeaters',
  sets: 4,
  reps: 6,
  onS: 7,
  offS: 3,
  restBetweenSetsS: 180,
  ...HALF_CRIMP_20,
  notes: 'Bodyweight. If the last set feels easy, add 2 kg next week.',
};

const plank: PrescriptionSeed = { exercise: 'plank', sets: 3, durationS: 45, restBetweenSetsS: 60 };

const fourByFour: PrescriptionSeed = {
  exercise: 'four-by-four',
  rounds: 4,
  itemsPerRound: 4,
  restBetweenSetsS: 240,
};

const baseWeek = (week: number, percent: number): SessionSeed[] => [
  {
    week,
    day: 1,
    name: 'Finger strength',
    prescriptions: [warmUp, maxHangs(5, percent), pullUps],
  },
  { week, day: 3, name: 'Strength endurance', prescriptions: [warmUp, repeaters, plank] },
  { week, day: 6, name: 'Power endurance', prescriptions: [fourByFour] },
];

export const demoProgram = {
  name: 'Finger strength block',
  description:
    'Four weeks to build finger strength: one test week, two loading weeks based on your max hang, then a lighter week.',
  weeks: 4,
  phases: [
    { name: 'Test', startWeek: 1, endWeek: 1, isTest: true },
    { name: 'Base', startWeek: 2, endWeek: 3, isTest: false },
    { name: 'Deload', startWeek: 4, endWeek: 4, isTest: false },
  ],
  sessions: [
    {
      week: 1,
      day: 1,
      name: 'Max hang test',
      isTest: true,
      prescriptions: [
        warmUp,
        {
          exercise: 'max-hang-test',
          sets: 3,
          durationS: 10,
          restBetweenSetsS: 180,
          ...HALF_CRIMP_20,
          isTest: true,
          notes: 'Build up over three attempts. Your best successful hang becomes your reference.',
        },
      ],
    },
    {
      week: 1,
      day: 4,
      name: 'Volume',
      prescriptions: [{ exercise: 'boulder-volume', sets: 10, slotDurationS: 180 }, pullUps],
    },
    ...baseWeek(2, 85),
    ...baseWeek(3, 90),
    { week: 4, day: 1, name: 'Finger strength', prescriptions: [warmUp, maxHangs(3, 75)] },
    {
      week: 4,
      day: 4,
      name: 'Volume',
      prescriptions: [{ exercise: 'boulder-volume', sets: 8, slotDurationS: 180 }],
    },
  ] satisfies SessionSeed[],
};
