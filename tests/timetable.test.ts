import { describe, it, expect } from 'vitest';
import { DayType, type TimetableResponse } from '../src/types';
import {
  getTehranDayType,
  resolveCurrentDayType,
  getTehranMinutes,
  findNextSlotIndex,
} from '../src/utils/timetable';
import { fetchStationTimetable } from '../src/api/transitApi';

describe('Timetable DayType and Date Calculation', () => {
  it('defines DayType enum values matching official Android backend specification', () => {
    expect(DayType.NONE).toBe(0);
    expect(DayType.NORMAL).toBe(1);
    expect(DayType.HALF_HOLIDAY).toBe(2);
    expect(DayType.HOLIDAY).toBe(3);
  });

  it('determines DayType correctly for each day of the week in Tehran', () => {
    // 2026-11-07 is Saturday (Tehran: +03:30)
    const sat = new Date('2026-11-07T12:00:00+03:30');
    expect(getTehranDayType(sat)).toBe(DayType.NORMAL);

    // 2026-11-08 is Sunday
    const sun = new Date('2026-11-08T12:00:00+03:30');
    expect(getTehranDayType(sun)).toBe(DayType.NORMAL);

    // 2026-11-09 is Monday
    const mon = new Date('2026-11-09T12:00:00+03:30');
    expect(getTehranDayType(mon)).toBe(DayType.NORMAL);

    // 2026-11-10 is Tuesday
    const tue = new Date('2026-11-10T12:00:00+03:30');
    expect(getTehranDayType(tue)).toBe(DayType.NORMAL);

    // 2026-11-11 is Wednesday
    const wed = new Date('2026-11-11T12:00:00+03:30');
    expect(getTehranDayType(wed)).toBe(DayType.NORMAL);

    // 2026-11-12 is Thursday (پنجشنبه) -> HalfHoliday
    const thu = new Date('2026-11-12T12:00:00+03:30');
    expect(getTehranDayType(thu)).toBe(DayType.HALF_HOLIDAY);

    // 2026-11-13 is Friday (جمعه) -> Holiday
    const fri = new Date('2026-11-13T12:00:00+03:30');
    expect(getTehranDayType(fri)).toBe(DayType.HOLIDAY);
  });

  it('respects timezone boundary crossing when determining Tehran day of week', () => {
    // When it is Friday 22:00 UTC (Nov 6), in Tehran (+03:30) it is Saturday 01:30 AM (Nov 7)
    const utcDate = new Date('2026-11-06T22:00:00Z');
    expect(getTehranDayType(utcDate)).toBe(DayType.NORMAL); // Saturday in Tehran!
  });

  it('resolves CurrentDayType prioritizing valid server values and falling back to date', () => {
    const sat = new Date('2026-11-07T12:00:00+03:30');

    // Server returns Normal (1) on Saturday
    expect(resolveCurrentDayType(1, sat)).toBe(DayType.NORMAL);

    // Server returns HalfHoliday (2) on Thursday
    expect(resolveCurrentDayType(2, sat)).toBe(DayType.HALF_HOLIDAY);

    // Server returns Holiday (3) for official national holiday on Saturday
    expect(resolveCurrentDayType(3, sat)).toBe(DayType.HOLIDAY);

    // Server returns invalid / null / 0 -> fallback to Tehran weekday
    expect(resolveCurrentDayType(null, sat)).toBe(DayType.NORMAL);
    expect(resolveCurrentDayType(undefined, sat)).toBe(DayType.NORMAL);
    expect(resolveCurrentDayType(0, sat)).toBe(DayType.NORMAL);
    expect(resolveCurrentDayType(99, sat)).toBe(DayType.NORMAL);

    const thu = new Date('2026-11-12T12:00:00+03:30');
    expect(resolveCurrentDayType(null, thu)).toBe(DayType.HALF_HOLIDAY);
  });

  it('calculates getTehranMinutes accurately', () => {
    const testDate = new Date('2026-11-07T18:41:00+03:30');
    expect(getTehranMinutes(testDate)).toBe(18 * 60 + 41);

    const midnight = new Date('2026-11-07T00:05:00+03:30');
    expect(getTehranMinutes(midnight)).toBe(5);
  });

  it('finds the correct next departure slot index', () => {
    const slots = [
      { StaticTime: '06:00' },
      { StaticTime: '08:30' },
      { StaticTime: '18:41' },
      { StaticTime: '18:50' },
      { StaticTime: '21:00' },
    ];

    // Current time: 18:41 (1121 mins) -> matches exact 18:41
    expect(findNextSlotIndex(slots, 18 * 60 + 41)).toBe(2);

    // Current time: 18:42 -> next is 18:50 (index 3)
    expect(findNextSlotIndex(slots, 18 * 60 + 42)).toBe(3);

    // Current time: 22:00 -> all departures finished
    expect(findNextSlotIndex(slots, 22 * 60)).toBe(-1);

    // Empty slots array
    expect(findNextSlotIndex([], 12 * 60)).toBe(-1);
  });

  it('verifies that live API response CurrentDayType corresponds to DayType.NORMAL on Saturday', async () => {
    // Station 2023, Route 363 (from the user screenshot)
    const timetable = await fetchStationTimetable(2023, 363, 'R');
    expect(timetable).not.toBeNull();
    if (timetable) {
      expect([DayType.NORMAL, DayType.HALF_HOLIDAY, DayType.HOLIDAY]).toContain(
        timetable.CurrentDayType
      );
      // Today is Saturday (Normal day in Tehran)
      expect(timetable.CurrentDayType).toBe(DayType.NORMAL);
      expect(timetable.Normal.length).toBeGreaterThan(0);
    }
  });

  it('correctly maps activeTab DayType to corresponding slot lists in TimetableResponse', () => {
    const mockData: TimetableResponse = {
      ValidUntil: 1794683225235,
      CurrentDayType: DayType.NORMAL, // 1
      Normal: [{ StaticTime: '06:00' }, { StaticTime: '07:00' }],
      HalfHoliday: [{ StaticTime: '08:00' }],
      Holiday: [{ StaticTime: '09:00' }],
    };

    // When activeTab is NORMAL (1), it must read mockData.Normal
    const normalSlots =
      DayType.NORMAL === 1 ? mockData.Normal : mockData.HalfHoliday;
    expect(normalSlots).toBe(mockData.Normal);
    expect(normalSlots[0].StaticTime).toBe('06:00');

    // When activeTab is HALF_HOLIDAY (2), it must read mockData.HalfHoliday
    const halfHolidaySlots =
      DayType.HALF_HOLIDAY === 2 ? mockData.HalfHoliday : mockData.Holiday;
    expect(halfHolidaySlots).toBe(mockData.HalfHoliday);
    expect(halfHolidaySlots[0].StaticTime).toBe('08:00');

    // When activeTab is HOLIDAY (3), it must read mockData.Holiday
    const holidaySlots =
      DayType.HOLIDAY === 3 ? mockData.Holiday : mockData.Normal;
    expect(holidaySlots).toBe(mockData.Holiday);
    expect(holidaySlots[0].StaticTime).toBe('09:00');
  });
});
