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
  var INK = '#2b2a27', MUTED = '#8a857b', LINE = '#e8e3da', INPUT = '#fff4cf';
  var SOLID = SpreadsheetApp.BorderStyle.SOLID, MEDIUM = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  // 왼쪽 모리티아(B~G), 오른쪽 사이드템포(I~N). 브랜드마다 6칸: 항목 | 숫자 | 비율 | 막대 | 비율 | 항목
  var PANELS = [
    { name: BRANDS[0], col: 2, color: '#6b3f35', light: '#d9c3b8', soft: '#f6efeb' },
    { name: BRANDS[1], col: 9, color: '#35524a', light: '#bfd0ca', soft: '#edf3f1' }
  ];
  var WIDTHS = [185, 58, 58, 150, 58, 112];
  var NAMES = { BFPE: '강렬한 탐험가', BFPR: '커피 미식가', BFSE: '트렌드 선도자', BFSR: '확고한 결정자', BNPE: '고소한 개척자', BNPR: '정통 수호자',
    BNSE: '맛의 설계자', BNSR: '진한 위로자', MFPE: '부드러운 탐험가', MFPR: '담백한 절제가', MFSE: '분위기 연출가', MFSR: '달콤한 안식가',
    MNPE: '편안한 탐험가', MNPR: '잔잔한 동반자', MNSE: '아늑한 상상가', MNSR: '아지트 거주자' };
  // 취향 네 가지. 코드의 자리마다 왼쪽(A 선택) · 오른쪽(B 선택) 글자가 정해져 있습니다.
  var AXES = [
    { name: '바디', a: '진한 커피', b: '부드러운 커피', aCode: 'B???', bCode: 'M???' },
    { name: '풍미', a: '산미·과일향', b: '고소·초콜릿향', aCode: '?F??', bCode: '?N??' },
    { name: '달콤함', a: '커피 본연의 맛', b: '달콤한 맛', aCode: '??P?', bCode: '??S?' },
    { name: '스타일', a: '새로운 메뉴', b: '익숙한 메뉴', aCode: '???E', bCode: '???R' }
  ];
  var QUESTION_AXIS = [0, 0, 1, 1, 1, 2, 2, 3, 3, 3]; // Q1~Q10이 묻는 취향
  var REASONS = [['처음으로', '손님이 직접 그만둠'], ['시간 초과', '자리를 비워 자동 복귀'], ['페이지 이탈', '창을 닫거나 새로고침']];

  s.setColumnWidth(1, 16); s.setColumnWidth(8, 30); s.setColumnWidth(15, 16);
  PANELS.forEach(function (p) { WIDTHS.forEach(function (width, i) { s.setColumnWidth(p.col + i, width); }); });
  s.getRange(1, 1, 130, 15).setFontFamily('Arial').setFontSize(10).setFontColor(INK).setVerticalAlignment('middle');

  var letter = function (col) { return String.fromCharCode(64 + col); };
  // 기간 조건이 붙은 COUNTIFS. extra는 '범위,조건' 쌍을 이어 붙인 문자열입니다.
  var count = function (brand, extra) {
    return 'COUNTIFS(' + R + '$B:$B,"' + brand + '",' + R + '$D:$D,">="&$C$4,' + R + '$D:$D,"<="&$F$4' + (extra ? ',' + extra : '') + ')';
  };
  var done = R + '$C:$C,"완료"', undone = R + '$C:$C,"미완료"';

  // 머리말 (두 브랜드 공통)
  s.getRange(2, 2, 1, 13).merge().setValue('COFFEE DNA 통계').setFontSize(22).setFontWeight('bold');
  s.getRange(3, 2, 1, 13).merge().setValue('테스트 시작일(한국 시간) 기준 · 사람 수가 아닌 테스트 횟수입니다. 노란 칸의 날짜를 바꾸면 전체가 다시 계산됩니다.').setFontColor(MUTED);
  s.getRange('B4').setValue('기간').setFontWeight('bold').setHorizontalAlignment('right');
  s.getRange('C4:D4').merge().setValue(new Date(2026, 0, 1)).setBackground(INPUT);
  s.getRange('E4').setValue('부터').setFontColor(MUTED).setHorizontalAlignment('center');
  s.getRange('F4:G4').merge().setValue(new Date(2099, 11, 31)).setBackground(INPUT);
  s.getRange('C4:G4').setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center').setFontWeight('bold');
  s.getRange('E4').setFontWeight('normal');
  s.getRange('I4').setValue('까지').setFontColor(MUTED);
  s.setRowHeight(2, 44); s.setRowHeight(4, 30);
  s.setFrozenRows(4);

  var lastRow = 6;

  PANELS.forEach(function (p) {
    var row = 6;
    var cell = function (r, i, width, height) { return s.getRange(r, p.col + i, height || 1, width || 1); };
    var at = function (r, i) { return letter(p.col + i) + r; };              // 예: C12
    var fixed = function (r, i) { return '$' + letter(p.col + i) + '$' + r; }; // 예: $C$12
    var formulaCount = function (extra) { return count(p.name, extra); };

    var section = function (title, meaning) {
      cell(row, 0, 6).merge().setValue(title).setFontSize(13).setFontWeight('bold').setFontColor(p.color)
        .setBorder(null, null, true, null, null, null, p.color, MEDIUM);
      s.setRowHeight(row, 34);
      cell(row + 1, 0, 6).merge().setValue(meaning).setFontColor(MUTED).setFontSize(9).setWrap(true);
      s.setRowHeight(row + 1, 38);
      row += 2;
    };
    var columns = function (labels) { // 표 머리글
      cell(row, 0, 6).setValues([labels]).setFontSize(9).setFontWeight('bold').setFontColor(MUTED).setBackground(p.soft).setHorizontalAlignment('center');
      cell(row, 0).setHorizontalAlignment('left');
      row++;
    };
    var rule = function (from, to) { // 줄 사이 가는 선, 줄 높이
      cell(from, 0, 6, to - from + 1).setBorder(null, null, true, null, null, true, LINE, SOLID);
      for (var r = from; r <= to; r++) s.setRowHeight(r, 27);
    };
    // 가장 큰 값을 가진 줄을 강조합니다.
    var highlights = [];
    var highlight = function (from, to) {
      var value = '$' + letter(p.col + 1);
      highlights.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND(' + value + from + '>0,' + value + from + '=MAX(' + value + '$' + from + ':' + value + '$' + to + '))')
        .setBackground(p.soft).setBold(true).setRanges([cell(from, 0, 6, to - from + 1)]).build());
    };
    // 한 줄: 항목 | 횟수 | 비율 | 막대(3칸)
    var bars = function (items, base) { // items: [[항목, extra]]
      var from = row, to = row + items.length - 1;
      items.forEach(function (item) {
        cell(row, 0).setValue(item[0]);
        cell(row, 1).setFormula('=' + formulaCount(item[1])).setHorizontalAlignment('center').setFontWeight('bold');
        cell(row, 2).setFormula('=IF(' + base + '=0,"",' + at(row, 1) + '/' + base + ')').setNumberFormat('0%').setHorizontalAlignment('center').setFontColor(MUTED);
        cell(row, 3, 3).merge().setFormula('=IF(' + at(row, 1) + '=0,"",SPARKLINE(' + at(row, 1) + ',{"charttype","bar";"max",MAX(1,' + fixed(from, 1) + ':' + fixed(to, 1) + ');"color1","' + p.color + '"}))');
        row++;
      });
      rule(from, to);
      highlight(from, to);
      return [from, to];
    };
    // 한 줄: 왼쪽 항목 | 왼쪽 비율 | 양쪽을 나눈 막대(2칸) | 오른쪽 비율 | 오른쪽 항목
    var versus = function (leftLabel, leftCount, rightLabel, rightCount) {
      var both = 'LET(a,' + leftCount + ',b,' + rightCount + ',';
      cell(row, 0).setFormula('=' + leftLabel).setHorizontalAlignment('right');
      cell(row, 1).setFormula('=' + both + 'IF(a+b=0,"",a/(a+b)))').setNumberFormat('0%').setHorizontalAlignment('center').setFontWeight('bold').setFontColor(p.color);
      cell(row, 2, 2).merge().setFormula('=' + both + 'IF(a+b=0,"",SPARKLINE({a,b},{"charttype","bar";"color1","' + p.color + '";"color2","' + p.light + '"})))');
      cell(row, 4).setFormula('=' + both + 'IF(a+b=0,"",b/(a+b)))').setNumberFormat('0%').setHorizontalAlignment('center').setFontWeight('bold').setFontColor(MUTED);
      cell(row, 5).setFormula('=' + rightLabel);
      row++;
    };

    // 브랜드 이름
    cell(row, 0, 6).merge().setValue(p.name).setBackground(p.color).setFontColor('#ffffff').setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
    s.setRowHeight(row, 46);
    row += 2;

    // 한눈에 보기: 숫자 카드 네 장
    var cardRow = row;
    var cards = [
      { label: '시작', at: 0, width: 1, formula: '=' + formulaCount('') },
      { label: '완료', at: 1, width: 2, formula: '=' + formulaCount(done) },
      { label: '미완료', at: 3, width: 1, formula: '=' + formulaCount(undone) },
      { label: '완료율', at: 4, width: 2, formula: '=IF(' + at(cardRow + 1, 0) + '=0,"–",' + at(cardRow + 1, 1) + '/' + at(cardRow + 1, 0) + ')' }
    ];
    cards.forEach(function (card) {
      cell(row, card.at, card.width).merge().setValue(card.label).setFontSize(9).setFontColor(MUTED);
      cell(row + 1, card.at, card.width).merge().setFormula(card.formula).setFontSize(24).setFontWeight('bold').setFontColor(p.color);
    });
    cell(row + 1, 4, 2).setNumberFormat('0%');
    cell(row, 0, 6, 2).setBackground(p.soft).setHorizontalAlignment('center');
    cell(row, 0, 6, 2).setBorder(true, true, true, true, true, null, '#ffffff', MEDIUM);
    s.setRowHeight(row, 24); s.setRowHeight(row + 1, 50);
    var completed = fixed(cardRow + 1, 1), dropped = fixed(cardRow + 1, 3);
    row += 3;
    // 요약 두 줄 (아래 표가 만들어진 뒤 수식을 넣습니다)
    var summaryRow = row;
    cell(row, 0).setValue('가장 많이 나온 유형').setFontColor(MUTED);
    cell(row + 1, 0).setValue('가장 많이 멈춘 문항').setFontColor(MUTED);
    cell(row, 1, 5).merge().setFontWeight('bold');
    cell(row + 1, 1, 5).merge().setFontWeight('bold');
    rule(row, row + 1);
    row += 3;

    // 취향 분포
    section('취향 분포', '테스트를 끝낸 손님의 결과가 어느 쪽 취향으로 기우는지 보여줍니다. 괄호는 횟수, 양쪽 합이 100%입니다.');
    var axisFrom = row;
    AXES.forEach(function (axis) {
      cell(row, 0, 6).merge().setValue(axis.name).setFontSize(9).setFontWeight('bold').setFontColor(MUTED).setVerticalAlignment('bottom');
      s.setRowHeight(row, 22);
      row++;
      var left = formulaCount(done + ',' + R + '$J:$J,"' + axis.aCode + '"'), right = formulaCount(done + ',' + R + '$J:$J,"' + axis.bCode + '"');
      versus('"' + axis.a + ' ("&' + left + '&")"', left, '"' + axis.b + ' ("&' + right + '&")"', right);
      s.setRowHeight(row - 1, 30);
    });
    cell(axisFrom, 0, 6, row - axisFrom).setBorder(null, null, true, null, null, null, LINE, SOLID);
    row += 2;

    // 유형 분포
    section('유형 분포', '테스트를 끝낸 손님이 16가지 유형 중 어디에 몇 번 나왔는지 보여줍니다. 가장 많은 유형은 색으로 표시됩니다.');
    columns(['유형', '횟수', '비율', '', '', '']);
    var types = bars(CODES.map(function (code) { return [code + '  ' + NAMES[code], done + ',' + R + '$J:$J,"' + code + '"']; }), completed);
    row += 2;

    // 이탈 문항
    section('이탈 문항', '끝내지 않은 테스트가 몇 번 문항에서 멈췄는지 보여줍니다. 막대가 긴 문항에서 손님이 많이 그만둡니다.');
    columns(['문항 · 묻는 취향', '횟수', '비율', '', '', '']);
    var quitItems = [];
    for (var q = 1; q <= 10; q++) quitItems.push(['Q' + q + ' · ' + AXES[QUESTION_AXIS[q - 1]].name, undone + ',' + R + '$H:$H,' + q]);
    var quits = bars(quitItems, dropped);
    row += 2;

    // 미완료 사유
    section('미완료 사유', '끝내지 않은 테스트가 어떻게 끝났는지 보여줍니다.');
    columns(['사유', '횟수', '비율', '', '', '']);
    bars(REASONS.map(function (reason) { return [reason[0] + ' · ' + reason[1], undone + ',' + R + '$G:$G,"' + reason[0] + '"']; }), dropped);
    row += 2;

    // 문항별 선택
    section('문항별 선택', '테스트를 끝낸 손님이 문항마다 A와 B 중 무엇을 골랐는지 보여줍니다. A는 왼쪽 취향(진한·과일향·본연·새로운), B는 오른쪽 취향입니다.');
    columns(['문항 · 묻는 취향', 'A', '', '', 'B', '건너뜀']);
    var choiceFrom = row;
    for (var n = 1; n <= 10; n++) {
      var answerColumn = letter(11 + n); // L열 = Q1
      var answers = done + ',' + R + '$' + answerColumn + ':$' + answerColumn;
      versus('"Q' + n + ' · ' + AXES[QUESTION_AXIS[n - 1]].name + '"', formulaCount(answers + ',"A"'), formulaCount(answers + ',"건너뜀"'), formulaCount(answers + ',"B"'));
      cell(row - 1, 0).setHorizontalAlignment('left');
      cell(row - 1, 5).setHorizontalAlignment('center').setFontColor(MUTED);
    }
    rule(choiceFrom, row - 1);

    // 요약 수식
    var top = function (range) { // 가장 큰 값의 항목 이름, 없으면 –
      var values = fixed(range[0], 1) + ':' + fixed(range[1], 1), labels = fixed(range[0], 0) + ':' + fixed(range[1], 0);
      return '=IF(MAX(' + values + ')=0,"–",INDEX(' + labels + ',MATCH(MAX(' + values + '),' + values + ',0))&"  ("&MAX(' + values + ')&"회)")';
    };
    cell(summaryRow, 1).setFormula(top(types));
    cell(summaryRow + 1, 1).setFormula(top(quits));

    s.setConditionalFormatRules(s.getConditionalFormatRules().concat(highlights));
    lastRow = Math.max(lastRow, row);
  });

  if (s.getMaxRows() > lastRow + 1) s.deleteRows(lastRow + 2, s.getMaxRows() - lastRow - 1);
  if (s.getMaxColumns() > 15) s.deleteColumns(16, s.getMaxColumns() - 15);
  s.activate();
}
