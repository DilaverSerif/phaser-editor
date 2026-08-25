// macOS Gatekeeper, imzasiz / karantinali Electron.app'i "kotu amacli yazilim"
// diye Cop'e tasir. npm extract sonrasi imza bozulabildigi icin her kurulumda
// karantinayi silip ad-hoc codesign uygulariz. Diger platformlarda no-op.
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

if (process.platform !== "darwin") {
  process.exit(0);
}

const electronDir = path.join(__dirname, "..", "node_modules", "electron");
const electronApp = path.join(electronDir, "dist", "Electron.app");
const electronBin = path.join(electronApp, "Contents", "MacOS", "Electron");
const installJs = path.join(electronDir, "install.js");

function exists() {
  return fs.existsSync(electronBin);
}

if (!fs.existsSync(electronDir)) {
  console.log("[fix-electron] electron paketi yok, atlaniyor.");
  process.exit(0);
}

if (!exists()) {
  if (!fs.existsSync(installJs)) {
    console.error("[fix-electron] Electron.app yok ve install.js bulunamadi.");
    process.exit(1);
  }
  console.log("[fix-electron] Electron.app eksik (Gatekeeper copu olabilir). Yeniden indiriliyor...");
  execSync(`node "${installJs}"`, { stdio: "inherit", cwd: electronDir });
}

if (!exists()) {
  console.error("[fix-electron] Electron.app hala yok. Cop'ten geri yukleyin veya: npm i electron");
  process.exit(1);
}

try {
  execSync(`xattr -cr "${electronApp}"`, { stdio: "pipe" });
  console.log("[fix-electron] xattr temizlendi.");
} catch {
  /* bazi dosyalarda xattr basarisiz olabilir */
}

try {
  execSync(`codesign --force --deep --sign - "${electronApp}"`, { stdio: "pipe" });
  console.log("[fix-electron] ad-hoc codesign uygulandi.");
} catch (e) {
  console.warn("[fix-electron] codesign basarisiz:", e.message);
  process.exit(1);
}
