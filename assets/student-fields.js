// 학생 정보 수집 폼 + CSV 추출의 단일 소스.
// STUDENT_FIELDS 배열의 순서 = students.csv 헤더 순서 (절대 변경 금지).
// apply.html(폼 렌더링)과 apply-admin.html(목록·CSV)이 함께 사용한다.

export const STUDENT_FIELDS = [
  { key: "email", label: "이메일", help: "연락 가능한 이메일", type: "email", required: true, section: "basic", placeholder: "example@email.com" },
  { key: "first_name", label: "이름 (영문)", help: "여권 Given name과 동일하게 영문으로", type: "text", required: true, section: "basic", placeholder: "Gildong" },
  { key: "last_name", label: "성 (영문)", help: "여권 Surname과 동일하게 영문으로", type: "text", required: true, section: "basic", placeholder: "Hong" },
  { key: "first_name_passport", label: "여권 이름 (Given name)", help: "여권에 적힌 그대로 영문", type: "text", required: true, section: "passport", placeholder: "GILDONG" },
  { key: "last_name_passport", label: "여권 성 (Surname)", help: "여권에 적힌 그대로 영문", type: "text", required: true, section: "passport", placeholder: "HONG" },
  { key: "middlename_passport", label: "여권 중간이름", help: "없으면 비워두세요", type: "text", required: false, section: "passport", placeholder: "" },
  { key: "gender", label: "성별", help: "", type: "select", required: true, section: "basic",
    options: [ { value: "Male", label: "남성" }, { value: "Female", label: "여성" } ] },
  { key: "national_number", label: "주민등록번호", help: "주민등록번호 13자리 (선택, 없으면 비움)", type: "text", required: false, section: "passport", placeholder: "" },
  { key: "phone", label: "휴대폰 번호", help: "예: 010-1234-5678", type: "tel", required: true, section: "basic", placeholder: "010-0000-0000" },
  { key: "postal", label: "우편번호", help: "", type: "text", required: false, section: "address", placeholder: "" },
  { key: "state", label: "시 / 도", help: "예: 서울특별시, 경기도", type: "text", required: false, section: "address", placeholder: "" },
  { key: "city", label: "시 / 군 / 구", help: "예: 강남구", type: "text", required: false, section: "address", placeholder: "" },
  { key: "address", label: "상세 주소", help: "도로명 또는 지번 주소", type: "text", required: false, section: "address", placeholder: "" },
  { key: "about", label: "자기소개 / 메모", help: "선택 사항. 자유롭게 작성", type: "textarea", required: false, section: "etc", placeholder: "" },
  { key: "birthday", label: "생년월일", help: "", type: "date", required: true, section: "basic" },
  { key: "country", label: "거주 국가", help: "영문으로 입력. 예: South Korea", type: "text", required: true, section: "basic", default: "South Korea", placeholder: "South Korea" },
  { key: "nationality", label: "국적", help: "영문으로 입력. 예: Korean", type: "text", required: true, section: "basic", default: "Korean", placeholder: "Korean" },
  { key: "study_period_start", label: "연수 시작일", help: "", type: "date", required: false, section: "program" },
  { key: "study_period_end", label: "연수 종료일", help: "", type: "date", required: false, section: "program" },
  { key: "number_of_weeks", label: "연수 주수", help: "예: 4", type: "number", required: false, section: "program", placeholder: "" },
  { key: "stay_period_start", label: "체류 시작일", help: "현지 도착~출국 기준", type: "date", required: false, section: "program" },
  { key: "stay_period_end", label: "체류 종료일", help: "", type: "date", required: false, section: "program" },
  { key: "university", label: "소속 대학", help: "영문 권장. 예: Jeonbuk National University", type: "text", required: false, section: "program", placeholder: "" },
  { key: "academic_year", label: "학년", help: "예: 2학년 / Year 2", type: "text", required: false, section: "program", placeholder: "" },
  { key: "faculty", label: "단과대학 (Faculty)", help: "예: College of Engineering", type: "text", required: false, section: "program", placeholder: "" },
  { key: "department", label: "학과 (Department)", help: "예: Computer Science", type: "text", required: false, section: "program", placeholder: "" },
  { key: "agency", label: "에이전시 (유학원)", help: "신청한 유학원 이름", type: "text", required: false, section: "program", placeholder: "" },
  { key: "group", label: "그룹 / 반", help: "안내받은 그룹이 있으면 입력", type: "text", required: false, section: "program", placeholder: "" },
  { key: "passport_number", label: "여권 번호", help: "", type: "text", required: false, section: "passport", placeholder: "" },
  { key: "passport_date_of_issue", label: "여권 발급일", help: "", type: "date", required: false, section: "passport" },
  { key: "passport_expiration_date", label: "여권 만료일", help: "", type: "date", required: false, section: "passport" },
  { key: "emergency_contact_name", label: "비상연락처 이름", help: "보호자 등", type: "text", required: false, section: "emergency", placeholder: "" },
  { key: "emergency_contact_relationship", label: "관계", help: "예: 부, 모, 배우자", type: "text", required: false, section: "emergency", placeholder: "" },
  { key: "emergency_contact_email", label: "비상연락처 이메일", help: "", type: "email", required: false, section: "emergency", placeholder: "" },
  { key: "emergency_contact_phone", label: "비상연락처 전화", help: "", type: "tel", required: false, section: "emergency", placeholder: "" },
  { key: "emergency_contact_address", label: "비상연락처 주소", help: "", type: "text", required: false, section: "emergency", placeholder: "" },
  { key: "university_incharge_name", label: "대학 담당자 이름", help: "대학 측 인솔/담당 교직원", type: "text", required: false, section: "program", placeholder: "" },
  { key: "agency_incharge_name", label: "에이전시 담당자 이름", help: "유학원 담당자", type: "text", required: false, section: "program", placeholder: "" },
  { key: "course", label: "수강 코스", help: "예: ESL, IELTS", type: "text", required: false, section: "program", placeholder: "" },
];

// 폼 표시용 섹션 (CSV 순서와 무관)
export const SECTIONS = [
  { id: "basic", title: "기본 정보", icon: "solar:user-bold-duotone" },
  { id: "passport", title: "여권 정보", icon: "solar:passport-bold-duotone" },
  { id: "address", title: "주소", icon: "solar:map-point-bold-duotone" },
  { id: "program", title: "소속 & 연수", icon: "solar:square-academic-cap-bold-duotone" },
  { id: "emergency", title: "비상 연락처", icon: "solar:phone-calling-rounded-bold-duotone" },
  { id: "etc", title: "기타", icon: "solar:notes-bold-duotone" },
];

// students.csv 헤더와 100% 동일해야 함.
export const CSV_HEADER = STUDENT_FIELDS.map((f) => f.key).join(",");
