import { DayType, type TimetableSlot } from '../types';

/**
 * Returns the DayType for a given date in Tehran's timezone (Asia/Tehran).
 * Saturday to Wednesday -> DayType.NORMAL (1)
 * Thursday -> DayType.HALF_HOLIDAY (2)
 * Friday -> DayType.HOLIDAY (3)
 */
export function getTehranDayType(date: Date = new Date()): DayType {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      weekday: 'short',
    }).format(date);
    if (weekday === 'Thu') return DayType.HALF_HOLIDAY;
    if (weekday === 'Fri') return DayType.HOLIDAY;
    return DayType.NORMAL;
  } catch {
    const day = date.getDay(); // 0 = Sun, 4 = Thu, 5 = Fri, 6 = Sat
    if (day === 4) return DayType.HALF_HOLIDAY;
    if (day === 5) return DayType.HOLIDAY;
    return DayType.NORMAL;
  }
}

/**
 * Resolves effective DayType: uses server's CurrentDayType if valid (1, 2, or 3),
 * otherwise falls back to Tehran's current local day of week.
 */
export function resolveCurrentDayType(
  serverDayType?: number | null,
  date: Date = new Date()
): DayType {
  if (
    typeof serverDayType === 'number' &&
    serverDayType >= DayType.NORMAL &&
    serverDayType <= DayType.HOLIDAY
  ) {
    return serverDayType as DayType;
  }
  return getTehranDayType(date);
}

/**
 * Returns the current time in minutes from midnight (0..1439) in Asia/Tehran timezone.
 */
export function getTehranMinutes(date: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return (h % 24) * 60 + m;
  } catch {
    return (date.getHours() % 24) * 60 + date.getMinutes();
  }
}

/**
 * Finds index of the next slot at or after currentMinutes in the given slots array.
 * Returns -1 if no upcoming slots remain.
 */
export function findNextSlotIndex(
  slots: TimetableSlot[],
  currentMinutes: number
): number {
  for (let i = 0; i < slots.length; i++) {
    const parts = slots[i].StaticTime.split(':');
    if (parts.length >= 2) {
      const slotMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      if (slotMins >= currentMinutes) {
        return i;
      }
    }
  }
  return -1;
}
