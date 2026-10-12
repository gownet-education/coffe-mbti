/**
 * COFFEE DNA 응답 수집용 Google Apps Script.
 * 설치 방법은 README.md의 "구글 시트 연결"을 따르세요.
 *  1) 이 내용을 Apps Script 편집기에 붙여 넣고 저장
 *  2) setup 함수를 실행 (응답·통계 탭 생성. 다시 실행하면 통계 탭만 새로 그림)
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

/** 응답 탭과 통계 탭을 만듭니다. 다시 실행하면 통계 탭만 새로 그립니다(응답은 그대로). */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);
  responsesSheet();
  var old = ss.getSheetByName(STATS);
  if (old) ss.deleteSheet(old);
  var s = ss.insertSheet(STATS, 0);
  s.setHiddenGridlines(true);

  var R = "'" + RESPONSES + "'!";
  var INK = '#2b2a27', MUTED = '#8a857b', LINE = '#e4dfd5', BAND = '#faf8f3', INPUT = '#fff4cf';
  var THEME = [{ name: BRANDS[0], color: '#6b3f35', soft: '#f3e9e4' }, { name: BRANDS[1], color: '#3d4a45', soft: '#e7ecea' }];
  var SOLID = SpreadsheetApp.BorderStyle.SOLID, MEDIUM = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  // 열: A 여백 | B 항목 | C·D·E 모리티아(횟수·비율·막대) | F·G·H 사이드템포 | I 합계 | J 여백
  var COUNT = ['C', 'F'], WIDE = 8;
  [18, 220, 80, 70, 150, 80, 70, 150, 80, 18].forEach(function (width, i) { s.setColumnWidth(i + 1, width); });
  s.getRange(1, 1, 120, 10).setFontFamily('Arial').setFontSize(10).setFontColor(INK).setVerticalAlignment('middle');

  // 기간 조건이 붙은 COUNTIFS. extra는 '범위,조건' 쌍을 이어 붙인 문자열입니다.
  var count = function (brand, extra) {
    return 'COUNTIFS(' + R + '$B:$B,"' + brand + '",' + R + '$D:$D,">="&$C$4,' + R + '$D:$D,"<="&$F$4' + (extra ? ',' + extra : '') + ')';
  };
  var done = R + '$C:$C,"완료"', undone = R + '$C:$C,"미완료"';

  // 머리말
  s.getRange(2, 2, 1, WIDE).merge().setValue('COFFEE DNA 통계').setFontSize(20).setFontWeight('bold');
  s.getRange(3, 2, 1, WIDE).merge().setValue('테스트 시작일(한국 시간) 기준 · 사람 수가 아닌 테스트 횟수 · 노란 칸의 날짜를 바꾸면 전체가 다시 계산됩니다').setFontColor(MUTED);
  s.getRange('B4').setValue('기간').setFontWeight('bold');
  s.getRange('C4:D4').merge().setValue(new Date(2026, 0, 1));
  s.getRange('E4').setValue('부터').setFontColor(MUTED).setHorizontalAlignment('center');
  s.getRange('F4:G4').merge().setValue(new Date(2099, 11, 31));
  s.getRange('H4').setValue('까지').setFontColor(MUTED);
  s.getRange('C4:D4').setBackground(INPUT);
  s.getRange('F4:G4').setBackground(INPUT);
  s.getRange('C4:G4').setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center').setFontWeight('bold');
  s.getRange('E4').setFontWeight('normal');
  s.setRowHeight(2, 42);
  s.setRowHeight(4, 30);
  s.setFrozenRows(4);

  var row = 6;

  var section = function (title, note) {
    s.getRange(row, 2).setValue(title).setFontSize(13).setFontWeight('bold');
    if (note) s.getRange(row, 3, 1, WIDE - 1).merge().setValue(note).setFontColor(MUTED).setHorizontalAlignment('right');
    s.getRange(row, 2, 1, WIDE).setBorder(null, null, true, null, null, null, INK, MEDIUM);
    s.setRowHeight(row, 34);
    row++;
  };

  // 머리글 두 줄: 브랜드 이름 / 세부 항목. total이 참이면 합계 열도 그립니다.
  var head = function (label, sub, total) {
    s.getRange(row, 2, 2, 1).merge().setValue(label).setFontColor(MUTED);
    THEME.forEach(function (brand, i) {
      s.getRange(row, 3 + i * 3, 1, 3).merge().setValue(brand.name).setBackground(brand.color).setFontColor('#ffffff');
      s.getRange(row + 1, 3 + i * 3, 1, 3).setValues([sub]).setBackground(brand.soft);
    });
    if (total) {
      s.getRange(row, 9).setValue('합계').setBackground(INK).setFontColor('#ffffff');
      s.getRange(row + 1, 9).setValue('횟수').setBackground('#ecebe8');
    }
    s.getRange(row, 3, 2, 7).setFontWeight('bold').setHorizontalAlignment('center');
    row += 2;
  };

  // 한 줄: 항목 | 브랜드별 횟수·비율·막대 | 합계.
  // base: 비율의 분모가 되는 셀 주소(브랜드별). from~to: 막대 길이를 비교할 줄 범위.
  var line = function (label, extra, base, from, to) {
    s.getRange(row, 2).setValue(label);
    THEME.forEach(function (brand, i) {
      var c = COUNT[i], cell = c + row, range = c + '$' + from + ':' + c + '$' + to;
      s.getRange(row, 3 + i * 3).setFormula('=' + count(brand.name, extra));
      if (base) s.getRange(row, 4 + i * 3).setFormula('=IF(' + base[i] + '=0,"",' + cell + '/' + base[i] + ')').setNumberFormat('0%').setFontColor(MUTED);
      s.getRange(row, 5 + i * 3).setFormula('=IF(' + cell + '=0,"",SPARKLINE(' + cell + ',{"charttype","bar";"max",MAX(1,' + range + ');"color1","' + brand.color + '"}))');
    });
    s.getRange(row, 9).setFormula('=C' + row + '+F' + row).setFontWeight('bold');
    row++;
  };

  // 표 마무리: 줄 높이, 가운데 정렬, 줄무늬, 가로선
  var finish = function (from, group) {
    var size = row - from;
    s.getRange(from, 2, size, WIDE).setBorder(null, null, true, null, null, true, LINE, SOLID);
    s.getRange(from, 3, size, 7).setHorizontalAlignment('center');
    for (var r = from; r < row; r++) {
      s.setRowHeight(r, 26);
      if (Math.floor((r - from) / group) % 2) s.getRange(r, 2, 1, WIDE).setBackground(BAND);
    }
    row += 2;
  };

  var table = function (items, base) { // items: [[항목, extra], ...]
    var from = row, to = row + items.length - 1;
    items.forEach(function (item) { line(item[0], item[1], base, from, to); });
    finish(from, 1);
    return from;
  };

  // 1. 참여 현황
  section('참여 현황');
  head('구분', ['횟수', '비율', ''], true);
  var top = row;
  var starts = ['$C$' + top, '$F$' + top];
  var dones = ['$C$' + (top + 1), '$F$' + (top + 1)], undones = ['$C$' + (top + 2), '$F$' + (top + 2)];
  table([['시작', ''], ['완료', done], ['미완료', undone]], starts);
  s.getRange(top, 4).clearContent();
  s.getRange(top, 7).clearContent();

  // 2. 취향 분포: 결과 코드의 각 자리(바디·풍미·달콤함·스타일)를 셉니다.
  section('취향 분포', '완료한 테스트의 결과 기준 · 취향마다 두 쪽의 합이 100%');
  head('취향', ['횟수', '비율', ''], true);
  var AXES = [
    ['바디', '진한 커피 (BOLD)', 'B???', '부드러운 커피 (MELLOW)', 'M???'],
    ['풍미', '산미·과일향 (FRUITY)', '?F??', '고소·초콜릿향 (NUTTY)', '?N??'],
    ['달콤함', '커피 본연의 맛 (PURE)', '??P?', '달콤한 맛 (SWEET)', '??S?'],
    ['스타일', '새로운 메뉴 (EXPLORER)', '???E', '익숙한 메뉴 (ROUTINE)', '???R']
  ];
  var axisFrom = row;
  AXES.forEach(function (axis) {
    var pair = row;
    line(axis[0] + ' · ' + axis[1], done + ',' + R + '$J:$J,"' + axis[2] + '"', dones, pair, pair + 1);
    line(axis[0] + ' · ' + axis[3], done + ',' + R + '$J:$J,"' + axis[4] + '"', dones, pair, pair + 1);
  });
  finish(axisFrom, 2);

  // 3. 유형 분포
  section('유형 분포', '완료한 테스트 기준');
  head('유형 코드', ['횟수', '비율', ''], true);
  table(CODES.map(function (code) { return [code, done + ',' + R + '$J:$J,"' + code + '"']; }), dones);

  // 4. 이탈 문항
  section('이탈 문항', '미완료 테스트가 멈춘 문항');
  head('문항', ['횟수', '비율', ''], true);
  var quits = [];
  for (var q = 1; q <= 10; q++) quits.push(['Q' + q, undone + ',' + R + '$H:$H,' + q]);
  table(quits, undones);

  // 5. 미완료 사유
  section('미완료 사유');
  head('사유', ['횟수', '비율', ''], true);
  table(['처음으로', '시간 초과', '페이지 이탈'].map(function (reason) { return [reason, undone + ',' + R + '$G:$G,"' + reason + '"']; }), undones);

  // 6. 문항별 선택: 브랜드마다 A · B · 건너뜀
  section('문항별 선택', '완료한 테스트 기준');
  head('문항', ['A', 'B', '건너뜀'], false);
  var choiceFrom = row;
  for (var n = 1; n <= 10; n++) {
    s.getRange(row, 2).setValue('Q' + n);
    var letter = String.fromCharCode(75 + n); // L열 = Q1
    var answers = R + '$' + letter + ':$' + letter;
    THEME.forEach(function (brand, i) {
      ['A', 'B', '건너뜀'].forEach(function (choice, j) {
        s.getRange(row, 3 + i * 3 + j).setFormula('=' + count(brand.name, done + ',' + answers + ',"' + choice + '"'));
      });
    });
    row++;
  }
  finish(choiceFrom, 1);

  if (s.getMaxRows() >= row) s.deleteRows(row, s.getMaxRows() - row + 1);
  if (s.getMaxColumns() > 10) s.deleteColumns(11, s.getMaxColumns() - 10);
  s.activate();
}
