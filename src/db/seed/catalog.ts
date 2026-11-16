import type { BodyRegion, Category, DosageScheme, EffortScale, Measure } from '../enums';

export type MuscleSeed = { slug: string; name: string; bodyRegion: BodyRegion };
export type EquipmentSeed = { slug: string; name: string };
export type ExerciseSeed = {
  slug: string;
  name: string;
  category: Category;
  scheme: DosageScheme;
  effort: EffortScale;
  unilateral?: boolean;
  testable?: boolean;
  measures: Measure[];
  equipment: string[];
  primary: string[];
  secondary?: string[];
  description: string;
  instructions: string;
};

export const muscles: MuscleSeed[] = [
  { slug: 'forearm-flexors', name: 'Forearm flexors', bodyRegion: 'arms' },
  { slug: 'forearm-extensors', name: 'Forearm extensors', bodyRegion: 'arms' },
  { slug: 'biceps', name: 'Biceps', bodyRegion: 'arms' },
  { slug: 'triceps', name: 'Triceps', bodyRegion: 'arms' },
  { slug: 'deltoids', name: 'Deltoids', bodyRegion: 'shoulders' },
  { slug: 'rotator-cuff', name: 'Rotator cuff', bodyRegion: 'shoulders' },
  { slug: 'lats', name: 'Lats', bodyRegion: 'back' },
  { slug: 'rhomboids', name: 'Rhomboids', bodyRegion: 'back' },
  { slug: 'trapezius', name: 'Trapezius', bodyRegion: 'back' },
  { slug: 'lower-back', name: 'Lower back', bodyRegion: 'back' },
  { slug: 'pectorals', name: 'Pectorals', bodyRegion: 'chest' },
  { slug: 'abs', name: 'Abs', bodyRegion: 'core' },
  { slug: 'obliques', name: 'Obliques', bodyRegion: 'core' },
  { slug: 'glutes', name: 'Glutes', bodyRegion: 'legs' },
  { slug: 'quadriceps', name: 'Quadriceps', bodyRegion: 'legs' },
  { slug: 'hamstrings', name: 'Hamstrings', bodyRegion: 'legs' },
  { slug: 'hip-flexors', name: 'Hip flexors', bodyRegion: 'legs' },
  { slug: 'adductors', name: 'Adductors', bodyRegion: 'legs' },
  { slug: 'calves', name: 'Calves', bodyRegion: 'legs' },
];

export const equipment: EquipmentSeed[] = [
  { slug: 'hangboard', name: 'Hangboard' },
  { slug: 'lifting-edge', name: 'Lifting edge' },
  { slug: 'pulley', name: 'Pulley' },
  { slug: 'weight-belt', name: 'Weight belt' },
  { slug: 'weight-plates', name: 'Weight plates' },
  { slug: 'pull-up-bar', name: 'Pull-up bar' },
  { slug: 'bouldering-wall', name: 'Bouldering wall' },
  { slug: 'rings', name: 'Rings' },
  { slug: 'dip-bars', name: 'Dip bars' },
  { slug: 'dumbbells', name: 'Dumbbells' },
  { slug: 'kettlebell', name: 'Kettlebell' },
  { slug: 'barbell', name: 'Barbell' },
  { slug: 'resistance-band', name: 'Resistance band' },
];

const FINGER_MEASURES: Measure[] = ['load', 'grip', 'edge', 'effort', 'result'];
const STRENGTH_MEASURES: Measure[] = ['load', 'tempo', 'effort', 'result'];
const CLIMBING_MEASURES: Measure[] = ['grade', 'effort', 'result'];

export const exercises: ExerciseSeed[] = [
  // --- Climbing exercises covering every dosage scheme (docs/specs.md §3) ---
  {
    slug: 'max-hang',
    name: 'Max hangs',
    category: 'fingers',
    scheme: 'isometric',
    effort: 'rpe',
    measures: FINGER_MEASURES,
    equipment: ['hangboard', 'weight-belt'],
    primary: ['forearm-flexors'],
    secondary: ['lats', 'deltoids'],
    description: 'Short, near-maximal hangs on a small edge to build finger strength.',
    instructions:
      'Hang with shoulders engaged and elbows slightly bent. Hold the grip position without letting it open. Stop the set if your form breaks. Rest fully between hangs.',
  },
  {
    slug: 'repeaters',
    name: 'Repeaters',
    category: 'fingers',
    scheme: 'intervals',
    effort: 'rpe',
    measures: FINGER_MEASURES,
    equipment: ['hangboard'],
    primary: ['forearm-flexors'],
    secondary: ['lats', 'deltoids'],
    description: 'Repeated short hangs with brief rests to build finger strength endurance.',
    instructions:
      'Hang for the work time, let go for the off time, and repeat for every rep of the set. Keep the same grip throughout. The last reps should be hard but controlled.',
  },
  {
    slug: 'one-arm-hang',
    name: 'One-arm hang',
    category: 'fingers',
    scheme: 'isometric',
    effort: 'rpe',
    unilateral: true,
    measures: FINGER_MEASURES,
    equipment: ['hangboard', 'pulley'],
    primary: ['forearm-flexors'],
    secondary: ['lats', 'rotator-cuff', 'obliques'],
    description: 'Single-arm hang, usually assisted with a pulley, for maximal finger strength.',
    instructions:
      'Hang from one arm with the shoulder pulled down and stable. Use a pulley to remove weight until you can hold the full duration. Alternate sides each set.',
  },
  {
    slug: 'finger-lifts',
    name: 'Finger lifts',
    category: 'fingers',
    scheme: 'reps',
    effort: 'rpe',
    unilateral: true,
    measures: FINGER_MEASURES,
    equipment: ['lifting-edge', 'weight-plates'],
    primary: ['forearm-flexors'],
    secondary: ['trapezius', 'lower-back'],
    description: 'Lifting a loaded edge off the floor (pick-ups) to load the fingers without hanging.',
    instructions:
      'Grip the edge, set your fingers, then stand up to lift the weight a few centimetres. Hold briefly and lower under control. Keep your back flat.',
  },
  {
    slug: 'max-hang-test',
    name: 'Max hang test (10s)',
    category: 'fingers',
    scheme: 'isometric',
    effort: 'rpe',
    testable: true,
    measures: FINGER_MEASURES,
    equipment: ['hangboard', 'weight-belt'],
    primary: ['forearm-flexors'],
    secondary: ['lats', 'deltoids'],
    description: 'Finds the heaviest load you can hang for 10 seconds. Sets your reference.',
    instructions:
      'Warm up thoroughly. Add weight over a few attempts until a 10-second hang is just possible with good form. Rest at least 3 minutes between attempts. Log your best successful hang.',
  },
  {
    slug: 'four-by-four',
    name: '4x4',
    category: 'climbing',
    scheme: 'circuit',
    effort: 'feel',
    measures: CLIMBING_MEASURES,
    equipment: ['bouldering-wall'],
    primary: ['forearm-flexors', 'lats'],
    secondary: ['biceps', 'abs'],
    description: 'Four boulders climbed back to back, four rounds, for power endurance.',
    instructions:
      'Pick four boulders a few grades below your limit. Climb them one after another without resting, then rest for the full break. Repeat for every round.',
  },
  {
    slug: 'boulder-volume',
    name: 'Boulder volume',
    category: 'climbing',
    scheme: 'slots',
    effort: 'feel',
    measures: CLIMBING_MEASURES,
    equipment: ['bouldering-wall'],
    primary: ['forearm-flexors', 'lats'],
    secondary: ['biceps', 'abs'],
    description: 'One boulder per time slot, for a high volume of quality climbing.',
    instructions:
      'Climb one boulder at the start of each slot and rest for what is left of it. Choose problems you can send in one or two tries.',
  },
  {
    slug: 'max-effort-bouldering',
    name: 'Max effort bouldering',
    category: 'climbing',
    scheme: 'free_duration',
    effort: 'feel',
    measures: ['grade', 'effort'],
    equipment: ['bouldering-wall'],
    primary: ['forearm-flexors', 'lats'],
    secondary: ['biceps', 'abs', 'deltoids'],
    description: 'A limit bouldering session: few attempts, full rest, hardest moves.',
    instructions:
      'Work problems at or near your limit. Rest 3 to 5 minutes between serious attempts. End the session when your power drops.',
  },
  {
    slug: 'weighted-pull-ups',
    name: 'Weighted pull-ups',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: STRENGTH_MEASURES,
    equipment: ['pull-up-bar', 'weight-belt'],
    primary: ['lats', 'biceps'],
    secondary: ['rhomboids', 'forearm-flexors', 'abs'],
    description: 'Pull-ups with added load to build maximal pulling strength.',
    instructions:
      'Start from a dead hang with shoulders engaged. Pull until your chin clears the bar, then lower under control to full extension.',
  },
  {
    slug: 'finger-warm-up',
    name: 'Progressive finger warm-up',
    category: 'warmup',
    scheme: 'isometric',
    effort: 'feel',
    measures: ['load', 'grip', 'edge'],
    equipment: ['hangboard'],
    primary: ['forearm-flexors'],
    description: 'Easy hangs of increasing intensity to prepare the fingers.',
    instructions:
      'Start with your feet on the floor or a chair to take weight off. Add load a little on each hang. Nothing here should feel hard.',
  },

  // --- Strength ---
  {
    slug: 'pull-ups',
    name: 'Pull-ups',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: ['tempo', 'effort', 'result'],
    equipment: ['pull-up-bar'],
    primary: ['lats', 'biceps'],
    secondary: ['rhomboids', 'forearm-flexors'],
    description: 'Bodyweight pull-ups for pulling strength and volume.',
    instructions:
      'Start from a dead hang with shoulders engaged. Pull until your chin clears the bar, then lower under control.',
  },
  {
    slug: 'lock-offs',
    name: 'Lock-offs',
    category: 'strength',
    scheme: 'isometric',
    effort: 'rpe',
    unilateral: true,
    measures: ['load', 'effort', 'result'],
    equipment: ['pull-up-bar'],
    primary: ['biceps', 'lats'],
    secondary: ['deltoids', 'abs'],
    description: 'Static holds at a bent-arm position to build lock-off strength.',
    instructions:
      'Pull up and hold with your elbow at the target angle. Keep the shoulder down and the body still for the full duration.',
  },
  {
    slug: 'push-ups',
    name: 'Push-ups',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: ['tempo', 'effort', 'result'],
    equipment: [],
    primary: ['pectorals', 'triceps'],
    secondary: ['deltoids', 'abs'],
    description: 'Antagonist pushing work to balance climbing volume.',
    instructions:
      'Keep a straight line from head to heels. Lower your chest to the floor and push back up without letting your hips sag.',
  },
  {
    slug: 'dips',
    name: 'Dips',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: STRENGTH_MEASURES,
    equipment: ['dip-bars'],
    primary: ['triceps', 'pectorals'],
    secondary: ['deltoids'],
    description: 'Vertical pushing strength, useful for mantles and shoulder balance.',
    instructions:
      'Lower until your shoulders are just below your elbows, then press back to straight arms. Keep your shoulders away from your ears.',
  },
  {
    slug: 'ring-rows',
    name: 'Ring rows',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: ['tempo', 'effort', 'result'],
    equipment: ['rings'],
    primary: ['rhomboids', 'lats'],
    secondary: ['biceps', 'trapezius'],
    description: 'Horizontal pulling for scapular control and upper back strength.',
    instructions:
      'Hang under the rings with a straight body. Pull your chest to the rings by squeezing your shoulder blades together, then lower slowly.',
  },
  {
    slug: 'overhead-press',
    name: 'Dumbbell overhead press',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    unilateral: true,
    measures: STRENGTH_MEASURES,
    equipment: ['dumbbells'],
    primary: ['deltoids', 'triceps'],
    secondary: ['trapezius', 'abs'],
    description: 'Overhead pushing for shoulder strength and stability.',
    instructions:
      'Press the dumbbells from shoulder height to straight arms overhead. Keep your ribs down and avoid arching your lower back.',
  },
  {
    slug: 'deadlift',
    name: 'Deadlift',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: STRENGTH_MEASURES,
    equipment: ['barbell', 'weight-plates'],
    primary: ['hamstrings', 'glutes', 'lower-back'],
    secondary: ['trapezius', 'forearm-flexors', 'quadriceps'],
    description: 'Posterior chain strength that carries over to steep climbing.',
    instructions:
      'Set your back flat and the bar over mid-foot. Push the floor away and stand up tall, keeping the bar close. Lower it under control.',
  },
  {
    slug: 'goblet-squat',
    name: 'Goblet squat',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: STRENGTH_MEASURES,
    equipment: ['kettlebell'],
    primary: ['quadriceps', 'glutes'],
    secondary: ['abs', 'adductors'],
    description: 'Leg strength and hip mobility for high steps and rock-overs.',
    instructions:
      'Hold the weight against your chest. Sit down between your heels with an upright torso, then drive back up through your whole foot.',
  },
  {
    slug: 'hanging-leg-raises',
    name: 'Hanging leg raises',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: ['tempo', 'effort', 'result'],
    equipment: ['pull-up-bar'],
    primary: ['abs', 'hip-flexors'],
    secondary: ['obliques', 'forearm-flexors'],
    description: 'Core strength in a hanging position, close to steep climbing.',
    instructions:
      'Hang with shoulders engaged. Raise straight legs to the bar without swinging, then lower them slowly.',
  },
  {
    slug: 'plank',
    name: 'Plank',
    category: 'strength',
    scheme: 'isometric',
    effort: 'feel',
    measures: ['load', 'effort', 'result'],
    equipment: [],
    primary: ['abs'],
    secondary: ['obliques', 'glutes', 'deltoids'],
    description: 'Basic core tension hold.',
    instructions:
      'Rest on your forearms and toes with a straight body. Squeeze your glutes and keep your hips level for the full duration.',
  },
  {
    slug: 'wrist-extensions',
    name: 'Wrist extensions',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    unilateral: true,
    measures: STRENGTH_MEASURES,
    equipment: ['dumbbells'],
    primary: ['forearm-extensors'],
    description: 'Antagonist forearm work to keep elbows and wrists healthy.',
    instructions:
      'Rest your forearm on your thigh, palm down. Lift the back of your hand towards you, pause, and lower slowly.',
  },
  {
    slug: 'face-pulls',
    name: 'Band face pulls',
    category: 'strength',
    scheme: 'reps',
    effort: 'rir',
    measures: ['tempo', 'effort', 'result'],
    equipment: ['resistance-band'],
    primary: ['rotator-cuff', 'rhomboids'],
    secondary: ['deltoids', 'trapezius'],
    description: 'Shoulder health work for the rotator cuff and upper back.',
    instructions:
      'Pull the band towards your face with elbows high, finishing with your hands beside your ears. Return slowly.',
  },

  // --- Mobility and conditioning ---
  {
    slug: 'frog-stretch',
    name: 'Frog stretch',
    category: 'mobility',
    scheme: 'isometric',
    effort: 'feel',
    measures: ['effort'],
    equipment: [],
    primary: ['adductors'],
    secondary: ['hip-flexors'],
    description: 'Hip opening stretch for a closer position to the wall.',
    instructions:
      'On all fours, spread your knees wide with feet turned out. Sink your hips back until you feel a strong but comfortable stretch.',
  },
  {
    slug: 'shoulder-dislocates',
    name: 'Band shoulder dislocates',
    category: 'mobility',
    scheme: 'reps',
    effort: 'feel',
    measures: ['effort'],
    equipment: ['resistance-band'],
    primary: ['deltoids', 'rotator-cuff'],
    secondary: ['pectorals'],
    description: 'Shoulder mobility through a full overhead range.',
    instructions:
      'Hold the band wide with straight arms. Bring it over your head and behind your back, then return. Widen your grip if it pinches.',
  },
  {
    slug: 'arc-climbing',
    name: 'ARC climbing',
    category: 'conditioning',
    scheme: 'free_duration',
    effort: 'feel',
    measures: ['grade', 'effort'],
    equipment: ['bouldering-wall'],
    primary: ['forearm-flexors'],
    secondary: ['lats', 'calves'],
    description: 'Continuous easy climbing to build aerobic capacity in the forearms.',
    instructions:
      'Climb without stopping on easy terrain. Stay at a light pump you could hold all session. Step down a grade if the pump builds.',
  },
];
