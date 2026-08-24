// macOS'ta Electron binary'si imzasiz oldugu icin Gatekeeper tarafindan
// "kotu amacli yazilim" diye Carp'a tasinir ve calistirilamaz.
// Bu script karantina attributunu kaldirir ve ad-hoc codesign uygular.
// Sadece darwin (macOS) uzerinde etkilidir; diger platformlarda no-op.
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

if (process.platform !== "darwin") {
  process.exit(0);
}

const electronApp = path.join(
  __dirname,
  "..",
  "node_modules",
  "electron",
  "dist",
  "Electron.app"
);

if (!fs.existsSync(electronApp)) {
  console.log("[fix-electron] Electron.app bulunamadi, atlaniyor.");
  process.exit(0);
}

try {
  execSync(`xattr -dr com.apple.quarantine "${electronApp}"`, {
    stdio: "inherit",
  });
  console.log("[fix-electron] karantina kaldirildi.");
} catch {
  /* yoksay */
}

try {
  execSync(`codesign --force --deep --sign - "${electronApp}"`, {
    stdio: "inherit",
  });
  console.log("[fix-electron] ad-hoc codesign uygulandi.");
} catch (e) {
  console.warn(
    "[fix-electron] codesign basarisiz (manuel deneyin):",
    e.message
  );
}
