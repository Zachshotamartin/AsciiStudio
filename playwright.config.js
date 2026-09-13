import { defineConfig } from '@playwright/test';
const port=process.env.ASCII_TEST_PORT || '4190';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.js',timeout:45000,workers:1,use:{baseURL:`http://127.0.0.1:${port}`,headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},webServer:{command:`npm run dev -- --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:!process.env.CI},reporter:'line'});
