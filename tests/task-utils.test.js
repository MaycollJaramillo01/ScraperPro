const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatTaskDate,
  isStaleTask,
  getStaleThresholdIso,
} = require("../lib/task-utils");

test("formatTaskDate renders dd/mm/yyyy hh:mm with es-ES locale", () => {
  const value = new Date("2024-02-03T09:05:00.000Z");
  const formatted = formatTaskDate(value, "es-ES", "UTC");
  assert.equal(formatted, "03/02/2024 09:05");
});

test("isStaleTask detects stale tasks by minutes", () => {
  const now = new Date("2024-02-03T10:00:00.000Z");
  const createdAt = "2024-02-03T09:00:00.000Z";
  assert.equal(isStaleTask(createdAt, now, 30), true);
  assert.equal(isStaleTask(createdAt, now, 90), false);
});

test("getStaleThresholdIso returns iso string by minutes", () => {
  const now = new Date("2024-02-03T10:00:00.000Z");
  const threshold = getStaleThresholdIso(now, 30);
  assert.equal(threshold, "2024-02-03T09:30:00.000Z");
});
