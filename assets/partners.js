/* LCIC 제휴 할인 업체 — 단일 원본(single source of truth).
   여기만 고치면 deals.html / life-guide.html / rooms.html / status.html 에 동시에 반영된다.
   다른 곳에 따로 적지 말 것.

   필드
     name    업체명
     cat     food | cafe | spa   (필터 칩 기준)
     sub     한 줄 설명 (업종 · 위치)
     disc    배지에 크게 뜨는 할인율. 숫자로 안 떨어지면 "특가" 처럼 적어도 된다.
     benefit 실제 혜택 문장 (조건 포함)
     note    주의사항·예약 방법 등 (선택)
     map     구글 지도 링크 (선택)
     menu    메뉴판·안내문 이미지 경로 (선택)
     menuLabel  menu 링크에 쓸 문구 (선택, 기본 "🍜 메뉴판"). 음식점이 아니면 바꿔 준다.
     tel     전화번호 (선택). 휴대폰에서 눌러 바로 걸 수 있게 링크가 된다.
     isNew   신규 배지 (선택). "이번에 추가된 곳" 이라는 뜻이므로 다음 갱신 때 정리할 것.
*/
window.LCIC_PARTNERS = [
  /* ---------- 🍽 식당 ---------- */
  { name: "몬스터크랩 × 삼촌카세", cat: "food", sub: "시푸드 · 한식 오마카세 · 막탄", disc: "20%",
    benefit: "LCIC 학생 시푸드 전 품목 20% 할인 (주류 제외 · 학생증 지참) · 오마카세 1인 700P~",
    note: "한식 메뉴는 3시간 전에 카톡 osswin0710 으로 미리 예약!",
    map: "https://maps.app.goo.gl/MHErs81Q5z3mPPDy7", menu: "assets/partner/samchonkase-menu.png" },
  { name: "소문난식당", cat: "food", sub: "감자탕 · 레드코코 안", disc: "20%",
    benefit: "LCIC 학생·직원 20% 할인 (주류 제외)",
    note: "감자탕 ₱900(2인) / ₱1,500(4인) · 족발 ₱1,300 · 숯불 돼지불고기 ₱800",
    menu: "assets/partner/somunnan-menu.png" },
  { name: "Dotonbori Ramen", cat: "food", sub: "라멘", disc: "20%", benefit: "20% 할인", isNew: true },
  { name: "Good Luck Hotpot Cebu", cat: "food", sub: "훠궈 · 红运火锅 宿务店", disc: "특가",
    benefit: "₱2,899 → ₱1,299",
    note: "예약은 대만 매니저 Lowry 에게 부탁해 주세요.", isNew: true },
  { name: "Matsunoya", cat: "food", sub: "일식 · 전 지점", disc: "10%", benefit: "전 지점 10% 할인", isNew: true },
  { name: "라식당", cat: "food", sub: "한식당", disc: "10%", benefit: "10% 할인 · 4명 이상이면 픽업/드랍 제공" },
  { name: "Cabana Restaurant", cat: "food", sub: "해산물 · 바다 뷰", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요." },
  { name: "Kumo", cat: "food", sub: "식당", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요.", isNew: true },
  { name: "Crackin Crab", cat: "food", sub: "해산물", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요.", isNew: true },
  { name: "Ichiriki Chaya", cat: "food", sub: "일식", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요.", isNew: true },
  { name: "Cook Pub", cat: "food", sub: "한식당 · 막탄", disc: "10%", benefit: "10% 할인" },
  { name: "Euphoria", cat: "food", sub: "세계 음식 · 퓨전", disc: "10%", benefit: "10% 할인" },
  { name: "Moreno Pizza", cat: "food", sub: "피자", disc: "10%", benefit: "10% 할인" },
  { name: "Pho19 Mactan", cat: "food", sub: "베트남 쌀국수", disc: "10%", benefit: "10% 할인" },
  { name: "Reysol", cat: "food", sub: "식당 · 카페", disc: "10%", benefit: "10% 할인", isNew: true },
  { name: "KAYA Korean BBQ Mactan Cebu", cat: "food", sub: "한식 BBQ · 막탄", disc: "5%", benefit: "5% 할인" },
  { name: "Nimo Brew", cat: "food", sub: "세계 음식 · 퓨전", disc: "5%", benefit: "5% 할인" },
  { name: "Yang Hero", cat: "food", sub: "IT파크점 · 파크몰점", disc: "5%",
    benefit: "IT파크점 · 파크몰점 모두 5% 할인", isNew: true },
  { name: "Four Seasons in Malibago", cat: "food", sub: "식당 · 카페 · 말리바고", disc: "5%",
    benefit: "5% 할인", note: "허니트리(Honey Tree) 건물 위층에 있어요.", isNew: true },
  { name: "소복소복 sobok-sobok", cat: "food", sub: "한식", disc: "₱50",
    benefit: "메인 요리 ₱50 할인", isNew: true },
  { name: "Yukimaru", cat: "food", sub: "식당 · 카페", disc: "1잔 무료",
    benefit: "음료 1잔 무료", isNew: true },

  /* ---------- ☕ 카페 ---------- */
  { name: "Flavour Coffee Station", cat: "cafe", sub: "카페", disc: "15%", benefit: "15% 할인" },
  { name: "Vibe Bar and Cafe", cat: "cafe", sub: "바 · 카페", disc: "13%", benefit: "13% 할인" },
  { name: "Unfinished Coffee Shop Lapu-Lapu", cat: "cafe", sub: "카페", disc: "10%", benefit: "10% 할인" },
  { name: "Winning Cafe", cat: "cafe", sub: "카페", disc: "10%", benefit: "10% 할인",
    note: "예약은 대만 매니저 Lowry 에게 부탁해 주세요.", isNew: true },
  { name: "omni.brew", cat: "cafe", sub: "카페", disc: "10%", benefit: "10% 할인", isNew: true },
  { name: "UkeHub Cafe", cat: "cafe", sub: "카페", disc: "5~10%", benefit: "음식 5% · 음료 10% 할인" },
  { name: "Buzzed Station", cat: "cafe", sub: "카페", disc: "5~20%", benefit: "음식 5% · 오후 5-8시 음료 20% 할인" },

  /* ---------- 💆 스파 · 네일 · 다이빙 ---------- */
  { name: "Cheeva Spa", cat: "spa", sub: "스파 · 마사지", disc: "20%", benefit: "20% 할인" },
  { name: "Ocean Massage", cat: "spa", sub: "마사지", disc: "20%", benefit: "20% 할인",
    note: "예약할 때 LCIC 학생이라고 꼭 말해 주세요 · 2명 이상이면 픽업/드랍 제공",
    map: "https://maps.app.goo.gl/Dz19tPmybYRrWReZA" },
  { name: "VEL SPA", cat: "spa", sub: "스파 · 마사지", disc: "20%", benefit: "20% 할인", isNew: true },
  { name: "A&B Dive Shop", cat: "spa", sub: "다이빙 숍", disc: "특가", benefit: "학생증 제시 — 2일 자격증 코스(식사·숙박 포함) PHP 11,000" },
  { name: "M beauty salon and Nails", cat: "spa", sub: "미용실 · 네일 · Salinas Premier", disc: "10%",
    benefit: "10% 할인", isNew: true },
  { name: "COCORABIN 네일샵", cat: "spa", sub: "네일 · 뷰티", disc: "10%",
    benefit: "시술 요금 10% 할인 · 픽업/드랍 무료 · 카페 음료 무료 (학생증 필참)",
    note: "예약 — 전화 032 328 5887 · 스마트 0969 378 8158 · 카톡 cocorabin · 페이스북 cocorabin nail",
    tel: "0323285887", menu: "assets/partner/cocorabin-poster.png", menuLabel: "🖼 안내문 · 예약 QR" },
];
