import { defineConfig, devices } from '@playwright/test';

// A teszt-fiók adatai (E2E_EMAIL, E2E_PASSWORD) a gitből kizárt fájlban vannak; nélkülük a pedagógus tesztek kimaradnak.
try {
  process.loadEnvFile('.env.test.local');
} catch {
  // nincs teszt-fiók
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5174', locale: 'hu-HU', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true },
  projects: [
    { name: 'asztali', use: { ...devices['Desktop Chrome'] } },
    // iPad Safari motorja, érintéssel; a gyerek oldalt ezen használják.
    { name: 'ipad', use: { ...devices['iPad (gen 7)'] }, testMatch: /public/ },
  ],
});
