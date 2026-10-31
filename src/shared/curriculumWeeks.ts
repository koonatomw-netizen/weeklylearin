import type { WeekSpec } from "./curriculum";
import { WEEKS_A } from "./weeksA";
import { WEEKS_B } from "./weeksB";

/** Weeks 3 to 12 of the 12-week course, in order. Weeks 1 and 2 are the original starters. */
export const CURRICULUM: WeekSpec[] = [...WEEKS_A, ...WEEKS_B];
