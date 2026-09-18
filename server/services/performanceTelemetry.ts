import { appendFile, mkdir, open, readdir, stat, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const directory = path.resolve(process.env.PERFORMANCE_LOG_DIR || "reports/performance");
const retentionDays = 7;
const sessionSecret = process.env.JWT_SECRET || randomBytes(32).toString("hex");
let activeRequests = 0;
let previousCpu = os.cpus().map((cpu) => cpu.times);
let previousNodeCpu = process.cpuUsage();
let previousSampleAt = process.hrtime.bigint();
let previousExternalCpu = new Map<number, number>();
let samplerStarted = false;

type ProcessUsage = { cpuPercent: number; ramMb: number; count: number };
type ResourceSnapshot = {
  timestamp: string;
  cpuPercent: number;
  usedRamMb: number;
  totalRamMb: number;
  activeRequests: number;
  processes: Record<string, ProcessUsage>;
};

let latestSnapshot: ResourceSnapshot | null = null;

function dayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function writeLine(kind: "requests" | "resources", data: object) {
  try {
    await mkdir(directory, { recursive: true });
    await appendFile(path.join(directory, `${kind}-${dayStamp()}.jsonl`), `${JSON.stringify(data)}\n`, "utf8");
  } catch (error) {
    console.error("Performance telemetry write failed:", error);
  }
}

function usageBucket() : ProcessUsage {
  return { cpuPercent: 0, ramMb: 0, count: 0 };
}

async function otherProcessUsage(elapsedMs: number): Promise<Record<string, ProcessUsage>> {
  const groups = { rasa: usageBucket(), actions: usageBucket(), postgres: usageBucket() };
  try {
    let rows: Array<{ command: string; cpu: number; ramKb: number; pid?: number; cpuSeconds?: number }> = [];
    if (process.platform === "win32") {
      const script = "$p=Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'python|postgres' }; $p | ForEach-Object { $x=Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue; if($x){ [pscustomobject]@{ pid=$_.ProcessId; command=($_.CommandLine -as [string]); name=$_.Name; ramKb=[math]::Round($x.WorkingSet64/1024); cpuSeconds=$x.CPU } } } | ConvertTo-Json -Compress";
      const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", script], { timeout: 5000, maxBuffer: 1024 * 1024 });
      const parsed = stdout.trim() ? JSON.parse(stdout) : [];
      const nextCpu = new Map<number, number>();
      rows = (Array.isArray(parsed) ? parsed : [parsed]).map((row) => {
        const pid = Number(row.pid);
        const cpuSeconds = Number(row.cpuSeconds) || 0;
        nextCpu.set(pid, cpuSeconds);
        const before = previousExternalCpu.get(pid);
        return {
          command: `${row.name} ${row.command || ""}`,
          cpu: before !== undefined && elapsedMs > 0 ? Math.max(0, Math.round((cpuSeconds - before) * 100000 / elapsedMs)) : 0,
          ramKb: Number(row.ramKb) || 0,
        };
      });
      previousExternalCpu = nextCpu;
    } else {
      const { stdout } = await execFileAsync("ps", ["-eo", "rss=,pcpu=,args="], { timeout: 3000, maxBuffer: 4 * 1024 * 1024 });
      rows = stdout.split("\n").map((line) => {
        const match = line.trim().match(/^(\d+)\s+([\d.]+)\s+(.+)$/);
        return match ? { ramKb: Number(match[1]), cpu: Number(match[2]), command: match[3] } : null;
      }).filter((row): row is { command: string; cpu: number; ramKb: number } => row !== null);
    }
    for (const row of rows) {
      const command = row.command.toLowerCase();
      const group = /rasa_sdk|rasa run actions|rasa\.sdk/.test(command)
        ? groups.actions
        : /rasa run|rasa\.core|rasa\.server/.test(command)
          ? groups.rasa
          : /postgres(?:\.exe)?(?:\s|$)/.test(command)
            ? groups.postgres
            : null;
      if (!group) continue;
      group.count++;
      group.ramMb += row.ramKb / 1024;
      group.cpuPercent += row.cpu;
    }
  } catch (error) {
    console.warn("Process metrics unavailable:", error);
  }
  return groups;
}

async function sampleResources() {
  const now = process.hrtime.bigint();
  const elapsedMs = Number(now - previousSampleAt) / 1e6;
  previousSampleAt = now;
  const nodeCpu = process.cpuUsage(previousNodeCpu);
  previousNodeCpu = process.cpuUsage();
  const cpuTimes = os.cpus().map((cpu) => cpu.times);
  let busy = 0;
  let total = 0;
  cpuTimes.forEach((times, index) => {
    const before = previousCpu[index];
    if (!before) return;
    const elapsed = Object.keys(times).reduce((sum, key) => sum + times[key as keyof typeof times] - before[key as keyof typeof before], 0);
    total += elapsed;
    busy += elapsed - (times.idle - before.idle);
  });
  previousCpu = cpuTimes;
  const others = await otherProcessUsage(elapsedMs);
  latestSnapshot = {
    timestamp: new Date().toISOString(),
    cpuPercent: total > 0 ? Math.round(100 * busy / total) : 0,
    usedRamMb: Math.round((os.totalmem() - os.freemem()) / 1048576),
    totalRamMb: Math.round(os.totalmem() / 1048576),
    activeRequests,
    processes: {
      node: { cpuPercent: elapsedMs > 0 ? Math.round((nodeCpu.user + nodeCpu.system) / (elapsedMs * 10)) : 0, ramMb: Math.round(process.memoryUsage().rss / 1048576), count: 1 },
      ...others,
    },
  };
  void writeLine("resources", latestSnapshot);
}

async function pruneOldFiles() {
  try {
    const cutoff = Date.now() - retentionDays * 86400000;
    for (const file of await readdir(directory)) {
      if (!/^(resources|requests)-\d{4}-\d{2}-\d{2}\.jsonl$/.test(file)) continue;
      const fileDate = Date.parse(file.slice(file.indexOf("-") + 1, -6));
      if (Number.isFinite(fileDate) && fileDate < cutoff) await unlink(path.join(directory, file));
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") console.warn("Performance log cleanup failed:", error);
  }
}

export function startPerformanceSampler() {
  if (samplerStarted) return;
  samplerStarted = true;
  void sampleResources();
  const timer = setInterval(() => void sampleResources(), 15000);
  timer.unref();
  void pruneOldFiles();
  const cleanup = setInterval(() => void pruneOldFiles(), 86400000);
  cleanup.unref();
}

export function beginChatTiming(sessionId: unknown) {
  activeRequests++;
  const sessionKey = typeof sessionId === "string" && sessionId.trim()
    ? createHmac("sha256", sessionSecret).update(sessionId).digest("hex").slice(0, 12)
    : null;
  return { id: randomUUID(), sessionKey, startedAt: new Date().toISOString(), started: process.hrtime.bigint() };
}

export function finishChatTiming(timing: ReturnType<typeof beginChatTiming>, status: number, rasaMs: number | null, fallback: boolean) {
  activeRequests = Math.max(0, activeRequests - 1);
  void writeLine("requests", {
    id: timing.id,
    sessionKey: timing.sessionKey,
    timestamp: timing.startedAt,
    durationMs: Math.round(Number(process.hrtime.bigint() - timing.started) / 1e6),
    rasaMs,
    status,
    fallback,
  });
}

async function recentLines(kind: "requests" | "resources", limit: number) {
  const rows: any[] = [];
  for (const day of [0, 1]) {
    const date = new Date(Date.now() - day * 86400000);
    const file = path.join(directory, `${kind}-${dayStamp(date)}.jsonl`);
    try {
      const size = (await stat(file)).size;
      const length = Math.min(size, 128 * 1024);
      const handle = await open(file, "r");
      const buffer = Buffer.alloc(length);
      try { await handle.read(buffer, 0, length, size - length); } finally { await handle.close(); }
      const lines = buffer.toString("utf8").split("\n");
      if (size > length) lines.shift();
      for (const line of lines.reverse()) {
        if (!line.trim()) continue;
        try { rows.push(JSON.parse(line)); } catch { /* ignore an incomplete write */ }
        if (rows.length >= limit) return rows;
      }
    } catch (error: any) {
      if (error?.code !== "ENOENT") console.warn("Performance log read failed:", error);
    }
  }
  return rows;
}

export async function getPerformanceReport() {
  const [requests, resources] = await Promise.all([recentLines("requests", 100), recentLines("resources", 60)]);
  return { latest: latestSnapshot, requests, resources };
}
