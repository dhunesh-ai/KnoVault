const path = require('path');
const fs = require('fs');
const { executeWebTests } = require('./selenium_web/webRunner');
const { executeMobileTests } = require('./appium_mobile/mobileRunner');
const { generateExcelReport } = require('./utils/excelReporter');

// Ensure reports directory exists
const reportsDir = path.resolve(__dirname, './reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Parse CLI Arguments
const args = process.argv.slice(2);
const runWeb = args.includes('--web') || args.includes('--all') || args.length === 0;
const runMobile = args.includes('--mobile') || args.includes('--all');

async function main() {
  const startTime = new Date();
  console.log(`===================================================`);
  console.log(`KnoVault E2E Test Suite Orchestrator`);
  console.log(`Start Time: ${startTime.toISOString()}`);
  console.log(`===================================================`);

  if (runWeb) {
    console.log('\n--- STARTING WEB TEST SUITE ---');
    const webStart = Date.now();
    try {
      // Point Web runner to local Next.js dev server or public Render client
      const results = await executeWebTests('http://localhost:3000');
      const webEnd = Date.now();
      
      const reportName = `E2E_Test_Report_Web_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      const reportPath = path.join(reportsDir, reportName);
      
      results.durationSec = (webEnd - webStart) / 1000;
      results.startTime = new Date(webStart).toISOString();
      results.endTime = new Date(webEnd).toISOString();

      await generateExcelReport(results, reportPath);
      console.log(`[Success] Web E2E Report generated at: ${reportPath}`);
    } catch (e) {
      console.error('[Error] Web E2E Run failed:', e);
    }
  }

  if (runMobile) {
    console.log('\n--- STARTING MOBILE TEST SUITE ---');
    const mobileStart = Date.now();
    try {
      const results = await executeMobileTests();
      const mobileEnd = Date.now();
      
      const reportName = `E2E_Test_Report_Mobile_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      const reportPath = path.join(reportsDir, reportName);
      
      results.durationSec = (mobileEnd - mobileStart) / 1000;
      results.startTime = new Date(mobileStart).toISOString();
      results.endTime = new Date(mobileEnd).toISOString();

      await generateExcelReport(results, reportPath);
      console.log(`[Success] Mobile E2E Report generated at: ${reportPath}`);
    } catch (e) {
      console.error('[Error] Mobile E2E Run failed:', e);
    }
  }

  const endTime = new Date();
  console.log(`\n===================================================`);
  console.log(`All operations completed at: ${endTime.toISOString()}`);
  console.log(`Total duration: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
  console.log(`===================================================`);
}

main().catch(err => {
  console.error('[Critical Error] Orchestrator crashed:', err);
  process.exit(1);
});
