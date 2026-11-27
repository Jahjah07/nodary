import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4174";

export default defineConfig({
  testDir: "./prototypes/tests",
  forbidOnly: true,
  workers: 1,
  use: { baseURL, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, trace: "retain-on-failure" },
  projects: [
    { name: "chrome", use: { channel: "chrome" } },
    { name: "edge", use: { channel: "msedge" } },
  ],
  webServer: {
    command: "http-server prototypes/dist -a 127.0.0.1 -p 4174 -c-1",
    url: baseURL,
    reuseExistingServer: false,
  },
});
