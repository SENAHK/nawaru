// Grade scales offered when logging a climb. Climbing exercises in the library
// are boulders, so the athlete's boulder system is used.

export type BoulderGradeSystem = 'font' | 'v_scale';

const font = [
  '3', '4', '4+', '5', '5+',
  '6A', '6A+', '6B', '6B+', '6C', '6C+',
  '7A', '7A+', '7B', '7B+', '7C', '7C+',
  '8A', '8A+', '8B', '8B+', '8C', '8C+', '9A',
];

const vScale = ['VB', ...Array.from({ length: 18 }, (_, grade) => `V${grade}`)];

export function boulderGrades(system: BoulderGradeSystem): string[] {
  return system === 'font' ? font : vScale;
}
