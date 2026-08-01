/* LCIC 제휴 할인 업체 — 단일 원본(single source of truth).
   여기만 고치면 deals.html 과 life-guide.html '제휴 할인' 탭에 동시에 반영된다.
   두 곳에 따로 적지 말 것.

   필드
     name    업체명
     cat     food | cafe | spa   (필터 칩 기준)
     sub     한 줄 설명 (업종 · 위치)
     disc    배지에 크게 뜨는 할인율. 숫자로 안 떨어지면 "특가" 처럼 적어도 된다.
     benefit 실제 혜택 문장 (조건 포함)
     note    주의사항·예약 방법 등 (선택)
     map     구글 지도 링크 (선택)
     menu    메뉴판 이미지 경로 (선택)
     isNew   신규 배지 (선택)
*/
window.LCIC_PARTNERS = [
  { name: "몬스터크랩 × 삼촌카세", cat: "food", sub: "시푸드 · 한식 오마카세 · 막탄", disc: "20%",
    benefit: "LCIC 학생 시푸드 전 품목 20% 할인 (주류 제외 · 학생증 지참) · 오마카세 1인 700P~",
    note: "한식 메뉴는 3시간 전에 카톡 osswin0710 으로 미리 예약!",
    map: "https://maps.app.goo.gl/MHErs81Q5z3mPPDy7", menu: "assets/partner/samchonkase-menu.png", isNew: true },
  { name: "소문난식당", cat: "food", sub: "감자탕 · 레드코코 안", disc: "20%", benefit: "LCIC 학생·직원 20% 할인 (주류 제외)" },
  { name: "Rami Korean Restaurant", cat: "food", sub: "한식당", disc: "15%", benefit: "15% 할인" },
  { name: "라식당", cat: "food", sub: "한식당", disc: "10%", benefit: "10% 할인 · 4명 이상이면 픽업/드랍 제공" },
  { name: "Cabana Restaurant", cat: "food", sub: "해산물 · 바다 뷰", disc: "10%", benefit: "10% 할인 (쿠폰 필요)" },
  { name: "Cook Pub", cat: "food", sub: "한식당", disc: "10%", benefit: "10% 할인" },
  { name: "Euphoria", cat: "food", sub: "세계 음식 · 퓨전", disc: "10%", benefit: "10% 할인" },
  { name: "Moreno Pizza", cat: "food", sub: "피자", disc: "10%", benefit: "10% 할인" },
  { name: "Pho19 Mactan", cat: "food", sub: "베트남 쌀국수", disc: "10%", benefit: "10% 할인" },
  { name: "Mactan Kaya Korean Restaurant", cat: "food", sub: "한식당", disc: "5%", benefit: "5% 할인" },
  { name: "Nimo Brew", cat: "food", sub: "세계 음식 · 퓨전", disc: "5%", benefit: "5% 할인" },
  { name: "Flavour Coffee Station", cat: "cafe", sub: "카페", disc: "15%", benefit: "15% 할인" },
  { name: "Vibe Bar and Cafe", cat: "cafe", sub: "바 · 카페", disc: "13%", benefit: "13% 할인" },
  { name: "Unfinished Coffee Shop Lapu-Lapu", cat: "cafe", sub: "카페", disc: "10%", benefit: "10% 할인" },
  { name: "UkeHub Cafe", cat: "cafe", sub: "카페", disc: "5~10%", benefit: "음식 5% · 음료 10% 할인" },
  { name: "Buzzed Station", cat: "cafe", sub: "카페", disc: "5~20%", benefit: "음식 5% · 오후 5-8시 음료 20% 할인" },
  { name: "Cheeva Spa", cat: "spa", sub: "스파 · 마사지", disc: "20%", benefit: "20% 할인" },
  { name: "Ocean Massage", cat: "spa", sub: "마사지", disc: "20%", benefit: "20% 할인" },
  { name: "A&B Dive Shop", cat: "spa", sub: "다이빙 숍", disc: "특가", benefit: "학생증 제시 — 2일 자격증 코스(식사·숙박 포함) PHP 11,000" },
];
