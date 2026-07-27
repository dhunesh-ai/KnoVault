const path = require('path');
const fs = require('fs');
const { executeWebTests } = require('./selenium_web/webRunner');
const { executeMobileTests } = require('./appium_mobile/mobileRunner');
const { generateExcelReport } = require('./utils/excelReporter');

// Report Output Directories (strictly separated)
const webReportsDir = path.resolve(__dirname, './reports/web');
const mobileReportsDir = path.resolve(__dirname, './reports/mobile');

// Helper to clean directory before test run
function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
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

  let hasFailures = false;

  if (runWeb) {
    console.log('\n--- STARTING WEB E2E TEST SUITE (Target: 300 Real Tests) ---');
    cleanDirectory(webReportsDir);
    const webStart = Date.now();
    try {
      const results = await executeWebTests('http://localhost:3000');
      const webEnd = Date.now();

      const totalDiscovered = results.passed.length + results.failed.length;
      const passedCount = results.passed.length;
      const failedCount = results.failed.length;

      console.log(`\n[WEB E2E SUMMARY] Discovered: ${totalDiscovered} | Passed: ${passedCount} | Failed: ${failedCount}`);

      // Strict CI validation assertions
      if (totalDiscovered !== 300 || passedCount !== 300 || failedCount !== 0) {
        console.error(`[CI VALIDATION ERROR] Web E2E assertion failed! Expected: 300 Passed, 0 Failed. Got: ${passedCount} Passed, ${failedCount} Failed out of ${totalDiscovered}`);
        hasFailures = true;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportName = `E2E_Test_Report_Web_${timestamp}.xlsx`;
      const reportPath = path.join(webReportsDir, reportName);

      results.durationSec = (webEnd - webStart) / 1000;
      results.startTime = new Date(webStart).toISOString();
      results.endTime = new Date(webEnd).toISOString();

      await generateExcelReport(results, reportPath);
      console.log(`[Success] Clean Web E2E Report generated at: ${reportPath}`);
    } catch (e) {
      console.error('[Error] Web E2E Run failed:', e);
      hasFailures = true;
    }
  }

  if (runMobile) {
    console.log('\n--- STARTING MOBILE E2E TEST SUITE (Target: 300 Real Tests) ---');
    cleanDirectory(mobileReportsDir);
    const mobileStart = Date.now();
    try {
      const results = await executeMobileTests();
      const mobileEnd = Date.now();

      const totalDiscovered = results.passed.length + results.failed.length;
      const passedCount = results.passed.length;
      const failedCount = results.failed.length;

      console.log(`\n[MOBILE E2E SUMMARY] Discovered: ${totalDiscovered} | Passed: ${passedCount} | Failed: ${failedCount}`);

      // Strict CI validation assertions
      if (totalDiscovered !== 300 || passedCount !== 300 || failedCount !== 0) {
        console.error(`[CI VALIDATION ERROR] Mobile E2E assertion failed! Expected: 300 Passed, 0 Failed. Got: ${passedCount} Passed, ${failedCount} Failed out of ${totalDiscovered}`);
        hasFailures = true;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportName = `E2E_Test_Report_Mobile_${timestamp}.xlsx`;
      const reportPath = path.join(mobileReportsDir, reportName);

      results.durationSec = (mobileEnd - mobileStart) / 1000;
      results.startTime = new Date(mobileStart).toISOString();
      results.endTime = new Date(mobileEnd).toISOString();

      await generateExcelReport(results, reportPath);
      console.log(`[Success] Clean Mobile E2E Report generated at: ${reportPath}`);
    } catch (e) {
      console.error('[Error] Mobile E2E Run failed:', e);
      hasFailures = true;
    }
  }

  const endTime = new Date();
  console.log(`\n===================================================`);
  console.log(`All operations completed at: ${endTime.toISOString()}`);
  console.log(`Total duration: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
  console.log(`===================================================`);

  if (hasFailures) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Critical Error] Orchestrator crashed:', err);
  process.exit(1);
});
