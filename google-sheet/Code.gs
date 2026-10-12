/**
 * COFFEE DNA 응답 수집용 Google Apps Script.
 * 설치 방법은 README.md의 "구글 시트 연결"을 따르세요.
 *  1) 이 내용을 Apps Script 편집기에 붙여 넣고 저장
 *  2) setup 함수를 한 번 실행 (응답·통계 탭 생성)
 *  3) 배포 > 새 배포 > 웹 앱 (실행: 나, 액세스: 모든 사용자)
 */

var RESPONSES = '응답';
var STATS = '통계';
var BRANDS = ['모리티아', '사이드템포'];
var CODES = ['BFPE', 'BFPR', 'BFSE', 'BFSR', 'BNPE', 'BNPR', 'BNSE', 'BNSR', 'MFPE', 'MFPR', 'MFSE', 'MFSR', 'MNPE', 'MNPR', 'MNSE', 'MNSR'];
var HEADERS = ['ID', '브랜드', '상태', '날짜', '시작 시각', '종료 시각', '종료 사유', '마지막 문항', '응답 문항 수', '유형 코드', '유형 이름',
  'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', '버전'];
var TZ = 'Asia/Seoul';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse(e.postData.contents);
    if (!isValid(data)) return reply({ ok: false, error: 'invalid' });
    lock.waitLock(20000);
    var sheet = responsesSheet();
    var started = new Date(data.startedAt), ended = new Date(data.endedAt);
    var row = [data.id, data.brand, data.status,
      // 날짜는 기간 조건에 쓰이므로 글자가 아닌 날짜 값으로 넣습니다(한국 시간 자정).
      new Date(Utilities.formatDate(started, TZ, "yyyy-MM-dd'T'00:00:00") + '+09:00'),
      Utilities.formatDate(started, TZ, 'yyyy-MM-dd HH:mm:ss'),
      Utilities.formatDate(ended, TZ, 'yyyy-MM-dd HH:mm:ss'),
      data.reason, data.lastQuestion, data.answered, data.code, data.typeName]
      .concat(data.answers).concat([data.version]);
    // 같은 ID가 다시 오면(재전송) 새 줄을 만들지 않습니다. 완료된 줄은 미완료로 덮어쓰지 않습니다.
    var found = sheet.getRange('A:A').createTextFinder(data.id).matchEntireCell(true).findNext();
    if (!found) sheet.appendRow(row);
    else if (!(sheet.getRange(found.getRow(), 3).getValue() === '완료' && data.status !== '완료')) {
      sheet.getRange(found.getRow(), 1, 1, row.length).setValues([row]);
    }
    return reply({ ok: true });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function doGet() { return reply({ ok: true, message: 'COFFEE DNA 응답 수집 주소입니다.' }); }

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function isValid(data) {
  var text = function (value, max) { return typeof value === 'string' && value.length <= max; };
  return data && /^[0-9a-f-]{36}$/.test(data.id) && BRANDS.indexOf(data.brand) >= 0
    && (data.status === '완료' || data.status === '미완료')
    && !isNaN(new Date(data.startedAt)) && !isNaN(new Date(data.endedAt))
    && text(data.reason, 20) && text(data.code, 4) && text(data.typeName, 60) && text(data.version, 40)
    && Number(data.lastQuestion) >= 1 && Number(data.lastQuestion) <= 10
    && Number(data.answered) >= 0 && Number(data.answered) <= 10
    && Array.isArray(data.answers) && data.answers.length === 10
    && data.answers.every(function (a) { return ['A', 'B', '건너뜀', ''].indexOf(a) >= 0; });
}

function responsesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RESPONSES);
  if (!sheet) {
    sheet = ss.insertSheet(RESPONSES, 0);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('D:D').setNumberFormat('yyyy-mm-dd');
  }
  return sheet;
}

/** 한 번만 실행: 응답 탭과 통계 탭을 만듭니다. 다시 실행하면 통계 탭만 새로 그립니다(응답은 그대로). */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);
  responsesSheet();
  var old = ss.getSheetByName(STATS);
  if (old) ss.deleteSheet(old);
  var s = ss.insertSheet(STATS, 0);
  var R = "'" + RESPONSES + "'!";
  // 기간 조건이 붙은 COUNTIFS. extra는 '범위,조건' 쌍을 이어 붙인 문자열입니다.
  var count = function (brandCell, extra) {
    return '=COUNTIFS(' + R + '$B:$B,' + brandCell + ',' + R + '$D:$D,">="&$B$3,' + R + '$D:$D,"<="&$B$4' + (extra ? ',' + extra : '') + ')';
  };
  var col = function (i) { return String.fromCharCode(66 + i); }; // B, C

  s.getRange('A1').setValue('COFFEE DNA 통계').setFontSize(16).setFontWeight('bold');
  s.getRange('A2').setValue('기간을 바꾸면 아래 숫자가 모두 다시 계산됩니다. 테스트 시작일(한국 시간) 기준, 테스트 횟수입니다.');
  s.getRange('A3:B4').setValues([['시작일', new Date(2026, 0, 1)], ['종료일', new Date(2099, 11, 31)]]);
  s.getRange('B3:B4').setNumberFormat('yyyy-mm-dd').setBackground('#fff2cc');

  var row = 6;
  var title = function (text) {
    s.getRange(row, 1).setValue(text).setFontWeight('bold').setFontSize(12);
    s.getRange(row + 1, 1, 1, 3).setValues([['', BRANDS[0], BRANDS[1]]]).setFontWeight('bold').setBackground('#eeeeee');
    row += 2;
  };

  title('참여 현황');
  var headerRow = row - 1;
  var summary = [['시작', ''], ['완료', R + '$C:$C,"완료"'], ['미완료', R + '$C:$C,"미완료"']];
  summary.forEach(function (item) {
    s.getRange(row, 1).setValue(item[0]);
    BRANDS.forEach(function (_, i) { s.getRange(row, 2 + i).setFormula(count(col(i) + '$' + headerRow, item[1])); });
    row++;
  });
  s.getRange(row, 1).setValue('완료율');
  BRANDS.forEach(function (_, i) {
    s.getRange(row, 2 + i).setFormula('=IF(' + col(i) + (row - 3) + '=0,"",' + col(i) + (row - 2) + '/' + col(i) + (row - 3) + ')').setNumberFormat('0.0%');
  });
  row += 2;

  title('유형 분포 (완료)');
  headerRow = row - 1;
  CODES.forEach(function (code) {
    s.getRange(row, 1).setValue(code);
    BRANDS.forEach(function (_, i) { s.getRange(row, 2 + i).setFormula(count(col(i) + '$' + headerRow, R + '$J:$J,$A' + row)); });
    row++;
  });
  row++;

  title('이탈 문항 (미완료가 멈춘 문항)');
  headerRow = row - 1;
  for (var q = 1; q <= 10; q++) {
    s.getRange(row, 1).setValue(q);
    BRANDS.forEach(function (_, i) { s.getRange(row, 2 + i).setFormula(count(col(i) + '$' + headerRow, R + '$C:$C,"미완료",' + R + '$H:$H,$A' + row)); });
    s.getRange(row, 1).setNumberFormat('"Q"0');
    row++;
  }
  row++;

  title('미완료 종료 사유');
  headerRow = row - 1;
  ['처음으로', '시간 초과', '페이지 이탈'].forEach(function (reason) {
    s.getRange(row, 1).setValue(reason);
    BRANDS.forEach(function (_, i) { s.getRange(row, 2 + i).setFormula(count(col(i) + '$' + headerRow, R + '$C:$C,"미완료",' + R + '$G:$G,$A' + row)); });
    row++;
  });
  row++;

  // 문항별 선택: 브랜드마다 A / B / 건너뜀
  s.getRange(row, 1).setValue('문항별 선택 (완료)').setFontWeight('bold').setFontSize(12);
  row++;
  var head = ['문항'];
  BRANDS.forEach(function (brand) { ['A', 'B', '건너뜀'].forEach(function (choice) { head.push(brand + ' ' + choice); }); });
  s.getRange(row, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#eeeeee');
  row++;
  for (var n = 1; n <= 10; n++) {
    s.getRange(row, 1).setValue('Q' + n);
    var answerColumn = String.fromCharCode(75 + n); // L = Q1
    BRANDS.forEach(function (brand, i) {
      ['A', 'B', '건너뜀'].forEach(function (choice, j) {
        s.getRange(row, 2 + i * 3 + j).setFormula(count('"' + brand + '"', R + '$C:$C,"완료",' + R + '$' + answerColumn + ':$' + answerColumn + ',"' + choice + '"'));
      });
    });
    row++;
  }
  s.setColumnWidth(1, 230);
  s.setFrozenRows(4);
}
