/**
 * Small, UTC-based date helpers. Working in UTC avoids off-by-one-day drift
 * from local timezones. All engine date inputs are treated as calendar dates.
 */

export function getYear(d: Date): number {
  return d.getUTCFullYear();
}

/** December 31 (end of day, UTC) of the given year. */
export function december31(year: number): Date {
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
}

/** April 1 (start of day, UTC) of the given year. */
export function april1(year: number): Date {
  return new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0));
}

/**
 * Whole years elapsed from `from` to `to` (i.e. age on a given date), using
 * month/day to decide whether the birthday has occurred yet.
 */
export function ageOn(birthDate: Date, on: Date): number {
  let age = on.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < birthDate.getUTCMonth() ||
    (on.getUTCMonth() === birthDate.getUTCMonth() &&
      on.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** The calendar year in which `birthDate` reaches the given age. */
export function yearReachingAge(birthDate: Date, age: number): number {
  return birthDate.getUTCFullYear() + age;
}

/**
 * How many whole years younger `subjectBirth` is than `referenceBirth`.
 * Positive => subject is younger. Example: subject born 1970, reference born
 * 1955 => 15. Implemented as "the reference person's age on the subject's
 * birth date".
 */
export function yearsYoungerThan(subjectBirth: Date, referenceBirth: Date): number {
  return ageOn(referenceBirth, subjectBirth);
}
