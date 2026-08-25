import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const PLAY_HOST = "127.0.0.1";
export const PLAY_PORT = 5180;
export const PLAY_URL = `http://${PLAY_HOST}:${PLAY_PORT}/`;

const READY_RE = /Local:\s+(https?:\/\/\S+)/i;
const START_TIMEOUT_MS = 45_000;
const INSTALL_TIMEOUT_MS = 180_000;

type PlayOk = { ok: true; url: string };
type PlayErr = { error: string };

let playChild: ChildProcess | null = null;
let playProject: string | null = null;
let playUrl: string | null = null;

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function killProcessTree(child: ChildProcess) {
  if (!child.pid) {
    child.kill("SIGTERM");
    return;
  }
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

export function stopPlay() {
  const child = playChild;
  playChild = null;
  playProject = null;
  playUrl = null;
  if (child) killProcessTree(child);
}

function sameProject(projectPath: string) {
  return playProject !== null && path.resolve(playProject) === path.resolve(projectPath);
}

function runNpm(args: string[], cwd: string, timeoutMs: number) {
  return new Promise<{ code: number; out: string }>((resolve, reject) => {
    const child = spawn(npmCommand(), args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    const onData = (chunk: Buffer) => {
      out += chunk.toString();
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    const timer = setTimeout(() => {
      killProcessTree(child);
      reject(new Error(`npm ${args.join(" ")} zaman aşımı`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
  });
}

async function ensureProject(projectPath: string): Promise<string | null> {
  const resolved = path.resolve(projectPath);
  const pkgPath = path.join(resolved, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return "Proje klasöründe package.json yok.";
  }
  let pkg: { scripts?: { dev?: string } };
  try {
    pkg = JSON.parse(await fs.promises.readFile(pkgPath, "utf-8")) as {
      scripts?: { dev?: string };
    };
  } catch {
    return "package.json okunamadı.";
  }
  if (!pkg.scripts?.dev) {
    return "package.json içinde npm run dev scripti yok.";
  }
  const modules = path.join(resolved, "node_modules");
  if (!fs.existsSync(modules)) {
    const install = await runNpm(["install"], resolved, INSTALL_TIMEOUT_MS);
    if (install.code !== 0) {
      return `npm install başarısız:\n${install.out.slice(-800)}`;
    }
  }
  return null;
}

function startVite(projectPath: string): Promise<PlayOk | PlayErr> {
  return new Promise((resolve) => {
    const child = spawn(
      npmCommand(),
      ["run", "dev", "--", "--host", PLAY_HOST, "--port", String(PLAY_PORT), "--strictPort"],
      {
        cwd: projectPath,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      }
    );
    playChild = child;
    playProject = projectPath;
    let out = "";
    let settled = false;

    const finish = (result: PlayOk | PlayErr) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if ("error" in result) {
        if (playChild === child) stopPlay();
        else killProcessTree(child);
      }
      resolve(result);
    };

    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      out += text;
      const match = out.match(READY_RE);
      if (!match) return;
      const raw = match[1].replace(/[.,)]+$/, "");
      playUrl = raw.endsWith("/") ? raw : `${raw}/`;
      finish({ ok: true, url: playUrl });
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => {
      finish({ error: `Vite başlatılamadı: ${err.message}` });
    });
    child.on("exit", (code) => {
      if (playChild === child) {
        playChild = null;
        playProject = null;
        playUrl = null;
      }
      finish({
        error: `Vite kapandı (kod ${code ?? "?"}).\n${out.slice(-800)}`,
      });
    });

    const timer = setTimeout(() => {
      finish({
        error: `Vite ${START_TIMEOUT_MS / 1000}s içinde hazır olmadı.\n${out.slice(-800)}`,
      });
    }, START_TIMEOUT_MS);
  });
}

export async function startPlay(projectPath: string): Promise<PlayOk | PlayErr> {
  if (typeof projectPath !== "string" || !projectPath.trim()) {
    return { error: "Proje yolu yok." };
  }
  const resolved = path.resolve(projectPath);
  if (playChild && sameProject(resolved) && playUrl) {
    return { ok: true, url: playUrl };
  }
  if (playChild) stopPlay();

  try {
    const problem = await ensureProject(resolved);
    if (problem) return { error: problem };
    return await startVite(resolved);
  } catch (err) {
    stopPlay();
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
