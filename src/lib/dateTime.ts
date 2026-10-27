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
  const time = departureTime.slice(0, 8);
  const departureTimestamp = Date.parse(`${date}T${time}+01:00`);
  return Number.isFinite(departureTimestamp) && departureTimestamp > now;
};
