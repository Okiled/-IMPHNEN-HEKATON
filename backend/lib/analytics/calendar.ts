export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface CalendarFactorsInput {
  date: Date;
}

export interface CalendarFactors {
  dayOfWeek: DayOfWeek;
  isPayday: boolean;
  factors: {          // Added for detailed analytics tracking
    dayOfWeek: number;
    payday: number;
    special: number;
  };
  totalFactor: number; // The multiplier for Expected Demand
}

// Logic updated based on retail/bakery sales patterns
// Weekend (Sat-Sun) typically highest, Tuesday lowest
export function getDayOfWeekFactor(date: Date): number {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend Peak - highest traffic
  if (day === 0) return 1.11;  // Sunday (highest - family outings)
  if (day === 6) return 1.08;  // Saturday

  // Friday - pre-weekend boost
  if (day === 5) return 1.01;

  // Weekday patterns
  if (day === 1) return 0.97;  // Monday
  if (day === 2) return 0.93;  // Tuesday (lowest)
  if (day === 3) return 0.94;  // Wednesday
  if (day === 4) return 0.96;  // Thursday

  return 1.00; // fallback
}

// Logic updated based on Guide Section 11.2 (Indonesia Payday Cycle)
export function getPaydayFactor(date: Date): number {
  const dayOfMonth = date.getDate();

  // Payday Window: Tanggal 25-31 DAN 1-5 (Fresh money effect)
  if (dayOfMonth >= 25 || dayOfMonth <= 5) {
    return 1.30;
  }

  // Pre-payday / Saving mode: Tanggal 20-24
  if (dayOfMonth >= 20 && dayOfMonth <= 24) {
    return 0.90;
  }

  return 1.0;
}

// Logic updated based on Guide Section 11.3
export function getSpecialDayFactor(date: Date): number {
  // Note: For hackathon demo purposes, we default to 1.0 
  // as dynamic Ramadan/Holiday detection requires external library.
  // Can be manually injected for "Demo Scenarios".
  
  return 1.0; 
}

export function getCalendarFactors(
  input: CalendarFactorsInput,
): CalendarFactors {
  const { date } = input;

  // Security: Input validation to prevent math errors
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date input provided to Analytics Engine');
  }

  const dowFactor = getDayOfWeekFactor(date);
  const paydayFactor = getPaydayFactor(date);
  const specialFactor = getSpecialDayFactor(date);

  const jsDay = date.getDay(); // 0 = Sunday, 6 = Saturday

  const dayOfWeek: DayOfWeek =
    jsDay === 0
      ? 'sunday'
      : jsDay === 1
      ? 'monday'
      : jsDay === 2
      ? 'tuesday'
      : jsDay === 3
      ? 'wednesday'
      : jsDay === 4
      ? 'thursday'
      : jsDay === 5
      ? 'friday'
      : 'saturday';

  return {
    dayOfWeek,
    isPayday: paydayFactor > 1.0,
    factors: {
        dayOfWeek: dowFactor,
        payday: paydayFactor,
        special: specialFactor
    },
    // Formula 2: Total combined factor
    totalFactor: dowFactor * paydayFactor * specialFactor
  };
}