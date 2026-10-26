/**
 * ACE LIVE Tracking - Web Application Backend (v8.5 Daily Reset 08:00 AM & Bilingual Export)
 * Developed for MC & VJ Daily Diamond Management, Schedule, KPI & Multi-Month Tracking
 */

// Spreadsheet ID (สามารถปรับเปลี่ยนหรือดึงจาก Script Properties ได้)
var SPREADSHEET_ID = '1V1RN0Vk9j_cSNVjenbidmY22x8V5SyXGSVvylW0yGic';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('ACE LIVE Tracking - ระบบบันทึกและจัดการยอด Diamond & KPI')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ฟังก์ชันกลางสำหรับบันทึก Log กิจกรรมลงชีต System_Logs
 */
function logSystemData(action, username, sheetTarget, details, status) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var logSheet = ss.getSheetByName('System_Logs');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('System_Logs');
      logSheet.appendRow(['Timestamp', 'User', 'Action', 'Sheet_Target', 'Details', 'Status']);
      logSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    }
    
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    logSheet.appendRow([nowStr, username || 'System', action, sheetTarget || '-', details || '-', status || 'SUCCESS']);
  } catch (e) {
    Logger.log('Logging Error: ' + e.toString());
  }
}

/**
 * ดึงข้อมูล System Logs ไปแสดงบน Frontend Web App
 */
function getSystemLogs(actionFilter, limit) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('System_Logs');
    if (!sheet || sheet.getLastRow() < 2) return { success: true, logs: [] };

    var maxRows = limit || 100;
    var lastRow = sheet.getLastRow();
    var startRow = Math.max(2, lastRow - maxRows + 1);
    var numRows = lastRow - startRow + 1;

    var data = sheet.getRange(startRow, 1, numRows, 6).getValues();
    var logs = [];

    for (var i = data.length - 1; i >= 0; i--) {
      var row = data[i];
      var act = row[2] ? row[2].toString().trim() : '';

      if (!actionFilter || actionFilter === 'ALL' || act === actionFilter) {
        logs.push({
          timestamp: row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : row[0].toString(),
          user: row[1] ? row[1].toString() : '-',
          action: act,
          sheetTarget: row[3] ? row[3].toString() : '-',
          details: row[4] ? row[4].toString() : '-',
          status: row[5] ? row[5].toString() : 'SUCCESS'
        });
      }
    }
    return { success: true, logs: logs };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * ระบบเข้าสู่ระบบ ตรวจสอบ Username, Password และ Role (ADMIN / SUPER_ADMIN)
 * คอลัมน์ชีต Admin_Users: A=Username, B=Password, C=Name, D=Role
 */
function loginUser(username, password) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Admin_Users');
    if (!sheet) return { success: false, message: 'ไม่พบชีต "Admin_Users"' };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, message: 'ไม่มีข้อมูลผู้ใช้งานในระบบ' };

    var data = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 4)).getValues();
    var inputUser = (username || '').toString().trim().toLowerCase();
    var inputPass = (password || '').toString().trim();

    for (var i = 0; i < data.length; i++) {
      var userInSheet = data[i][0] ? data[i][0].toString().trim().toLowerCase() : '';
      var passInSheet = data[i][1] ? data[i][1].toString().trim() : '';
      var nameInSheet = data[i][2] ? data[i][2].toString().trim() : '';
      var roleInSheet = data[i][3] ? data[i][3].toString().trim().toUpperCase() : 'ADMIN';

      if (roleInSheet !== 'SUPER_ADMIN' && roleInSheet !== 'ADMIN') {
        roleInSheet = 'ADMIN';
      }

      if (userInSheet === inputUser && passInSheet === inputPass) {
        var activeName = nameInSheet || data[i][0].toString().trim();
        logSystemData('LOGIN', activeName, 'System', 'เข้าสู่ระบบสำเร็จ สถานะ: ' + roleInSheet, 'SUCCESS');
        return {
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ',
          user: { 
            username: data[i][0].toString().trim(), 
            name: activeName,
            role: roleInSheet 
          }
        };
      }
    }
    logSystemData('LOGIN_FAILED', inputUser, 'System', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'FAILED');
    return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.toString() };
  }
}

function isTotalRow(str) {
  if (!str) return false;
  var s = str.toString().trim().toUpperCase();
  var totalKeywords = ['TOTAL', 'GRAND TOTAL', 'SUM', 'SUMMARY', 'TOTALS', 'รวม', 'ยอดรวม', 'สรุป', 'เฉลี่ย', 'AVERAGE'];
  for (var k = 0; k < totalKeywords.length; k++) {
    if (s.indexOf(totalKeywords[k]) !== -1) return true;
  }
  return false;
}

function isHeaderOrReserved(str) {
  if (!str) return true;
  var s = str.toString().trim().toUpperCase();
  var reserved = ['TEAM', 'ทีม', 'MC', 'ชื่อ MC', 'MC ผู้ปฏิบัติหน้าที่', 'ชื่อ MC ผู้ปฏิบัติหน้าที่', 'MC ผู้ปฏิบัติงาน', 'VJ', 'ชื่อ VJ', 'NAME', 'ชื่อ', 'NO', 'ลำดับ'];
  for (var k = 0; k < reserved.length; k++) {
    if (s === reserved[k] || s.indexOf('ชื่อ MC') !== -1 || s.indexOf('MC ผู้ปฏิบัติหน้าที่') !== -1) return true;
  }
  return isTotalRow(s);
}

function getTargetSheet(targetSheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets();

  if (targetSheetName) {
    var cleanTarget = targetSheetName.toString().trim().toUpperCase();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().trim().toUpperCase() === cleanTarget) {
        return sheets[i];
      }
    }
  }

  var date = new Date();
  var monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  var currentMonthName = monthNames[date.getMonth()];

  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toUpperCase().indexOf(currentMonthName) !== -1) {
      return sheets[i];
    }
  }
  return sheets[0];
}

function detectTeamAndVJColumns(data) {
  var teamCol = 0;
  var vjCol = 4;

  var maxRows = Math.min(data.length, 5);
  for (var r = 0; r < maxRows; r++) {
    for (var c = 0; c < Math.min(data[r].length, 10); c++) {
      var val = data[r][c] ? data[r][c].toString().trim().toUpperCase() : '';
      if (val === 'TEAM' || val === 'ทีม') teamCol = c;
      if (val === 'VJ' || val === 'ชื่อ VJ' || val === 'NAME' || val === 'ชื่อ') vjCol = c;
    }
  }
  return { teamCol: teamCol, vjCol: vjCol };
}

/**
 * ค้นหาตำแหน่งแถวบันทึก MC สำหรับทีมที่กำหนด (เจาะจงตำแหน่งแถวด้านบนก่อนแถว Total ของทีมนั้น)
 */
function findMCRowForTeam(fullData, cols, teamName) {
  var cleanTeam = (teamName || '').toString().trim().toLowerCase();
  var currentTeam = '';

  for (var i = 0; i < fullData.length; i++) {
    var cellTeam = fullData[i][cols.teamCol] ? fullData[i][cols.teamCol].toString().trim() : '';
    var cellVJ = fullData[i][cols.vjCol] ? fullData[i][cols.vjCol].toString().trim() : '';

    if (cellTeam && !isHeaderOrReserved(cellTeam) && !isTotalRow(cellTeam)) {
      currentTeam = cellTeam;
    }

    var isThisTeam = (!cleanTeam || cleanTeam === 'all' || 
                      (cellTeam && cellTeam.toLowerCase() === cleanTeam) || 
                      (currentTeam && currentTeam.toLowerCase() === cleanTeam));

    if (isThisTeam) {
      if (isTotalRow(cellVJ) || isTotalRow(cellTeam)) {
        var totalRowIndex = i + 1;
        if (totalRowIndex > 1) {
          return totalRowIndex - 1;
        }
      }
    }
  }

  for (var i = 0; i < fullData.length; i++) {
    var cellTeam = fullData[i][cols.teamCol] ? fullData[i][cols.teamCol].toString().trim() : '';
    var cellVJ = fullData[i][cols.vjCol] ? fullData[i][cols.vjCol].toString().trim() : '';

    if (cellTeam && !isHeaderOrReserved(cellTeam) && !isTotalRow(cellTeam)) {
      currentTeam = cellTeam;
    }

    var isThisTeam = (!cleanTeam || cleanTeam === 'all' || 
                      (cellTeam && cellTeam.toLowerCase() === cleanTeam) || 
                      (currentTeam && currentTeam.toLowerCase() === cleanTeam));

    if (isThisTeam) {
      var vjUpper = cellVJ.toUpperCase();
      if (vjUpper === 'MC' || vjUpper === 'ชื่อ MC' || vjUpper.indexOf('MC') !== -1 || vjUpper.indexOf('ผู้ปฏิบัติหน้าที่') !== -1) {
        return i + 1;
      }
    }
  }

  return -1;
}

function getDefaultAvatar(name) {
  var cleanName = encodeURIComponent((name || 'VJ').toString().trim());
  return 'https://ui-avatars.com/api/?name=' + cleanName + '&background=7c3aed&color=ffffff&bold=true&size=256';
}

function fetchTikTokAvatar(tiktokId, vjName) {
  if (!tiktokId || tiktokId === '-' || tiktokId.toString().trim() === '') {
    return getDefaultAvatar(vjName);
  }
  var username = tiktokId.toString().replace(/^@/, '').trim();
  if (!username) return getDefaultAvatar(vjName);
  return 'https://unavatar.io/tiktok/' + encodeURIComponent(username);
}

function getVJProfilesMap() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('vj mc all');
    if (!sheet) return {};

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) return {};

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var map = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var valB = row[1] ? row[1].toString().trim() : '';
      var valH = row[7] ? row[7].toString().trim() : '';
      if (!valB && !valH) continue;

      var targetName = valB || valH;
      var tiktokId = valH || valB || '-';
      var profilePic = fetchTikTokAvatar(tiktokId, targetName);

      var profileObj = {
        nameB: valB,
        nameH: valH,
        tiktokId: tiktokId,
        profilePic: profilePic
      };

      if (valB) map[valB.toLowerCase()] = profileObj;
      if (valH) map[valH.toLowerCase()] = profileObj;
    }
    return map;
  } catch (err) {
    return {};
  }
}

function getInitialData(targetSheetName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getTargetSheet(targetSheetName);
    var lastRow = sheet.getLastRow();

    var excludedSheets = ['Admin_Users', 'Team Data', 'MC_Schedule', 'KPI_Targets', 'vj mc all', 'Submission_Logs', 'System_Logs'];
    var allSheets = ss.getSheets().map(function (s) { return s.getName().trim(); }).filter(function (name) {
      for (var k = 0; k < excludedSheets.length; k++) {
        if (name.indexOf(excludedSheets[k]) !== -1) return false;
      }
      return true;
    });

    if (lastRow < 2) return { success: true, sheetName: sheet.getName(), allSheets: allSheets, teams: [] };

    var data = sheet.getRange(1, 1, Math.min(lastRow, 100), Math.min(sheet.getLastColumn(), 10)).getValues();
    var cols = detectTeamAndVJColumns(data);

    var teamsSet = {};
    var teamsList = [];

    for (var i = 0; i < lastRow; i++) {
      var val = sheet.getRange(i + 1, cols.teamCol + 1).getValue();
      val = val ? val.toString().trim() : '';
      if (val && !isHeaderOrReserved(val) && !teamsSet[val]) {
        teamsSet[val] = true;
        teamsList.push(val);
      }
    }
    return { success: true, sheetName: sheet.getName(), allSheets: allSheets, teams: teamsList };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getDateColumnIndex(sheet, dayNumber) {
  var dayNum = parseInt(dayNumber, 10);
  var maxCols = sheet.getLastColumn();
  var maxRowsScan = Math.min(sheet.getLastRow(), 5);

  if (maxCols >= 5) {
    var topRows = sheet.getRange(1, 1, maxRowsScan, maxCols).getValues();
    for (var r = 0; r < topRows.length; r++) {
      for (var c = 4; c < topRows[r].length; c++) {
        var cellVal = topRows[r][c];
        if (cellVal !== "" && cellVal !== null) {
          var strVal = cellVal.toString().trim();
          if (strVal == dayNum || strVal == ("0" + dayNum).slice(-2)) return c + 1;
        }
      }
    }
  }
  return 6 + dayNum;
}

function getMCNameFromTeamData(ss, teamName) {
  try {
    var teamDataSheet = ss.getSheetByName('Team Data');
    if (!teamDataSheet) return '';
    var lastRow = teamDataSheet.getLastRow();
    if (lastRow < 2) return '';

    var teamValues = teamDataSheet.getRange(1, 1, lastRow, 1).getValues();
    var mcValues = teamDataSheet.getRange(1, 6, lastRow, 1).getValues();

    for (var i = 0; i < lastRow; i++) {
      var rowTeam = teamValues[i][0] ? teamValues[i][0].toString().trim() : '';
      if (rowTeam === teamName.trim()) {
        var mcName = mcValues[i][0] ? mcValues[i][0].toString().trim() : '';
        if (mcName && !isHeaderOrReserved(mcName)) return mcName;
      }
    }
  } catch (err) { }
  return '';
}

function getVJsByTeam(teamName, date, targetSheetName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getTargetSheet(targetSheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) return { success: true, sheetName: sheet.getName(), mcName: '', vjs: [] };

    var detectedMC = getMCNameFromTeamData(ss, teamName);
    var dateColIndex = date ? getDateColumnIndex(sheet, date) : 7;
    var profilesMap = getVJProfilesMap();
    var fullData = sheet.getRange(1, 1, lastRow, Math.max(lastCol, dateColIndex)).getValues();
    var cols = detectTeamAndVJColumns(fullData);

    var mcTargetRow = findMCRowForTeam(fullData, cols, teamName);
    if (mcTargetRow > 0 && mcTargetRow <= lastRow) {
      var savedMCVal = fullData[mcTargetRow - 1][dateColIndex - 1];
      if (savedMCVal && savedMCVal.toString().trim() !== '' && !isHeaderOrReserved(savedMCVal.toString().trim())) {
        detectedMC = savedMCVal.toString().trim();
      }
    }

    var result = [];
    for (var i = 0; i < lastRow; i++) {
      var rowTeam = fullData[i][cols.teamCol] ? fullData[i][cols.teamCol].toString().trim() : '';
      var vjName = fullData[i][cols.vjCol] ? fullData[i][cols.vjCol].toString().trim() : '';

      if (isTotalRow(rowTeam) || isTotalRow(vjName)) continue;
      if (mcTargetRow > 0 && (i + 1) === mcTargetRow) continue;

      if ((!teamName || teamName === 'ALL' || rowTeam === teamName) && vjName !== '' && !isHeaderOrReserved(vjName)) {
        var val = fullData[i][dateColIndex - 1];
        var profile = profilesMap[vjName.toLowerCase()] || {};

        result.push({
          row: i + 1,
          vjName: vjName,
          teamName: rowTeam,
          tiktokId: profile.tiktokId || '-',
          profilePic: profile.profilePic || getDefaultAvatar(vjName),
          value: val !== null && val !== undefined ? val.toString().trim() : ''
        });
      }
    }
    return { success: true, sheetName: sheet.getName(), mcName: detectedMC, vjs: result };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function saveDailyData(payload) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheetName = payload.targetSheetName || payload.sheetName;
    var sheet = getTargetSheet(targetSheetName);
    var date = payload.date;
    var vjs = payload.vjs || [];
    var teamName = payload.teamName || '';
    var mcName = payload.mcName || 'MC';
    var dateColIndex = getDateColumnIndex(sheet, date);

    if (sheet.getMaxColumns() < dateColIndex) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), dateColIndex - sheet.getMaxColumns());
    }

    var totalDiamondInSubmission = 0;
    for (var i = 0; i < vjs.length; i++) {
      var item = vjs[i];
      if (item.row && item.row > 0) {
        var valToSave = item.value;
        if (valToSave !== '' && !isNaN(valToSave) && valToSave !== null) {
          var num = Number(valToSave);
          valToSave = num;
          totalDiamondInSubmission += num;
        }
        sheet.getRange(item.row, dateColIndex).setValue(valToSave);
      }
    }

    if (mcName && mcName.trim() !== '') {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var fullData = sheet.getRange(1, 1, Math.max(lastRow, 1), Math.max(lastCol, dateColIndex)).getValues();
      var cols = detectTeamAndVJColumns(fullData);
      var mcTargetRow = findMCRowForTeam(fullData, cols, teamName);

      if (mcTargetRow > 0) {
        sheet.getRange(mcTargetRow, dateColIndex).setValue(mcName.trim());
      }
    }

    logSubmissionRecord(ss, sheet.getName(), date, teamName, mcName, totalDiamondInSubmission);
    logSystemData('SAVE_DAILY_DIAMOND', mcName, sheet.getName(), 'บันทึกยอดทีม ' + teamName + ' (วันที่ ' + date + ') ยอดรวม ' + totalDiamondInSubmission.toLocaleString() + ' 💎', 'SUCCESS');

    return { success: true, message: 'บันทึกยอดลงชีต "' + sheet.getName() + '" เรียบร้อยแล้ว!' };
  } catch (err) {
    logSystemData('SAVE_DAILY_DIAMOND', payload.mcName || 'MC', targetSheetName || '-', 'เกิดข้อผิดพลาด: ' + err.toString(), 'FAILED');
    return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึก: ' + err.toString() };
  }
}

function logSubmissionRecord(ss, sheetName, dateNum, teamName, mcName, totalDiamonds) {
  try {
    var logSheet = ss.getSheetByName('Submission_Logs');
    if (!logSheet) {
      logSheet = ss.insertSheet('Submission_Logs');
      logSheet.appendRow(['Timestamp', 'Month_Sheet', 'Day', 'Team', 'Submitted_By_MC', 'Total_Diamonds', 'Status']);
    }
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    logSheet.appendRow([nowStr, sheetName, dateNum, teamName, mcName, totalDiamonds, 'ส่งยอดเรียบร้อย']);
  } catch (e) { }
}

function getSummaryData(targetSheetName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getTargetSheet(targetSheetName);

    if (!sheet) return { success: false, error: 'ไม่พบข้อมูลชีตประจำเดือนที่ระบุ' };

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    var allSheets = ss.getSheets().map(function (s) { return s.getName().trim(); }).filter(function (name) {
      return name.indexOf('Admin_Users') === -1 && name.indexOf('Team Data') === -1 && name.indexOf('MC_Schedule') === -1 && name.indexOf('KPI_Targets') === -1 && name.indexOf('vj mc all') === -1 && name.indexOf('Submission_Logs') === -1 && name.indexOf('System_Logs') === -1;
    });

    if (lastRow < 2) {
      return { success: true, sheetName: sheet.getName(), allSheets: allSheets, grandTotal: 0, teamsSummary: [], dailyTotals: {}, weeklyTotals: {}, topVJs: [], allVJsDetailed: [] };
    }

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var cols = detectTeamAndVJColumns(data);
    var profilesMap = getVJProfilesMap();
    var kpisMap = getKPIDataMap(sheet.getName());

    var dayCols = {};
    for (var c = Math.min(cols.vjCol + 1, 5); c < Math.min(lastCol, 60); c++) {
      for (var r = 0; r < Math.min(5, lastRow); r++) {
        var val = data[r][c];
        if (val !== null && val !== '') {
          var parsedDay = parseInt(val.toString().trim(), 10);
          if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
            if (!dayCols[parsedDay]) dayCols[parsedDay] = c;
          }
        }
      }
    }

    var teamsMap = {};
    var dailyTotals = {};
    for (var d = 1; d <= 31; d++) dailyTotals[d] = 0;

    var grandTotal = 0;
    var vjsList = [];

    for (var i = 1; i < lastRow; i++) {
      var teamName = data[i][cols.teamCol] ? data[i][cols.teamCol].toString().trim() : '';
      var vjName = data[i][cols.vjCol] ? data[i][cols.vjCol].toString().trim() : '';

      if (!teamName || isHeaderOrReserved(teamName) || isTotalRow(teamName)) continue;
      if (!vjName || isHeaderOrReserved(vjName) || isTotalRow(vjName)) continue;

      if (!teamsMap[teamName]) {
        teamsMap[teamName] = { teamName: teamName, totalDiamonds: 0, vjCount: 0, vjs: [] };
      }

      teamsMap[teamName].vjCount++;
      var vjTotal = 0;
      var activeDays = 0;

      for (var day = 1; day <= 31; day++) {
        if (dayCols[day] !== undefined) {
          var rawVal = data[i][dayCols[day]];
          var numVal = parseFloat((rawVal || '').toString().replace(/,/g, ''));
          if (!isNaN(numVal) && numVal > 0) {
            vjTotal += numVal;
            dailyTotals[day] += numVal;
            grandTotal += numVal;
            activeDays++;
          }
        }
      }

      teamsMap[teamName].totalDiamonds += vjTotal;

      var profile = profilesMap[vjName.toLowerCase()] || {};
      var targetDiamond = kpisMap[vjName.toLowerCase()] || 0;

      var vjInfo = {
        vjName: vjName,
        teamName: teamName,
        total: vjTotal,
        activeDays: activeDays,
        tiktokId: profile.tiktokId || '-',
        profilePic: profile.profilePic || getDefaultAvatar(vjName),
        targetDiamond: targetDiamond,
        kpiProgress: targetDiamond > 0 ? Math.min(Math.round((vjTotal / targetDiamond) * 100), 100) : 0
      };

      vjsList.push(vjInfo);
      teamsMap[teamName].vjs.push(vjInfo);
    }

    var teamsSummary = [];
    for (var key in teamsMap) teamsSummary.push(teamsMap[key]);
    teamsSummary.sort(function (a, b) { return b.totalDiamonds - a.totalDiamonds; });
    vjsList.sort(function (a, b) { return b.total - a.total; });

    return {
      success: true,
      sheetName: sheet.getName(),
      allSheets: allSheets,
      grandTotal: grandTotal,
      teamsSummary: teamsSummary,
      dailyTotals: dailyTotals,
      topVJs: vjsList.slice(0, 10),
      allVJsDetailed: vjsList
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function deleteKPITarget(row, userRole) {
  try {
    if (userRole && userRole.toString().toUpperCase() !== 'SUPER_ADMIN') {
      return { success: false, message: 'สิทธิ์ไม่พอ! เฉพาะ SUPER_ADMIN เท่านั้นที่สามารถลบรายการได้' };
    }
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('KPI_Targets');
    if (sheet && row > 1 && row <= sheet.getLastRow()) {
      sheet.deleteRow(row);
      logSystemData('DELETE_KPI', 'User (' + (userRole || 'ADMIN') + ')', 'KPI_Targets', 'ลบรายการ KPI แถวที่ ' + row, 'SUCCESS');
      return { success: true, message: 'ลบรายการ KPI เรียบร้อยแล้ว' };
    }
    return { success: false, message: 'ไม่พบรายการที่ต้องการลบ' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getKPIDataMap(monthName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('KPI_Targets');
    if (!sheet) return {};

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    var map = {};

    for (var i = 0; i < data.length; i++) {
      var vjName = data[i][0] ? data[i][0].toString().trim() : '';
      var target = parseFloat(data[i][1]) || 0;
      var month = data[i][4] ? data[i][4].toString().trim() : '';

      if (vjName && (!monthName || !month || month.toUpperCase() === monthName.toUpperCase())) {
        map[vjName.toLowerCase()] = target;
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

function getKPIData(monthFilter, teamFilter) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('KPI_Targets');
    if (!sheet) {
      sheet = ss.insertSheet('KPI_Targets');
      sheet.appendRow(['VJ_Name', 'Target_Diamond', 'UpdatedBy', 'UpdatedAt', 'month']);
    }

    var lastRow = sheet.getLastRow();
    var profilesMap = getVJProfilesMap();
    var activeSheetName = monthFilter || getTargetSheet().getName();
    var summaryData = getSummaryData(activeSheetName);

    var actualMap = {};
    var vjTeamMap = {};

    if (summaryData.success && summaryData.allVJsDetailed) {
      summaryData.allVJsDetailed.forEach(function (v) {
        actualMap[v.vjName.toLowerCase()] = v.total;
        vjTeamMap[v.vjName.toLowerCase()] = v.teamName;
      });
    }

    var kpis = [];
    if (lastRow >= 2) {
      var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
      for (var i = 0; i < data.length; i++) {
        var vjName = data[i][0] ? data[i][0].toString().trim() : '';
        var m = data[i][4] ? data[i][4].toString().trim() : '';
        var team = vjTeamMap[vjName.toLowerCase()] || '-';

        if (vjName && (!monthFilter || m.toUpperCase() === monthFilter.toUpperCase())) {
          if (!teamFilter || teamFilter === 'ALL' || team === teamFilter) {
            var profile = profilesMap[vjName.toLowerCase()] || {};
            var target = parseFloat(data[i][1]) || 0;
            var actual = actualMap[vjName.toLowerCase()] || 0;
            var progress = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;

            kpis.push({
              row: i + 2,
              vjName: vjName,
              teamName: team,
              targetDiamond: target,
              actualDiamond: actual,
              progress: progress,
              updatedBy: data[i][2] ? data[i][2].toString().trim() : '-',
              updatedAt: data[i][3] ? (data[i][3] instanceof Date ? Utilities.formatDate(data[i][3], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : data[i][3].toString()) : '-',
              month: m || '-',
              tiktokId: profile.tiktokId || '-',
              profilePic: profile.profilePic || getDefaultAvatar(vjName)
            });
          }
        }
      }
    }

    return { success: true, kpis: kpis };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function saveKPITarget(payload) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('KPI_Targets');
    if (!sheet) {
      sheet = ss.insertSheet('KPI_Targets');
      sheet.appendRow(['VJ_Name', 'Target_Diamond', 'UpdatedBy', 'UpdatedAt', 'month']);
    }

    var vjName = payload.vjName ? payload.vjName.trim() : '';
    var target = Number(payload.targetDiamond) || 0;
    var updatedBy = payload.updatedBy || 'Admin';
    var monthVal = payload.month || getTargetSheet().getName();
    var updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    if (!vjName) return { success: false, message: 'กรุณาระบุชื่อ VJ' };

    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    if (lastRow >= 2) {
      var existing = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
      for (var i = 0; i < existing.length; i++) {
        var exName = existing[i][0] ? existing[i][0].toString().trim().toLowerCase() : '';
        var exMonth = existing[i][4] ? existing[i][4].toString().trim().toLowerCase() : '';
        if (exName === vjName.toLowerCase() && exMonth === monthVal.toLowerCase()) {
          foundRow = i + 2;
          break;
        }
      }
    }

    if (foundRow > 1) {
      sheet.getRange(foundRow, 1, 1, 5).setValues([[vjName, target, updatedBy, updatedAt, monthVal]]);
      logSystemData('UPDATE_KPI', updatedBy, monthVal, 'อัปเดต KPI VJ: ' + vjName + ' เป็น ' + target.toLocaleString() + ' 💎', 'SUCCESS');
      return { success: true, message: 'อัปเดตเป้าหมาย KPI เรียบร้อยแล้ว!' };
    } else {
      sheet.appendRow([vjName, target, updatedBy, updatedAt, monthVal]);
      logSystemData('UPDATE_KPI', updatedBy, monthVal, 'เพิ่ม KPI VJ: ' + vjName + ' เป้าหมาย ' + target.toLocaleString() + ' 💎', 'SUCCESS');
      return { success: true, message: 'เพิ่มเป้าหมาย KPI ใหม่เรียบร้อยแล้ว!' };
    }
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.toString() };
  }
}

function saveBulkKPITargets(payloadArray) {
  try {
    if (!payloadArray || !payloadArray.length) return { success: false, message: 'ไม่มีข้อมูลสำหรับบันทึก' };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('KPI_Targets');
    if (!sheet) {
      sheet = ss.insertSheet('KPI_Targets');
      sheet.appendRow(['VJ_Name', 'Target_Diamond', 'UpdatedBy', 'UpdatedAt', 'month']);
    }

    var updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var lastRow = sheet.getLastRow();
    var existingData = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 5).getValues() : [];
    var updater = payloadArray[0].updatedBy || 'Admin';
    var targetMonth = payloadArray[0].month || getTargetSheet().getName();

    payloadArray.forEach(function (item) {
      var vjName = item.vjName ? item.vjName.trim() : '';
      var target = Number(item.targetDiamond) || 0;
      var updatedBy = item.updatedBy || 'Admin';
      var monthVal = item.month || getTargetSheet().getName();

      if (!vjName) return;

      var foundRow = -1;
      for (var i = 0; i < existingData.length; i++) {
        var exName = existingData[i][0] ? existingData[i][0].toString().trim().toLowerCase() : '';
        var exMonth = existingData[i][4] ? existingData[i][4].toString().trim().toLowerCase() : '';
        if (exName === vjName.toLowerCase() && exMonth === monthVal.toLowerCase()) {
          foundRow = i + 2;
          break;
        }
      }

      if (foundRow > 1) {
        sheet.getRange(foundRow, 1, 1, 5).setValues([[vjName, target, updatedBy, updatedAt, monthVal]]);
      } else {
        sheet.appendRow([vjName, target, updatedBy, updatedAt, monthVal]);
      }
    });

    logSystemData('UPDATE_KPI', updater, targetMonth, 'กระจาย KPI ทีมรวม ' + payloadArray.length + ' คน', 'SUCCESS');

    return { success: true, message: 'บันทึกเป้าหมาย KPI ประจำทีมเรียบร้อยแล้ว!' };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.toString() };
  }
}

function getSubmissionStatusData(targetSheetName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getTargetSheet(targetSheetName);
    if (!sheet) return { success: false, error: 'ไม่พบชีตประจำเดือน' };

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) return { success: true, teams: [], grid: {}, logs: [] };

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var cols = detectTeamAndVJColumns(data);

    var dayCols = {};
    for (var c = Math.min(cols.vjCol + 1, 5); c < Math.min(lastCol, 60); c++) {
      for (var r = 0; r < Math.min(5, lastRow); r++) {
        var val = data[r][c];
        if (val !== null && val !== '') {
          var parsedDay = parseInt(val.toString().trim(), 10);
          if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
            if (!dayCols[parsedDay]) dayCols[parsedDay] = c;
          }
        }
      }
    }

    var teamsSet = {};
    var teamDayData = {};

    for (var i = 1; i < lastRow; i++) {
      var teamName = data[i][cols.teamCol] ? data[i][cols.teamCol].toString().trim() : '';
      var vjName = data[i][cols.vjCol] ? data[i][cols.vjCol].toString().trim() : '';

      if (!teamName || isHeaderOrReserved(teamName) || isTotalRow(teamName)) continue;
      if (!vjName || isHeaderOrReserved(vjName) || isTotalRow(vjName)) continue;

      teamsSet[teamName] = true;
      if (!teamDayData[teamName]) teamDayData[teamName] = {};

      for (var d = 1; d <= 31; d++) {
        if (dayCols[d] !== undefined) {
          var cellVal = data[i][dayCols[d]];
          if (cellVal !== null && cellVal !== undefined && cellVal.toString().trim() !== '') {
            teamDayData[teamName][d] = true;
          }
        }
      }
    }

    var teamsList = Object.keys(teamsSet);

    var logs = [];
    var logSheet = ss.getSheetByName('Submission_Logs');
    if (logSheet && logSheet.getLastRow() >= 2) {
      var logData = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 7).getValues();
      for (var l = logData.length - 1; l >= Math.max(0, logData.length - 30); l--) {
        logs.push({
          timestamp: logData[l][0] ? (logData[l][0] instanceof Date ? Utilities.formatDate(logData[l][0], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : logData[l][0].toString()) : '-',
          month: logData[l][1] ? logData[l][1].toString() : '-',
          day: logData[l][2] ? logData[l][2].toString() : '-',
          team: logData[l][3] ? logData[l][3].toString() : '-',
          mc: logData[l][4] ? logData[l][4].toString() : '-',
          total: logData[l][5] ? Number(logData[l][5]).toLocaleString() : '0'
        });
      }
    }

    return {
      success: true,
      sheetName: sheet.getName(),
      teams: teamsList,
      grid: teamDayData,
      logs: logs
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function createGoogleDocReport(targetSheetName, userName) {
  try {
    var summaryData = getSummaryData(targetSheetName);
    if (!summaryData.success) return { success: false, error: summaryData.error };

    var docTitle = 'รายงานสรุปผลการปฏิบัติงาน ACE LIVE - ' + summaryData.sheetName;
    var doc = DocumentApp.create(docTitle);
    var body = doc.getBody();

    body.setMarginTop(36);
    body.setMarginBottom(36);
    body.setMarginLeft(36);
    body.setMarginRight(36);

    var pTitle = body.appendParagraph('ACE LIVE TRACKING');
    pTitle.setHeading(DocumentApp.Heading.HEADING1);
    pTitle.setFontFamily('Arial');

    var pSub = body.appendParagraph('รายงานสรุปผลการปฏิบัติงาน และยอด Diamond ประจำเดือน: ' + summaryData.sheetName + ' / 直播数据汇总报告');
    pSub.setHeading(DocumentApp.Heading.HEADING2);

    body.appendParagraph('ผู้ออกรายงาน: ' + (userName || 'Admin') + ' | วันที่สร้างเอกสาร: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm น.'));
    body.appendParagraph('------------------------------------------------------------------------------------------------------------------------');

    body.appendParagraph('สรุปตัวเลขสำคัญ (Executive Summary / 核心数据摘要):').setBold(true);
    var summaryTable = body.appendTable();
    var sRow = summaryTable.appendTableRow();
    sRow.appendTableCell('💎 ยอด Diamond รวมทั้งหมด (Diamond 总计):
' + summaryData.grandTotal.toLocaleString() + ' 💎').setBackgroundColor('#f8fafc');
    sRow.appendTableCell('🏆 ทีมอันดับ 1 (第一名团队):
' + (summaryData.teamsSummary.length > 0 ? summaryData.teamsSummary[0].teamName : '-')).setBackgroundColor('#f8fafc');
    sRow.appendTableCell('👑 VJ MVP (MVP 主播):
' + (summaryData.topVJs.length > 0 ? summaryData.topVJs[0].vjName : '-')).setBackgroundColor('#f8fafc');

    body.appendParagraph('
1. สรุปผลการดำเนินงานแยกตามทีม (Team Performance Summary / 团队业绩汇总):').setBold(true);
    var teamTable = body.appendTable();
    var tHeader = teamTable.appendTableRow();
    tHeader.appendTableCell('#').setBackgroundColor('#0f172a');
    tHeader.appendTableCell('ทีม / 团队').setBackgroundColor('#0f172a');
    tHeader.appendTableCell('จำนวน VJ / 主播人数').setBackgroundColor('#0f172a');
    tHeader.appendTableCell('ยอดรวม / Diamond 总计').setBackgroundColor('#0f172a');
    tHeader.appendTableCell('เฉลี่ยต่อคน / 人均').setBackgroundColor('#0f172a');
    tHeader.appendTableCell('สัดส่วน / 占比 (%)').setBackgroundColor('#0f172a');

    summaryData.teamsSummary.forEach(function (t, idx) {
      var row = teamTable.appendTableRow();
      row.appendTableCell('#' + (idx + 1));
      row.appendTableCell(t.teamName);
      row.appendTableCell(t.vjCount + ' คน');
      row.appendTableCell(t.totalDiamonds.toLocaleString() + ' 💎');
      row.appendTableCell((t.vjCount > 0 ? Math.round(t.totalDiamonds / t.vjCount) : 0).toLocaleString());
      row.appendTableCell((summaryData.grandTotal > 0 ? ((t.totalDiamonds / summaryData.grandTotal) * 100).toFixed(1) : 0) + '%');
    });

    doc.saveAndClose();
    var file = DriveApp.getFileById(doc.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    logSystemData('CREATE_DOC_REPORT', userName, summaryData.sheetName, 'สร้างรายงาน Google Docs 2 ภาษา: ' + docTitle, 'SUCCESS');

    return {
      success: true,
      docUrl: doc.getUrl(),
      docId: doc.getId(),
      title: docTitle
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getMultiMonthSummaryData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets();

    var monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    var validMonthSheets = [];

    for (var i = 0; i < sheets.length; i++) {
      var sName = sheets[i].getName().trim();
      var upperName = sName.toUpperCase();

      var matchedMonthIdx = -1;
      for (var m = 0; m < monthNames.length; m++) {
        if (upperName.indexOf(monthNames[m]) !== -1) {
          matchedMonthIdx = m;
          break;
        }
      }

      if (matchedMonthIdx !== -1) {
        var yearMatch = sName.match(/\d{4}/);
        var yearVal = yearMatch ? parseInt(yearMatch[0], 10) : 2026;
        validMonthSheets.push({ sheet: sheets[i], name: sName, monthIdx: matchedMonthIdx, year: yearVal });
      }
    }

    if (validMonthSheets.length === 0) {
      return { success: false, error: 'ไม่พบชีตประจำเดือนใน Spreadsheet' };
    }

    validMonthSheets.sort(function (a, b) {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIdx - b.monthIdx;
    });

    var sortedMonthNames = validMonthSheets.map(function (item) { return item.name; });
    var profilesMap = getVJProfilesMap();

    var monthTeamTotals = {};
    var monthVJTotals = {};
    var allVJsMap = {};
    var allTeamsSet = {};

    validMonthSheets.forEach(function (mObj) {
      var sheet = mObj.sheet;
      var mName = mObj.name;
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();

      monthTeamTotals[mName] = {};
      monthVJTotals[mName] = {};

      if (lastRow < 2) return;

      var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var cols = detectTeamAndVJColumns(data);

      var dayCols = [];
      for (var c = Math.min(cols.vjCol + 1, 5); c < Math.min(lastCol, 60); c++) {
        for (var r = 0; r < Math.min(5, lastRow); r++) {
          var val = data[r][c];
          if (val !== null && val !== '') {
            var parsedDay = parseInt(val.toString().trim(), 10);
            if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
              dayCols.push(c);
              break;
            }
          }
        }
      }

      for (var r = 1; r < lastRow; r++) {
        var teamName = data[r][cols.teamCol] ? data[r][cols.teamCol].toString().trim() : '';
        var vjName = data[r][cols.vjCol] ? data[r][cols.vjCol].toString().trim() : '';

        if (!teamName || isHeaderOrReserved(teamName) || isTotalRow(teamName)) continue;
        if (!vjName || isHeaderOrReserved(vjName) || isTotalRow(vjName)) continue;

        allTeamsSet[teamName] = true;

        var vjTotal = 0;
        dayCols.forEach(function (cIdx) {
          var rawVal = data[r][cIdx];
          var numVal = parseFloat((rawVal || '').toString().replace(/,/g, ''));
          if (!isNaN(numVal) && numVal > 0) vjTotal += numVal;
        });

        if (!monthTeamTotals[mName][teamName]) monthTeamTotals[mName][teamName] = 0;
        monthTeamTotals[mName][teamName] += vjTotal;

        var vjKey = vjName.toLowerCase();
        monthVJTotals[mName][vjKey] = { vjName: vjName, teamName: teamName, diamonds: vjTotal };

        if (!allVJsMap[vjKey]) {
          var profile = profilesMap[vjKey] || {};
          allVJsMap[vjKey] = {
            vjName: vjName,
            tiktokId: profile.tiktokId || '-',
            profilePic: profile.profilePic || getDefaultAvatar(vjName),
            teamsHistory: {},
            monthlyDiamonds: {}
          };
        }

        allVJsMap[vjKey].teamsHistory[mName] = teamName;
        allVJsMap[vjKey].monthlyDiamonds[mName] = vjTotal;
      }
    });

    var teamsList = Object.keys(allTeamsSet);
    var teamsMultiSummary = teamsList.map(function (tName) {
      var monthlyData = [];
      var cumulativeTotal = 0;

      for (var m = 0; m < sortedMonthNames.length; m++) {
        var mName = sortedMonthNames[m];
        var currDiamond = monthTeamTotals[mName][tName] || 0;
        cumulativeTotal += currDiamond;

        var momPercent = 0;
        if (m > 0) {
          var prevName = sortedMonthNames[m - 1];
          var prevDiamond = monthTeamTotals[prevName][tName] || 0;
          if (prevDiamond > 0) momPercent = ((currDiamond - prevDiamond) / prevDiamond) * 100;
          else if (currDiamond > 0) momPercent = 100;
        }

        monthlyData.push({ monthName: mName, diamonds: currDiamond, momPercent: Math.round(momPercent * 10) / 10 });
      }

      return { teamName: tName, cumulativeTotal: cumulativeTotal, monthlyData: monthlyData };
    });

    var transferredVJsList = [];
    var transferredCount = 0;
    var newVJCount = 0;
    var grandTotalAllMonths = 0;

    var monthlyGrandTotals = {};
    sortedMonthNames.forEach(function (mName) { monthlyGrandTotals[mName] = 0; });

    var vjsMultiSummary = Object.keys(allVJsMap).map(function (vKey) {
      var vj = allVJsMap[vKey];
      var monthlyData = [];
      var cumulativeTotal = 0;

      var firstActiveMonthIdx = -1;
      for (var m = 0; m < sortedMonthNames.length; m++) {
        var mName = sortedMonthNames[m];
        if (vj.teamsHistory[mName]) {
          firstActiveMonthIdx = m;
          break;
        }
      }

      var latestMonthIdx = sortedMonthNames.length - 1;
      var latestMonthName = sortedMonthNames[latestMonthIdx];
      var currentTeam = vj.teamsHistory[latestMonthName] || Object.values(vj.teamsHistory).pop() || '-';

      var transfersHistory = [];
      var lastActiveTeam = null;

      for (var m = 0; m < sortedMonthNames.length; m++) {
        var mName = sortedMonthNames[m];
        var currDiamond = vj.monthlyDiamonds[mName] || 0;
        var activeTeamInMonth = vj.teamsHistory[mName];

        cumulativeTotal += currDiamond;
        monthlyGrandTotals[mName] += currDiamond;

        var momPercent = 0;
        if (m > 0) {
          var prevName = sortedMonthNames[m - 1];
          var prevDiamond = vj.monthlyDiamonds[prevName] || 0;
          if (prevDiamond > 0) momPercent = ((currDiamond - prevDiamond) / prevDiamond) * 100;
          else if (currDiamond > 0) momPercent = 100;
        }

        monthlyData.push({
          monthName: mName,
          diamonds: currDiamond,
          teamName: activeTeamInMonth || '-',
          momPercent: Math.round(momPercent * 10) / 10
        });

        if (activeTeamInMonth) {
          if (lastActiveTeam && lastActiveTeam.toLowerCase() !== activeTeamInMonth.toLowerCase()) {
            transfersHistory.push({
              from: lastActiveTeam,
              to: activeTeamInMonth,
              detail: lastActiveTeam + ' ➔ ' + activeTeamInMonth
            });
          }
          lastActiveTeam = activeTeamInMonth;
        }
      }

      grandTotalAllMonths += cumulativeTotal;

      var tags = [];
      var tagCN = [];
      var isTransferred = transfersHistory.length > 0;
      var transferDetail = '';

      if (firstActiveMonthIdx === latestMonthIdx && latestMonthIdx >= 0) {
        newVJCount++;
        tags.push('NEW VJ (VJ ใหม่)');
        tagCN.push('新主播');
      }

      if (isTransferred) {
        transferredCount++;
        var transferDetailsList = transfersHistory.map(function (t) { return t.detail; });
        var transferCNList = transfersHistory.map(function (t) { return '从 ' + t.from + ' 换到 ' + t.to; });

        transferDetail = transferDetailsList.join(', ');
        tags.push('ย้ายทีม: ' + transferDetail);
        tagCN.push(transferCNList.join(', '));
      }

      var noteTH = tags.length > 0 ? tags.join(' | ') : 'ปกติ';
      var noteCN = tagCN.length > 0 ? tagCN.join(' | ') : '正常';

      var vjObj = {
        vjName: vj.vjName,
        tiktokId: vj.tiktokId,
        profilePic: vj.profilePic,
        currentTeam: currentTeam,
        cumulativeTotal: cumulativeTotal,
        monthlyData: monthlyData,
        isNewVJ: firstActiveMonthIdx === latestMonthIdx,
        isTransferred: isTransferred,
        transferDetail: transferDetail,
        noteTH: noteTH,
        noteCN: noteCN,
        noteBilingual: noteTH + (tagCN.length > 0 ? ' (' + noteCN + ')' : '')
      };

      if (isTransferred) transferredVJsList.push(vjObj);

      return vjObj;
    });

    vjsMultiSummary.sort(function (a, b) { return b.cumulativeTotal - a.cumulativeTotal; });
    teamsMultiSummary.sort(function (a, b) { return b.cumulativeTotal - a.cumulativeTotal; });
    transferredVJsList.sort(function (a, b) { return b.cumulativeTotal - a.cumulativeTotal; });

    return {
      success: true,
      monthsList: sortedMonthNames,
      teamsSummary: teamsMultiSummary,
      vjsSummary: vjsMultiSummary,
      transferredVJsList: transferredVJsList,
      grandTotalAllMonths: grandTotalAllMonths,
      monthlyGrandTotals: monthlyGrandTotals,
      transferredCount: transferredCount,
      newVJCount: newVJCount
    };

  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * ดึงสถานะการส่งยอดประจำวัน โดยตัดรอบเวลาอัปเดตรอบวันใหม่ที่เวลา 08:00 น.
 */
function getTodaySubmissionAlert() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getTargetSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    // คำนวณวันที่ตามรอบเวลาตัดรอบ 08.00 น. (หากยังไม่ถึง 08.00 น. ให้นับเป็นวันก่อนหน้า)
    var now = new Date();
    if (now.getHours() < 8) {
      now.setDate(now.getDate() - 1);
    }
    var todayNum = now.getDate();

    if (lastRow < 2) return { success: true, pendingTeams: [], submittedTeams: [], day: todayNum, sheetName: sheet.getName(), updateTime: "08:00" };

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var cols = detectTeamAndVJColumns(data);
    var dateColIndex = getDateColumnIndex(sheet, todayNum);

    var teamsSet = {};
    var teamSubmittedMap = {};

    for (var i = 1; i < lastRow; i++) {
      var teamName = data[i][cols.teamCol] ? data[i][cols.teamCol].toString().trim() : '';
      var vjName = data[i][cols.vjCol] ? data[i][cols.vjCol].toString().trim() : '';

      if (!teamName || isHeaderOrReserved(teamName) || isTotalRow(teamName)) continue;
      if (!vjName || isHeaderOrReserved(vjName) || isTotalRow(vjName)) continue;

      teamsSet[teamName] = true;
      if (teamSubmittedMap[teamName] === undefined) teamSubmittedMap[teamName] = false;

      var cellVal = data[i][dateColIndex - 1];
      if (cellVal !== null && cellVal !== undefined && cellVal.toString().trim() !== '') {
        teamSubmittedMap[teamName] = true;
      }
    }

    var pendingTeams = [];
    var submittedTeams = [];

    for (var team in teamsSet) {
      if (teamSubmittedMap[team]) {
        submittedTeams.push(team);
      } else {
        pendingTeams.push(team);
      }
    }

    return {
      success: true,
      sheetName: sheet.getName(),
      day: todayNum,
      pendingTeams: pendingTeams,
      submittedTeams: submittedTeams,
      updateTime: "08:00"
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
