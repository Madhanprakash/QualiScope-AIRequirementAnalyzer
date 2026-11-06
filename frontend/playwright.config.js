import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:5173", acceptDownloads: true },
  webServer: [
    { command: process.platform === "win32" ? ".venv\\Scripts\\python.exe tests\\e2e_server.py" : ".venv/bin/python tests/e2e_server.py", cwd: "../backend", url: "http://127.0.0.1:8000/api/health", reuseExistingServer: true, timeout: 60000 },
    { command: "npm run dev -- --host 127.0.0.1", url: "http://127.0.0.1:5173", reuseExistingServer: true, timeout: 60000 }
  ]
});
