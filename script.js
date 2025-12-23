// ============================================
// 사내 카페 예약 시스템 JavaScript
// ============================================

// Google Apps Script 웹앱 URL (배포 후 여기에 URL을 입력하세요)
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', function() {
    initializeDatePicker();
    initializeFormSubmission();
    initializeSmoothScroll();
});

// ============================================
// 날짜 선택기 초기화
// ============================================
function initializeDatePicker() {
    const dateInput = document.getElementById('date');

    // 오늘 날짜를 최소 날짜로 설정
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    dateInput.setAttribute('min', todayStr);

    // 최대 30일 후까지 예약 가능
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    dateInput.setAttribute('max', maxDateStr);

    // 주말 선택 방지
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const dayOfWeek = selectedDate.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            alert('주말은 카페가 운영되지 않습니다. 평일을 선택해주세요.');
            this.value = '';
        }
    });
}

// ============================================
// 폼 제출 처리
// ============================================
function initializeFormSubmission() {
    const form = document.getElementById('reservationForm');
    const resultMessage = document.getElementById('resultMessage');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 폼 데이터 수집
        const formData = {
            name: document.getElementById('name').value,
            department: document.getElementById('department').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            guests: document.getElementById('guests').value,
            message: document.getElementById('message').value,
            timestamp: new Date().toISOString()
        };

        // 유효성 검사
        if (!validateForm(formData)) {
            return;
        }

        // 제출 버튼 비활성화 및 로딩 표시
        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = '예약 처리 중...';

        showMessage('loading', '예약을 처리하고 있습니다...');

        try {
            // Google Apps Script로 데이터 전송
            const response = await submitReservation(formData);

            if (response.success) {
                showMessage('success', '예약이 완료되었습니다! 확인 이메일을 확인해주세요.');
                form.reset();
            } else {
                showMessage('error', '예약 처리 중 오류가 발생했습니다: ' + (response.message || '알 수 없는 오류'));
            }
        } catch (error) {
            console.error('예약 오류:', error);

            // Apps Script URL이 설정되지 않은 경우
            if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
                showMessage('error', 'Google Apps Script URL이 설정되지 않았습니다. 구현 설명서를 참고하여 설정해주세요.');
            } else {
                showMessage('error', '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '예약 신청';
        }
    });
}

// ============================================
// 폼 유효성 검사
// ============================================
function validateForm(formData) {
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return false;
    }

    // 날짜 검사 (과거 날짜 방지)
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        alert('과거 날짜는 선택할 수 없습니다.');
        return false;
    }

    // 주말 검사
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        alert('주말은 예약할 수 없습니다. 평일을 선택해주세요.');
        return false;
    }

    return true;
}

// ============================================
// Google Apps Script로 예약 데이터 전송
// ============================================
async function submitReservation(formData) {
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });

    // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 처리
    // 실제 운영 환경에서는 CORS 설정을 통해 응답을 처리하는 것이 좋습니다
    return { success: true };
}

// ============================================
// 메시지 표시 함수
// ============================================
function showMessage(type, text) {
    const resultMessage = document.getElementById('resultMessage');
    resultMessage.className = 'result-message ' + type;
    resultMessage.textContent = text;

    // 성공 메시지는 5초 후 자동으로 숨김
    if (type === 'success') {
        setTimeout(() => {
            resultMessage.className = 'result-message';
            resultMessage.textContent = '';
        }, 5000);
    }
}

// ============================================
// 부드러운 스크롤 초기화
// ============================================
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// 테스트용 함수 (개발 시 사용)
// ============================================
function testFormSubmission() {
    console.log('테스트 모드: 폼 데이터 콘솔 출력');

    const formData = {
        name: document.getElementById('name').value,
        department: document.getElementById('department').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        guests: document.getElementById('guests').value,
        message: document.getElementById('message').value,
        timestamp: new Date().toISOString()
    };

    console.log('예약 데이터:', formData);
    return formData;
}
