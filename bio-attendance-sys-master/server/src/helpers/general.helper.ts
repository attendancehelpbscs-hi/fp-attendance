export const stringifyArr = (arr: unknown[]) => JSON.stringify(arr);

export const removeObjectProps = <TData extends { [k: string]: unknown }, TRes = TData>(
  obj: TData,
  props: string[] = [],
): TRes => {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key))) as TRes;
};

const DEFAULT_AM_LATE_TIME = '07:30';
const DEFAULT_PM_LATE_TIME = '12:50';
const TIME_REGEX = /^\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\s*$/i;

const parseLateTime = (input?: string | null): { hour: number; minute: number } => {
  if (!input) {
    return { hour: 7, minute: 30 };
  }
  const match = input.match(TIME_REGEX);
  if (!match) {
    return { hour: 7, minute: 30 };
  }
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) {
    hour += 12;
  }
  if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { hour: 7, minute: 30 };
  }
  return { hour, minute };
};

const buildLateThresholdDate = (reference: Date, sessionType: 'AM' | 'PM', lateTime?: string | null, graceMinutes?: number | null, pmSettings?: { enabled: boolean; time?: string | null }): Date => {
  const threshold = new Date(reference);
  let timeToUse = lateTime;
  if (sessionType === 'PM') {
    // For PM, check if PM late cutoff is enabled and use custom time, otherwise use default
    if (pmSettings?.enabled && pmSettings.time) {
      timeToUse = pmSettings.time;
    } else {
      timeToUse = DEFAULT_PM_LATE_TIME;
    }
  }
  const { hour, minute } = parseLateTime(timeToUse || DEFAULT_AM_LATE_TIME);
  threshold.setHours(hour, minute, 0, 0);
  if (typeof graceMinutes === 'number' && !Number.isNaN(graceMinutes)) {
    threshold.setMinutes(threshold.getMinutes() + graceMinutes);
  }
  return threshold;
};

export const isLateArrival = (
  checkInAt?: Date | null,
  sessionType?: 'AM' | 'PM' | null,
  timeType?: 'IN' | 'OUT' | null,
  options?: { lateTime?: string | null; gracePeriodMinutes?: number | null; pmSettings?: { enabled: boolean; time?: string | null } },
): boolean => {
  if (!checkInAt || timeType !== 'IN' || !sessionType) {
    return false;
  }
  const threshold = buildLateThresholdDate(checkInAt, sessionType, options?.lateTime, options?.gracePeriodMinutes ?? 0, options?.pmSettings);
  return checkInAt.getTime() > threshold.getTime();
};
