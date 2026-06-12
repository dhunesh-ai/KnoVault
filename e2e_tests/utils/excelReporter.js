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

  // 1. Test Suite Summary Sheet
  const summarySheet = workbook.addWorksheet('Test Suite');
  summarySheet.columns = [
    { header: 'Test Suite', key: 'suite', width: 35 },
    { header: 'Total Tests', key: 'total', width: 15 },
    { header: 'Passed', key: 'passed', width: 12 },
    { header: 'Failed', key: 'failed', width: 12 },
    { header: 'Pass Rate %', key: 'rate', width: 15 },
    { header: 'Duration (sec)', key: 'duration', width: 18 },
    { header: 'Start Time', key: 'start', width: 25 },
    { header: 'End Time', key: 'end', width: 25 }
  ];

  const passRate = results.passed.length + results.failed.length > 0 
    ? parseFloat(((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(2)) 
    : 100.00;

  summarySheet.addRow({
    suite: results.suiteName,
    total: results.passed.length + results.failed.length,
    passed: results.passed.length,
    failed: results.failed.length,
    rate: passRate,
    duration: parseFloat(results.durationSec.toFixed(2)),
    start: results.startTime,
    end: results.endTime
  });

  // Style Summary Header
  summarySheet.getRow(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E4053' } };
  summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
  
  // Style Summary Data Row
  const dataRow = summarySheet.getRow(2);
  dataRow.font = { name: 'Segoe UI', size: 10 };
  dataRow.alignment = { vertical: 'middle', horizontal: 'left' };
  dataRow.getCell('rate').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: passRate >= 80 ? '196F3D' : '922B21' } };

  // Borders
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2'].forEach(cell => {
    summarySheet.getCell(cell).border = {
      top: { style: 'thin', color: { argb: 'D0D3D4' } },
      left: { style: 'thin', color: { argb: 'D0D3D4' } },
      bottom: { style: 'thin', color: { argb: 'D0D3D4' } },
      right: { style: 'thin', color: { argb: 'D0D3D4' } }
    };
  });

  // 2. Passed Tests Sheet
  const passedSheet = workbook.addWorksheet('Passed Tests');
  passedSheet.columns = [
    { header: 'No.', key: 'no', width: 8 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Test Name', key: 'name', width: 45 },
    { header: 'Time (sec)', key: 'time', width: 15 },
    { header: 'Status', key: 'status', width: 12 }
  ];

  results.passed.forEach((test, idx) => {
    passedSheet.addRow({
      no: idx + 1,
      category: test.category,
      name: test.name,
      time: parseFloat(test.time.toFixed(2)),
      status: 'PASSED'
    });
  });

  // Style Passed Headers
  passedSheet.getRow(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  passedSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E8449' } }; // Dark Green

  // Style Passed Data Rows
  passedSheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.font = { name: 'Segoe UI', size: 10 };
      row.getCell('status').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1E8449' } };
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7E9' } },
          left: { style: 'thin', color: { argb: 'E5E7E9' } },
          bottom: { style: 'thin', color: { argb: 'E5E7E9' } },
          right: { style: 'thin', color: { argb: 'E5E7E9' } }
        };
      });
      if (rowNum % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F4FDF7' } }; // Zebra green
        });
      }
    }
  });

  // 3. Failed Tests Sheet
  const failedSheet = workbook.addWorksheet('Failed Tests');
  failedSheet.columns = [
    { header: 'No.', key: 'no', width: 8 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Test Name', key: 'name', width: 45 },
    { header: 'Error', key: 'error', width: 65 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Timestamp', key: 'timestamp', width: 25 }
  ];

  results.failed.forEach((test, idx) => {
    failedSheet.addRow({
      no: idx + 1,
      category: test.category,
      name: test.name,
      error: test.error,
      status: 'FAILED',
      timestamp: new Date().toISOString()
    });
  });

  // Style Failed Headers
  failedSheet.getRow(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  failedSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'A93226' } }; // Red-ish Brown

  // Style Failed Data Rows
  failedSheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.font = { name: 'Segoe UI', size: 10 };
      row.getCell('status').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'C0392B' } };
      row.getCell('error').alignment = { wrapText: true };
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7E9' } },
          left: { style: 'thin', color: { argb: 'E5E7E9' } },
          bottom: { style: 'thin', color: { argb: 'E5E7E9' } },
          right: { style: 'thin', color: { argb: 'E5E7E9' } }
        };
      });
      if (rowNum % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FDEDEC' } }; // Zebra red
        });
      }
    }
  });

  // 4. Execution Log Sheet
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
  logSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5D6D7E' } }; // Steel Gray

  logSheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.font = { name: 'Consolas', size: 9.5 };
      const levelCell = row.getCell('level');
      if (levelCell.value === 'ERROR') {
        levelCell.font = { bold: true, color: { argb: 'C0392B' } };
      } else if (levelCell.value === 'WARNING') {
        levelCell.font = { bold: true, color: { argb: 'D35400' } };
      } else {
        levelCell.font = { color: { argb: '27AE60' } };
      }
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'F2F3F4' } },
          left: { style: 'thin', color: { argb: 'F2F3F4' } },
          bottom: { style: 'thin', color: { argb: 'F2F3F4' } },
          right: { style: 'thin', color: { argb: 'F2F3F4' } }
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
