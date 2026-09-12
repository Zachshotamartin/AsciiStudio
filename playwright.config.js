import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.js',timeout:45000,workers:1,use:{baseURL:'http://127.0.0.1:4190',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},webServer:{command:'npm run dev -- --port 4190 --strictPort',url:'http://127.0.0.1:4190',reuseExistingServer:!process.env.CI},reporter:'line'});
