import fs from "node:fs";
import path from "node:path";

let cachedUserAgents: string[] | null = null;
const acceptLanguagePool = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.8",
  "es-ES,es;q=0.9,en;q=0.6",
  "es-MX,es;q=0.9,en;q=0.6",
];

function loadUserAgents(): string[] {
  if (cachedUserAgents) {
    return cachedUserAgents;
  }

  const filePath = path.join(process.cwd(), "user_agents.txt");

  try {
    const content = fs.readFileSync(filePath, "utf8");
    cachedUserAgents = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to read user_agents.txt", error);
    cachedUserAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    ];
  }

  return cachedUserAgents;
}

export function getRandomUserAgent(): string {
  const pool = loadUserAgents();
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? pool[0];
}

export function getRandomChromeUserAgent(): string {
  const pool = loadUserAgents().filter(
    (ua) =>
      ua.toLowerCase().includes("chrome") &&
      !ua.toLowerCase().includes("edg") &&
      !ua.toLowerCase().includes("firefox"),
  );

  if (pool.length === 0) {
    return getRandomUserAgent();
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

export function getRandomAcceptLanguage(): string {
  const index = Math.floor(Math.random() * acceptLanguagePool.length);
  return acceptLanguagePool[index] ?? acceptLanguagePool[0];
}
