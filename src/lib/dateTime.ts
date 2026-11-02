const lagosDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const getLagosDateString = (date = new Date()) =>
  lagosDateFormatter.format(date);

export const addCalendarDays = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
};

export const isDepartureUpcoming = (
  travelDate: string,
  departureTime: string,
  now = Date.now(),
) => {
  const date = travelDate.slice(0, 10);
  const time = departureTime.trim();
  const twelveHourTime = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const twentyFourHourTime = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  let hours: number;
  let minutes: number;
  let seconds: number;

  if (twelveHourTime) {
    hours = Number(twelveHourTime[1]);
    minutes = Number(twelveHourTime[2]);
    seconds = Number(twelveHourTime[3] ?? 0);

    if (hours < 1 || hours > 12) return false;
    hours = (hours % 12) + (/PM/i.test(twelveHourTime[4]) ? 12 : 0);
  } else if (twentyFourHourTime) {
    hours = Number(twentyFourHourTime[1]);
    minutes = Number(twentyFourHourTime[2]);
    seconds = Number(twentyFourHourTime[3] ?? 0);

    if (hours > 23) return false;
  } else {
    return false;
  }

  if (minutes > 59 || seconds > 59) return false;

  const normalizedTime = [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  const departureTimestamp = Date.parse(`${date}T${normalizedTime}+01:00`);
  return Number.isFinite(departureTimestamp) && departureTimestamp > now;
};
