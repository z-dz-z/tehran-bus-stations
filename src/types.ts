export interface RouteData {
  id: number;
  code: number;
  dir: string;
  orig: string;
  dest: string;
  path: [number, number][];
}

export interface TransitData {
  stations: Record<string, [string, number, number, string]>;
  routes: Record<string, RouteData>;
  stationRoutes: Record<string, number[]>;
  routeStations: Record<string, number[]>;
}

export interface BusStopETADetail {
  ETA: string;
  ETAValue: number | null;
  ETAValueText: string;
  NickName: string;
}

export interface BusStopETARoute {
  BusStopCode: string;
  RouteCode: string;
  RouteType: number;
  OriginationName: string;
  DestinationName: string;
  Order: string;
  Details: BusStopETADetail[];
}

export enum DayType {
  NONE = 0,
  NORMAL = 1,        // شنبه تا چهارشنبه (Saturday to Wednesday)
  HALF_HOLIDAY = 2,  // پنجشنبه‌ها (Thursdays)
  HOLIDAY = 3,       // جمعه و تعطیلات (Fridays & Public Holidays)
}

export interface TimetableSlot {
  StaticTime: string;
}

export interface TimetableResponse {
  ValidUntil: number;
  CurrentDayType: DayType | number; // 1 = Normal, 2 = HalfHoliday, 3 = Holiday
  Normal: TimetableSlot[];
  HalfHoliday: TimetableSlot[];
  Holiday: TimetableSlot[];
}

export interface FavoriteItem {
  stationCode: number;
  routeCode: number;
  stationName: string;
  destName: string;
}

export interface StationInfo {
  code: number;
  name: string;
  lon: number;
  lat: number;
  address: string;
}

