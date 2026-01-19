function formatTaskDate(value, locale = "es-ES", timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const datePart = date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  });
  const timePart = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${datePart} ${timePart}`;
}

function isStaleTask(createdAt, now, maxMinutes) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const maxAgeMs = maxMinutes * 60 * 1000;
  return now.getTime() - created > maxAgeMs;
}

function getStaleThresholdIso(now, maxMinutes) {
  return new Date(now.getTime() - maxMinutes * 60 * 1000).toISOString();
}

module.exports = {
  formatTaskDate,
  isStaleTask,
  getStaleThresholdIso,
};
