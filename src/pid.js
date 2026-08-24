import fs from 'fs';

const CONFIG_PATH = './config.json';

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

export function killOldInstance() {
  const config = readConfig();
  const oldPid = config.pid;

  if (!oldPid) return;

  try {
    process.kill(oldPid, 0); // cek apakah proses masih hidup
    process.kill(oldPid, 'SIGTERM');
    console.log(`🔪 Instance lama (PID ${oldPid}) dihentikan.`);
  } catch {
    // Proses sudah tidak ada — abaikan
  }
}

export function registerPid() {
  const config = readConfig();
  config.pid = process.pid;
  writeConfig(config);
  console.log(`📌 PID terdaftar: ${process.pid}`);
}

export function clearPid() {
  const config = readConfig();
  if (config.pid === process.pid) {
    delete config.pid;
    writeConfig(config);
  }
}
