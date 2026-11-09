/** Convert a Nigeria-local departure date and time into a UTC timestamp. */
export function parseNigeriaDepartureTimestamp(
  travelDate: string,
  departureTime: string
): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(travelDate);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(
    departureTime.trim()
  );

  if (!dateMatch || !timeMatch) return null;

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText, secondText = "0", meridiem] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  let hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  const dateCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    dateCheck.getUTCFullYear() !== year ||
    dateCheck.getUTCMonth() !== month - 1 ||
    dateCheck.getUTCDate() !== day ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (/PM/i.test(meridiem) ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }

  const localWallClockAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );
  const zoneName = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Lagos",
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(localWallClockAsUtc))
    .find((part) => part.type === "timeZoneName")?.value;
  const offsetMatch = /^GMT([+-])(\d{2}):(\d{2})$/.exec(zoneName ?? "");

  if (!offsetMatch) return null;

  const [, sign, hoursText, minutesText] = offsetMatch;
  const offsetMinutes =
    (Number(hoursText) * 60 + Number(minutesText)) *
    (sign === "+" ? 1 : -1);

  return localWallClockAsUtc - offsetMinutes * 60_000;
}

/** Invalid schedule data fails closed and cannot be booked. */
export function isNigeriaDepartureInPast(
  travelDate: string,
  departureTime: string,
  now = Date.now()
): boolean {
  const departureTimestamp = parseNigeriaDepartureTimestamp(
    travelDate,
    departureTime
  );

  return departureTimestamp === null || departureTimestamp <= now;
}
