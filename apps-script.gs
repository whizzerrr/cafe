// ============================================
// 사내 카페 예약 시스템 - Google Apps Script
// 이 코드를 Google Sheets의 Apps Script 편집기에 붙여넣기 하세요
// ============================================

// 스프레드시트 설정
// 이 함수를 한 번 실행하여 시트 헤더를 설정합니다
function setupSpreadsheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // 시트 이름 변경
  sheet.setName('예약목록');

  // 헤더 설정
  const headers = [
    '접수번호',
    '접수일시',
    '예약자명',
    '부서',
    '이메일',
    '연락처',
    '예약날짜',
    '예약시간',
    '인원수',
    '요청사항',
    '상태'
  ];

  // 헤더 입력
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // 헤더 스타일 설정
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#8B4513');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 열 너비 자동 조정
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // 첫 번째 행 고정
  sheet.setFrozenRows(1);

  Logger.log('스프레드시트 설정이 완료되었습니다!');
}

// ============================================
// POST 요청 처리 (웹앱으로 배포 시 필요)
// ============================================
function doPost(e) {
  try {
    // JSON 데이터 파싱
    const data = JSON.parse(e.postData.contents);

    // 예약 데이터 저장
    const result = saveReservation(data);

    // 성공 응답
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, reservationId: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // 오류 응답
    Logger.log('오류 발생: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// GET 요청 처리 (테스트용)
// ============================================
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'OK', message: '카페 예약 API가 정상 작동 중입니다.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// 예약 데이터 저장
// ============================================
function saveReservation(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('예약목록');

  if (!sheet) {
    throw new Error('예약목록 시트를 찾을 수 없습니다. setupSpreadsheet()를 먼저 실행해주세요.');
  }

  // 접수번호 생성 (날짜 + 순번)
  const today = new Date();
  const dateStr = Utilities.formatDate(today, 'Asia/Seoul', 'yyyyMMdd');
  const lastRow = sheet.getLastRow();
  const reservationId = 'R' + dateStr + '-' + String(lastRow).padStart(4, '0');

  // 현재 시간 (한국 시간)
  const timestamp = Utilities.formatDate(today, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // 새 행에 데이터 추가
  const newRow = [
    reservationId,           // 접수번호
    timestamp,               // 접수일시
    data.name,               // 예약자명
    data.department,         // 부서
    data.email,              // 이메일
    data.phone || '-',       // 연락처
    data.date,               // 예약날짜
    data.time,               // 예약시간
    data.guests,             // 인원수
    data.message || '-',     // 요청사항
    '접수완료'               // 상태
  ];

  sheet.appendRow(newRow);

  // 이메일 알림 발송 (선택사항)
  try {
    sendConfirmationEmail(data, reservationId);
  } catch (emailError) {
    Logger.log('이메일 발송 실패: ' + emailError.toString());
  }

  Logger.log('예약 저장 완료: ' + reservationId);
  return reservationId;
}

// ============================================
// 확인 이메일 발송
// ============================================
function sendConfirmationEmail(data, reservationId) {
  const subject = '[사내 카페] 예약이 완료되었습니다 - ' + reservationId;

  const body = `
안녕하세요, ${data.name}님!

사내 카페 예약이 완료되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━
예약 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ 접수번호: ${reservationId}
▶ 예약자명: ${data.name}
▶ 부서: ${data.department}
▶ 예약날짜: ${data.date}
▶ 예약시간: ${data.time}
▶ 인원수: ${data.guests}명
${data.message ? '▶ 요청사항: ' + data.message : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━

예약 시간에 맞춰 방문해주세요.
예약 취소나 변경이 필요하시면 내선 1234로 연락주세요.

감사합니다.
사내 카페 드림
  `;

  MailApp.sendEmail(data.email, subject, body);
  Logger.log('확인 이메일 발송 완료: ' + data.email);
}

// ============================================
// 테스트 함수
// ============================================
function testSaveReservation() {
  const testData = {
    name: '홍길동',
    department: '개발팀',
    email: 'test@example.com',
    phone: '010-1234-5678',
    date: '2024-12-25',
    time: '14:00',
    guests: '2',
    message: '창가 자리 부탁드립니다'
  };

  const result = saveReservation(testData);
  Logger.log('테스트 예약 완료: ' + result);
}

// ============================================
// 예약 현황 조회 함수
// ============================================
function getReservationsByDate(dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('예약목록');
  const data = sheet.getDataRange().getValues();

  // 헤더 제외하고 해당 날짜의 예약만 필터링
  const reservations = data.slice(1).filter(row => row[6] === dateStr);

  return reservations;
}

// ============================================
// 오래된 예약 정리 (선택사항)
// ============================================
function cleanOldReservations() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('예약목록');
  const data = sheet.getDataRange().getValues();

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

  // 30일 이상 지난 예약의 상태를 '완료'로 변경
  for (let i = 1; i < data.length; i++) {
    const reservationDate = new Date(data[i][6]);
    if (reservationDate < thirtyDaysAgo && data[i][10] !== '완료') {
      sheet.getRange(i + 1, 11).setValue('완료');
    }
  }

  Logger.log('오래된 예약 정리 완료');
}
