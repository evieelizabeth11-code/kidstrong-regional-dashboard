function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dashboard Tools')
    .addItem('Process Call Report', 'processCallReport')
    .addToUi();
}

function processCallReport() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = spreadsheet.getSheetByName('Podium Call Import');
  const dailySheet = spreadsheet.getSheetByName('Daily Calls');

  if (!importSheet || !dailySheet) {
    throw new Error('The Podium Call Import or Daily Calls tab is missing.');
  }

  const reportDate = importSheet.getRange('B2').getValue();
  if (!(reportDate instanceof Date) || isNaN(reportDate.getTime())) {
    SpreadsheetApp.getUi().alert('Enter a valid report date in Podium Call Import!B2 first.');
    return;
  }

  const lastImportRow = importSheet.getLastRow();
  if (lastImportRow < 5) {
    SpreadsheetApp.getUi().alert('No Podium report rows were found.');
    return;
  }

  const rawImportRows = importSheet.getRange(5, 1, lastImportRow - 4, 25).getValues();
  // A shorter CSV can leave rows from yesterday's import below the new grand
  // total. Stop at the current report's grand-total row so stale rows can
  // never be processed a second time.
  const grandTotalIndex = rawImportRows.findIndex(row =>
    String(row[0] || '').trim() === 'Total' && String(row[1] || '').trim() === ''
  );
  const importRows = grandTotalIndex >= 0
    ? rawImportRows.slice(0, grandTotalIndex + 1)
    : rawImportRows;
  const outputRows = importRows
    .filter(row => Number(row[23]) === 1 && row[21] && row[22])
    .map(row => [
      new Date(reportDate),
      row[22],
      row[21],
      numberOrZero_(row[2]),
      numberOrZero_(row[3]),
      numberOrZero_(row[7]),
      numberOrZero_(row[11]),
      numberOrZero_(row[12]),
      numberOrZero_(row[13]),
      numberOrZero_(row[18])
    ]);

  if (!outputRows.length) {
    SpreadsheetApp.getUi().alert('No included regional call rows were found. Check the Status column on the import tab.');
    return;
  }

  const timezone = spreadsheet.getSpreadsheetTimeZone();
  const reportKey = Utilities.formatDate(reportDate, timezone, 'yyyy-MM-dd');
  const lastDailyRow = dailySheet.getLastRow();
  const existingRows = lastDailyRow >= 5
    ? dailySheet.getRange(5, 1, lastDailyRow - 4, 10).getValues()
    : [];

  const preservedRows = existingRows.filter(row => {
    if (!(row[0] instanceof Date) || isNaN(row[0].getTime())) return row.some(value => value !== '');
    return Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') !== reportKey;
  });

  // Daily Calls is a native Google Sheets table. Table-backed ranges reject
  // some actions that span multiple columns, so clear and write one column at
  // a time. This also makes the menu action independent of the active cell.
  if (lastDailyRow >= 5) {
    for (let column = 1; column <= 10; column += 1) {
      dailySheet.getRange(5, column, lastDailyRow - 4, 1).clearContent();
    }
  }

  const finalRows = preservedRows.concat(outputRows).sort((a, b) => {
    const aTime = a[0] instanceof Date ? a[0].getTime() : 0;
    const bTime = b[0] instanceof Date ? b[0].getTime() : 0;
    return aTime - bTime;
  });

  for (let column = 1; column <= 10; column += 1) {
    const columnValues = finalRows.map(row => [row[column - 1]]);
    dailySheet.getRange(5, column, finalRows.length, 1).setValues(columnValues);
  }
  dailySheet.getRange(5, 1, finalRows.length, 1).setNumberFormat('yyyy-mm-dd');
  for (let column = 4; column <= 10; column += 1) {
    dailySheet.getRange(5, column, finalRows.length, 1).setNumberFormat('0.00');
  }
  SpreadsheetApp.flush();

  const totalMinutes = outputRows.reduce((sum, row) => sum + Number(row[9] || 0), 0);
  SpreadsheetApp.getUi().alert(
    'Call report processed',
    reportKey + ': ' + outputRows.length + ' rows added, totaling ' + totalMinutes.toFixed(2) + ' minutes.\n\nThe dashboard feed is now updated.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function numberOrZero_(value) {
  const number = Number(value);
  return isFinite(number) ? number : 0;
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('DASHBOARD_UPLOAD_SECRET');
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: 'Unauthorized upload request.' });
    }

    if (payload.action === 'parse') return parseScorecardPdf_(payload);
    if (payload.action === 'approve') return approveScorecardRows_(payload);
    if (payload.action === 'month-closeout-preview') return previewMonthCloseout_(payload);
    if (payload.action === 'month-closeout') return finalizeMonth_(payload);
    return jsonResponse_({ ok: false, error: 'Unknown scorecard action.' });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error && error.message ? error.message : String(error) });
  }
}

function parseScorecardPdf_(payload) {
  if (!payload.pdfBase64 || !payload.fileName || !payload.reportDate) {
    return jsonResponse_({ ok: false, error: 'The PDF, filename, and report date are required.' });
  }

  const archiveFolder = getOrCreateFolder_('KidStrong Daily Scorecards');
  const pdfBlob = Utilities.newBlob(
    Utilities.base64Decode(payload.pdfBase64),
    'application/pdf',
    payload.fileName
  );
  const archivedPdf = archiveFolder.createFile(pdfBlob);

  const ocrFile = Drive.Files.create({
    name: 'OCR - ' + payload.fileName,
    mimeType: 'application/vnd.google-apps.document',
    parents: [archiveFolder.getId()]
  }, pdfBlob, { ocrLanguage: 'en', fields: 'id' });

  const text = DocumentApp.openById(ocrFile.id).getBody().getText();
  DriveApp.getFileById(ocrFile.id).setTrashed(true);
  const rows = extractScorecardRows_(text);

  if (rows.length !== 4) {
    return jsonResponse_({
      ok: false,
      error: 'I could not confidently find all four Southern New Jersey centers. No dashboard data was changed.',
      foundCenters: rows.map(function(row) { return row.center; }),
      sourceFileId: archivedPdf.getId(),
      sourceFileUrl: archivedPdf.getUrl()
    });
  }

  return jsonResponse_({
    ok: true,
    reportDate: payload.reportDate,
    fileName: payload.fileName,
    sourceFileId: archivedPdf.getId(),
    sourceFileUrl: archivedPdf.getUrl(),
    rows: rows
  });
}

function extractScorecardRows_(text) {
  const centerNames = {
    ks_brick: 'Brick',
    ks_mount_laurel: 'Mount Laurel',
    ks_turnersville: 'Turnersville',
    ks_voorhees: 'Voorhees'
  };
  const normalized = String(text || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ');
  const rows = [];

  Object.keys(centerNames).forEach(function(key) {
    const start = normalized.indexOf(key);
    if (start < 0) return;
    const line = normalized.slice(start, normalized.indexOf('\n', start) > start ? normalized.indexOf('\n', start) : start + 500);
    const numericText = line.slice(key.length).replace(/\$/g, '').replace(/,/g, '');
    const tokens = numericText.match(/-?\d+(?:\.\d+)?%?/g) || [];
    if (tokens.length < 18) return;
    const values = tokens.slice(0, 18).map(function(token) {
      return Number(token.replace('%', ''));
    });
    if (values.some(function(value) { return !isFinite(value); })) return;

    rows.push({
      center: centerNames[key],
      activePayingMembers: values[0],
      activePayerNetGain: values[1],
      membershipRevenue: values[2],
      totalRevenue: values[3],
      churnRate: values[4],
      salesMtd: values[5],
      totalDropsMtd: values[6],
      leadsMtd: values[7],
      leadToBooked: values[8],
      trialsBooked: values[9],
      totalTrialsBooked: values[10],
      trialsExpected: values[11],
      showRate: values[12],
      trialsAttended: values[13],
      salesFromTrial: values[14],
      salesNoTrial: values[15],
      winbacks: values[16],
      pendingDropsIgnored: values[17]
    });
  });

  return ['Brick', 'Mount Laurel', 'Turnersville', 'Voorhees'].map(function(center) {
    return rows.find(function(row) { return row.center === center; });
  }).filter(Boolean);
}

function approveScorecardRows_(payload) {
  if (!payload.reportDate || !payload.fileName || !payload.sourceFileId || !Array.isArray(payload.rows)) {
    return jsonResponse_({ ok: false, error: 'The reviewed scorecard rows are incomplete.' });
  }
  const expectedCenters = ['Brick', 'Mount Laurel', 'Turnersville', 'Voorhees'];
  if (payload.rows.length !== 4 || payload.rows.some(function(row) { return expectedCenters.indexOf(row.center) < 0; })) {
    return jsonResponse_({ ok: false, error: 'Exactly one reviewed row is required for each center.' });
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Daily Scorecard Import');
  if (!sheet) return jsonResponse_({ ok: false, error: 'Daily Scorecard Import is missing.' });

  const timezone = spreadsheet.getSpreadsheetTimeZone();
  // Store a date-only value at midnight. A hidden noon timestamp makes
  // otherwise identical dates fail exact-match formulas in Membership Health
  // and Dashboard Feed.
  const reportDate = Utilities.parseDate(payload.reportDate, timezone, 'yyyy-MM-dd');
  if (isNaN(reportDate.getTime())) return jsonResponse_({ ok: false, error: 'Invalid report date.' });
  const reportKey = Utilities.formatDate(reportDate, timezone, 'yyyy-MM-dd');
  const lastRow = Math.max(sheet.getLastRow(), 4);
  const existing = lastRow > 4 ? sheet.getRange(5, 1, lastRow - 4, 2).getValues() : [];
  const rowByCenter = {};
  existing.forEach(function(values, index) {
    if (!(values[0] instanceof Date)) return;
    const dateKey = Utilities.formatDate(values[0], timezone, 'yyyy-MM-dd');
    if (dateKey === reportKey && expectedCenters.indexOf(values[1]) >= 0) rowByCenter[values[1]] = index + 5;
  });

  let nextRow = lastRow + 1;
  payload.rows.forEach(function(row) {
    const targetRow = rowByCenter[row.center] || nextRow++;
    const values = [[
      reportDate,
      row.center,
      numberOrZero_(row.activePayingMembers),
      numberOrZero_(row.activePayerNetGain),
      numberOrZero_(row.membershipRevenue),
      numberOrZero_(row.totalRevenue),
      numberOrZero_(row.churnRate) / 100,
      numberOrZero_(row.salesMtd),
      numberOrZero_(row.totalDropsMtd),
      numberOrZero_(row.leadsMtd),
      numberOrZero_(row.leadToBooked) / 100,
      numberOrZero_(row.trialsBooked),
      numberOrZero_(row.totalTrialsBooked),
      numberOrZero_(row.trialsExpected),
      numberOrZero_(row.showRate) / 100,
      numberOrZero_(row.trialsAttended),
      numberOrZero_(row.salesFromTrial),
      numberOrZero_(row.salesNoTrial),
      numberOrZero_(row.winbacks),
      '=HYPERLINK("https://drive.google.com/open?id=' + payload.sourceFileId + '","' + String(payload.fileName).replace(/"/g, '""') + '")',
      'Imported',
      'Uploaded from dashboard. Pending Drops intentionally excluded.'
    ]];
    const range = sheet.getRange(targetRow, 1, 1, 22);
    range.setValues(values);
    range.setBackground('#eff7ff');
    sheet.getRange(targetRow, 1).setNumberFormat('mm/dd/yyyy');
    sheet.getRange(targetRow, 5, 1, 2).setNumberFormat('$#,##0');
    sheet.getRange(targetRow, 7).setNumberFormat('0.0%');
    sheet.getRange(targetRow, 11).setNumberFormat('0.0%');
    sheet.getRange(targetRow, 15).setNumberFormat('0.0%');
    sheet.getRange(targetRow, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(expectedCenters, true).setAllowInvalid(false).build());
    sheet.getRange(targetRow, 21).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Ready', 'Needs Review', 'Imported'], true).setAllowInvalid(false).build());
  });

  SpreadsheetApp.flush();
  return jsonResponse_({
    ok: true,
    reportDate: reportKey,
    centersUpdated: payload.rows.length,
    regionalSales: payload.rows.reduce(function(sum, row) { return sum + numberOrZero_(row.salesMtd); }, 0)
  });
}

function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function finalScorecardRows_(spreadsheet, reportDate, timezone) {
  const scorecardSheet = spreadsheet.getSheetByName('Daily Scorecard Import');
  if (!scorecardSheet) throw new Error('The Daily Scorecard Import tab is missing.');
  const lastRow = scorecardSheet.getLastRow();
  const rows = lastRow >= 5 ? scorecardSheet.getRange(5, 1, lastRow - 4, 18).getValues() : [];
  const expected = ['Brick', 'Mount Laurel', 'Turnersville', 'Voorhees'];
  return expected.map(function(center) {
    const matches = rows.filter(function(row) {
      return row[0] instanceof Date && Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === reportDate && row[1] === center;
    });
    if (!matches.length) throw new Error('The final scorecard is missing ' + center + ' for ' + reportDate + '.');
    const row = matches[matches.length - 1];
    return {
      center: center,
      activePayingMembers: numberOrZero_(row[2]),
      salesMtd: numberOrZero_(row[7]),
      totalDropsMtd: numberOrZero_(row[8]),
      trialsExpected: numberOrZero_(row[13]),
      trialsAttended: numberOrZero_(row[15]),
      salesFromTrial: numberOrZero_(row[16]),
      salesNoTrial: numberOrZero_(row[17])
    };
  });
}

function previewMonthCloseout_(payload) {
  if (!payload.reportDate) return jsonResponse_({ ok: false, error: 'The report date is required.' });
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  return jsonResponse_({ ok: true, finalScorecard: finalScorecardRows_(spreadsheet, payload.reportDate, timezone) });
}

function finalizeMonth_(payload) {
  if (!payload.reportDate) {
    return jsonResponse_({ ok: false, error: 'The report date is required.' });
  }
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  const reportDate = Utilities.parseDate(payload.reportDate, timezone, 'yyyy-MM-dd');
  if (isNaN(reportDate.getTime()) || reportDate.getDate() !== 1) {
    return jsonResponse_({ ok: false, error: 'Final closeout is only available on the first report date of the new month.' });
  }
  const dataThrough = new Date(reportDate); dataThrough.setDate(dataThrough.getDate() - 1);
  const period = Utilities.formatDate(dataThrough, timezone, 'yyyy-MM');
  const nextPeriod = Utilities.formatDate(reportDate, timezone, 'MMMM yyyy');
  const feed = spreadsheet.getSheetByName('Dashboard Feed');
  const archive = spreadsheet.getSheetByName('Historical Archive');
  if (!feed || !archive) return jsonResponse_({ ok: false, error: 'A required dashboard tab is missing.' });

  const feedRows = feed.getRange(2, 1, 4, 38).getValues();
  const expected = ['Brick', 'Mount Laurel', 'Turnersville', 'Voorhees'];
  if (feedRows.some(function(row, index) { return row[0] !== expected[index]; })) {
    return jsonResponse_({ ok: false, error: 'Dashboard Feed must contain the four centers in the expected order.' });
  }
  const reportKey = Utilities.formatDate(reportDate, timezone, 'yyyy-MM-dd');
  if (feedRows.some(function(row) {
    return !(row[12] instanceof Date) || Utilities.formatDate(row[12], timezone, 'yyyy-MM-dd') !== reportKey;
  })) return jsonResponse_({ ok: false, error: 'The four centers do not share the approved report date.' });
  const finalScorecard = finalScorecardRows_(spreadsheet, reportKey, timezone);

  const lastArchiveRow = archive.getLastRow();
  const existing = lastArchiveRow > 1 ? archive.getRange(2, 3, lastArchiveRow - 1, 3).getValues() : [];
  if (existing.some(function(row) {
    const archivedPeriod = row[0] instanceof Date
      ? Utilities.formatDate(row[0], timezone, 'yyyy-MM')
      : String(row[0] || '').slice(0, 7);
    return archivedPeriod === period && row[1] === 'FINAL';
  })) {
    return jsonResponse_({ ok: false, error: period + ' is already finalized. No duplicate archive was created.' });
  }
  const archiveRows = feedRows.map(function(row) {
    const scorecard = finalScorecard.find(function(item) { return item.center === row[0]; });
    if (!scorecard) throw new Error('Missing final scorecard row for ' + row[0] + '.');
    return [reportDate, dataThrough, period, 'FINAL', row[0], row[1], row[2], numberOrZero_(scorecard.activePayingMembers), row[3], row[4], row[5], row[10], numberOrZero_(scorecard.totalDropsMtd), row[7], numberOrZero_(scorecard.salesMtd), numberOrZero_(scorecard.salesFromTrial), numberOrZero_(scorecard.salesNoTrial), row[9], numberOrZero_(scorecard.trialsExpected), numberOrZero_(scorecard.trialsAttended), numberOrZero_(scorecard.salesFromTrial), row[31], row[32], row[33], row[21], row[15], row[17], row[25], row[23], row[24], row[26], 'Final ' + period + ' snapshot; final scorecard approved and month archived.'];
  });
  archive.getRange(lastArchiveRow + 1, 1, 4, 32).setValues(archiveRows);
  archive.getRange(lastArchiveRow + 1, 1, 4, 2).setNumberFormat('yyyy-mm-dd');

  SpreadsheetApp.flush();
  return jsonResponse_({ ok: true, period: period, periodLabel: Utilities.formatDate(dataThrough, timezone, 'MMMM yyyy'), nextPeriodLabel: nextPeriod, centersArchived: 4, goalsPreserved: 4 });
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
