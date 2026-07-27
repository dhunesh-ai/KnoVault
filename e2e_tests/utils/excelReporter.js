const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Generates the E2E Test Report Excel file based on execution outcomes.
 * @param {Object} results
 * @param {string} results.suiteName
 * @param {Array} results.passed
 * @param {Array} results.failed
 * @param {Array} results.logs
 * @param {number} results.durationSec
 * @param {string} results.startTime
 * @param {string} results.endTime
 * @param {string} outputPath
 */
async function generateExcelReport(results, outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KnoVault E2E Test Runner';
  workbook.lastModifiedBy = 'KnoVault E2E Test Runner';
  workbook.created = new Date();
  workbook.modified = new Date();

  const totalTests = results.passed.length + results.failed.length;
  const passedCount = results.passed.length;
  const failedCount = results.failed.length;
  const skippedCount = 0;
  const passRate = totalTests > 0 ? parseFloat(((passedCount / totalTests) * 100).toFixed(2)) : 100.00;

  // 1. Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Test Suite', key: 'suite', width: 45 },
    { header: 'Total Tests', key: 'total', width: 15 },
    { header: 'Passed', key: 'passed', width: 12 },
    { header: 'Failed', key: 'failed', width: 12 },
    { header: 'Skipped', key: 'skipped', width: 12 },
    { header: 'Pass Rate', key: 'rate', width: 15 },
    { header: 'Duration (sec)', key: 'duration', width: 18 },
    { header: 'Start Time', key: 'start', width: 25 },
    { header: 'End Time', key: 'end', width: 25 }
  ];

  summarySheet.addRow({
    suite: results.suiteName,
    total: totalTests,
    passed: passedCount,
    failed: failedCount,
    skipped: skippedCount,
    rate: `${passRate}%`,
    duration: parseFloat((results.durationSec || 0).toFixed(2)),
    start: results.startTime || new Date().toISOString(),
    end: results.endTime || new Date().toISOString()
  });

  // Style Summary Header
  summarySheet.getRow(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F2937' } }; // Dark slate
  summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Style Summary Data Row
  const summaryDataRow = summarySheet.getRow(2);
  summaryDataRow.font = { name: 'Segoe UI', size: 10, bold: true };
  summaryDataRow.alignment = { vertical: 'middle', horizontal: 'center' };
  summaryDataRow.getCell('rate').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: passRate >= 80 ? '059669' : 'DC2626' } };

  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2', 'I2'].forEach(cellRef => {
    summarySheet.getCell(cellRef).border = {
      top: { style: 'thin', color: { argb: 'D1D5DB' } },
      left: { style: 'thin', color: { argb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
      right: { style: 'thin', color: { argb: 'D1D5DB' } }
    };
  });

  // 2. Detailed Test Cases Sheet
  const detailedSheet = workbook.addWorksheet('Test Cases');
  detailedSheet.columns = [
    { header: 'Test Case ID', key: 'id', width: 16 },
    { header: 'Module', key: 'category', width: 25 },
    { header: 'Test Scenario', key: 'scenario', width: 45 },
    { header: 'Preconditions', key: 'preconditions', width: 35 },
    { header: 'Test Steps', key: 'steps', width: 40 },
    { header: 'Expected Result', key: 'expected', width: 45 },
    { header: 'Actual Result', key: 'actualResult', width: 45 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Execution Time (s)', key: 'time', width: 18 },
    { header: 'Timestamp', key: 'timestamp', width: 25 }
  ];

  const allTests = [...results.passed, ...results.failed];

  allTests.forEach((test) => {
    detailedSheet.addRow({
      id: test.id,
      category: test.category,
      scenario: test.scenario || test.name,
      preconditions: test.preconditions || 'N/A',
      steps: test.steps || 'Execute automated assertion steps',
      expected: test.expected || 'Assertion passed successfully',
      actualResult: test.actualResult || (test.status === 'PASS' ? 'Assertion passed with 200 OK' : test.error),
      status: test.status || 'PASS',
      time: parseFloat((test.time || 0).toFixed(3)),
      timestamp: test.timestamp || new Date().toISOString()
    });
  });

  // Style Detailed Headers
  detailedSheet.getRow(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  detailedSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } }; // Royal Blue
  detailedSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Style Detailed Data Rows
  detailedSheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.font = { name: 'Segoe UI', size: 9.5 };
      const statusCell = row.getCell('status');
      if (statusCell.value === 'PASS' || statusCell.value === 'PASSED') {
        statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '059669' } };
      } else if (statusCell.value === 'FAIL' || statusCell.value === 'FAILED') {
        statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'DC2626' } };
      }

      row.getCell('steps').alignment = { wrapText: true };
      row.getCell('scenario').alignment = { wrapText: true };
      row.getCell('expected').alignment = { wrapText: true };
      row.getCell('actualResult').alignment = { wrapText: true };

      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7EB' } },
          left: { style: 'thin', color: { argb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          right: { style: 'thin', color: { argb: 'E5E7EB' } }
        };
      });

      if (rowNum % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
        });
      }
    }
  });

  // 3. Execution Log Sheet
  const logSheet = workbook.addWorksheet('Execution Log');
  logSheet.columns = [
    { header: 'Timestamp', key: 'timestamp', width: 25 },
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Message', key: 'message', width: 85 }
  ];

  results.logs.forEach(log => {
    logSheet.addRow({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message
    });
  });

  // Style Log Headers
  logSheet.getRow(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  logSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4B5563' } };

  logSheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.font = { name: 'Consolas', size: 9 };
      const levelCell = row.getCell('level');
      if (levelCell.value === 'ERROR') {
        levelCell.font = { bold: true, color: { argb: 'DC2626' } };
      } else if (levelCell.value === 'WARNING') {
        levelCell.font = { bold: true, color: { argb: 'D97706' } };
      } else {
        levelCell.font = { color: { argb: '059669' } };
      }

      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'F3F4F6' } },
          left: { style: 'thin', color: { argb: 'F3F4F6' } },
          bottom: { style: 'thin', color: { argb: 'F3F4F6' } },
          right: { style: 'thin', color: { argb: 'F3F4F6' } }
        };
      });
    }
  });

  // Save Report
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await workbook.xlsx.writeFile(outputPath);
}

module.exports = {
  generateExcelReport
};
