/* LCIC 제휴 할인 업체 — 단일 원본(single source of truth).
   여기만 고치면 deals.html / life-guide.html / rooms.html / status.html 에 동시에 반영된다.
   다른 곳에 따로 적지 말 것.

   필드 (한국어가 원본. 다른 언어는 t 에만 넣는다)
     name    업체명
     cat     food | cafe | spa   (필터 칩 기준)
     sub     한 줄 설명 (업종 · 위치)
     disc    배지에 크게 뜨는 할인율. 숫자로 안 떨어지면 "특가" 처럼 적어도 된다.
     benefit 실제 혜택 문장 (조건 포함)
     note    주의사항·예약 방법 등 (선택)
     map     구글 지도 링크 (선택)
     menu    메뉴판·안내문 이미지 경로 (선택). ※ 이미지 자체는 한국어판이다.
     menuLabel  menu 링크에 쓸 문구 (선택, 기본 "🍜 메뉴판"). 음식점이 아니면 바꿔 준다.
     tel     전화번호 (선택). 휴대폰에서 눌러 바로 걸 수 있게 링크가 된다.
     isNew   신규 배지 (선택). "이번에 추가된 곳" 이라는 뜻이므로 다음 갱신 때 정리할 것.
     t       번역 (선택) — { en: {...}, zh: {...}, ja: {...} }
             각 언어 안에 name / sub / disc / benefit / note 중 바꿀 것만 넣는다.
             빠진 항목은 assets/i18n.js 가 ja → zh → en → ko 순으로 알아서 메운다.
             zh 는 대만 표기(번체 + N 折). 20% 할인 = 8 折, 10% 할인 = 9 折.
*/
window.LCIC_PARTNERS = [
  /* ---------- 🍽 식당 ---------- */
  { name: "몬스터크랩 × 삼촌카세", cat: "food", sub: "시푸드 · 한식 오마카세 · 막탄", disc: "20%",
    benefit: "LCIC 학생 시푸드 전 품목 20% 할인 (주류 제외 · 학생증 지참) · 오마카세 1인 700P~",
    note: "한식 메뉴는 3시간 전에 카톡 osswin0710 으로 미리 예약!",
    map: "https://maps.app.goo.gl/MHErs81Q5z3mPPDy7", menu: "assets/partner/samchonkase-menu.png",
    t: {
      en: { name: "Monster Crab × Samchonkase", sub: "Seafood · Korean omakase · Mactan",
        benefit: "LCIC students — 20% off all seafood (alcohol excluded · student ID required) · Omakase from ₱700 per person",
        note: "For the Korean menu, reserve at least 3 hours ahead via KakaoTalk osswin0710." },
      zh: { name: "Monster Crab × Samchonkase", sub: "海鮮 · 韓式無菜單料理 · 麥克坦",
        benefit: "LCIC 學生 — 海鮮全品項 8 折(酒類除外 · 需出示學生證)· 無菜單料理每人 ₱700 起",
        note: "韓式餐點請於 3 小時前透過 KakaoTalk osswin0710 預約。" },
      ja: { name: "モンスタークラブ × サムチョンカセ", sub: "シーフード · 韓国オマカセ · マクタン",
        benefit: "LCIC の学生 — シーフード全品 20% オフ(酒類を除く · 学生証提示)· オマカセ 1 名 ₱700〜",
        note: "韓国料理メニューは 3 時間前までに KakaoTalk osswin0710 で予約してください。" },
    } },
  { name: "소문난식당", cat: "food", sub: "감자탕 · 레드코코 안", disc: "20%",
    benefit: "LCIC 학생·직원 20% 할인 (주류 제외)",
    note: "감자탕 ₱900(2인) / ₱1,500(4인) · 족발 ₱1,300 · 숯불 돼지불고기 ₱800",
    menu: "assets/partner/somunnan-menu.png",
    t: {
      en: { name: "Somunnan Restaurant", sub: "Korean stew · inside Red Coco",
        benefit: "LCIC students & staff — 20% off (alcohol excluded)",
        note: "Gamjatang ₱900 (2 ppl) / ₱1,500 (4 ppl) · Jokbal ₱1,300 · Charcoal pork bulgogi ₱800" },
      zh: { name: "Somunnan 韓式餐廳", sub: "韓式馬鈴薯排骨湯 · Red Coco 內",
        benefit: "LCIC 學生與教職員 — 8 折(酒類除外)",
        note: "馬鈴薯排骨湯 ₱900(2 人)/ ₱1,500(4 人)· 豬腳 ₱1,300 · 炭烤豬肉 ₱800" },
      ja: { name: "ソムンナン食堂", sub: "カムジャタン · Red Coco 内",
        benefit: "LCIC の学生・スタッフ — 20% オフ(酒類を除く)",
        note: "カムジャタン ₱900(2 名)/ ₱1,500(4 名)· 豚足 ₱1,300 · 炭火豚プルコギ ₱800" },
    } },
  { name: "Dotonbori Ramen", cat: "food", sub: "라멘", disc: "20%", benefit: "20% 할인", isNew: true,
    t: {
      en: { sub: "Ramen", benefit: "20% off" },
      zh: { sub: "拉麵", benefit: "8 折" },
      ja: { sub: "ラーメン", benefit: "20% オフ" },
    } },
  { name: "Good Luck Hotpot Cebu", cat: "food", sub: "훠궈 · 红运火锅 宿务店", disc: "특가",
    benefit: "₱2,899 → ₱1,299",
    note: "예약은 대만 매니저 Lowry 에게 부탁해 주세요.", isNew: true,
    t: {
      en: { sub: "Hotpot", disc: "Deal", note: "Ask Lowry, the Taiwanese manager, to book for you." },
      zh: { name: "紅運火鍋 宿霧店 (Good Luck Hotpot)", sub: "火鍋", disc: "特價",
        note: "請洽台灣經理 Lowry 協助訂位。" },
      // name 을 비우면 폴백이 zh(번체 상호)로 내려가 버린다 — 일본어에도 명시.
      ja: { name: "Good Luck Hotpot Cebu", sub: "火鍋", disc: "特価",
        note: "予約は台湾人マネージャーの Lowry にお願いしてください。" },
    } },
  { name: "Matsunoya", cat: "food", sub: "일식 · 전 지점", disc: "10%", benefit: "전 지점 10% 할인", isNew: true,
    t: {
      en: { sub: "Japanese · all branches", benefit: "10% off at all branches" },
      zh: { sub: "日式料理 · 全分店", benefit: "全分店 9 折" },
      ja: { sub: "和食 · 全店舗", benefit: "全店舗 10% オフ" },
    } },
  { name: "라식당", cat: "food", sub: "한식당", disc: "10%", benefit: "10% 할인 · 4명 이상이면 픽업/드랍 제공",
    t: {
      en: { name: "Ra Sikdang", sub: "Korean restaurant", benefit: "10% off · free pick-up/drop-off for groups of 4+" },
      zh: { name: "Ra Sikdang", sub: "韓式料理", benefit: "9 折 · 4 人以上提供接送" },
      ja: { name: "ラ食堂", sub: "韓国料理", benefit: "10% オフ · 4 名以上は送迎あり" },
    } },
  { name: "Cabana Restaurant", cat: "food", sub: "해산물 · 바다 뷰", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요.",
    t: {
      en: { sub: "Seafood · sea view", benefit: "10% off", note: "You need the coupon available in the dining hall." },
      zh: { sub: "海鮮 · 海景", benefit: "9 折", note: "需要餐廳(dining hall)提供的優惠券。" },
      ja: { sub: "シーフード · オーシャンビュー", benefit: "10% オフ", note: "ダイニングホールにあるクーポンが必要です。" },
    } },
  { name: "Kumo", cat: "food", sub: "식당", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요.", isNew: true,
    t: {
      en: { sub: "Restaurant", benefit: "10% off", note: "You need the coupon available in the dining hall." },
      zh: { sub: "餐廳", benefit: "9 折", note: "需要餐廳(dining hall)提供的優惠券。" },
      ja: { sub: "レストラン", benefit: "10% オフ", note: "ダイニングホールにあるクーポンが必要です。" },
    } },
  { name: "Crackin Crab", cat: "food", sub: "해산물", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요.", isNew: true,
    t: {
      en: { sub: "Seafood", benefit: "10% off", note: "You need the coupon available in the dining hall." },
      zh: { sub: "海鮮", benefit: "9 折", note: "需要餐廳(dining hall)提供的優惠券。" },
      ja: { sub: "シーフード", benefit: "10% オフ", note: "ダイニングホールにあるクーポンが必要です。" },
    } },
  { name: "Ichiriki Chaya", cat: "food", sub: "일식", disc: "10%", benefit: "10% 할인",
    note: "다이닝홀에 있는 쿠폰이 필요해요.", isNew: true,
    t: {
      en: { sub: "Japanese", benefit: "10% off", note: "You need the coupon available in the dining hall." },
      zh: { sub: "日式料理", benefit: "9 折", note: "需要餐廳(dining hall)提供的優惠券。" },
      ja: { name: "一力茶屋", sub: "和食", benefit: "10% オフ", note: "ダイニングホールにあるクーポンが必要です。" },
    } },
  { name: "Cook Pub", cat: "food", sub: "한식당 · 막탄", disc: "10%", benefit: "10% 할인",
    t: {
      en: { sub: "Korean · Mactan", benefit: "10% off" },
      zh: { sub: "韓式料理 · 麥克坦", benefit: "9 折" },
      ja: { sub: "韓国料理 · マクタン", benefit: "10% オフ" },
    } },
  { name: "Euphoria", cat: "food", sub: "세계 음식 · 퓨전", disc: "10%", benefit: "10% 할인",
    t: {
      en: { sub: "International · fusion", benefit: "10% off" },
      zh: { sub: "異國料理 · 創意料理", benefit: "9 折" },
      ja: { sub: "各国料理 · フュージョン", benefit: "10% オフ" },
    } },
  { name: "Moreno Pizza", cat: "food", sub: "피자", disc: "10%", benefit: "10% 할인",
    t: {
      en: { sub: "Pizza", benefit: "10% off" },
      zh: { sub: "披薩", benefit: "9 折" },
      ja: { sub: "ピザ", benefit: "10% オフ" },
    } },
  { name: "Pho19 Mactan", cat: "food", sub: "베트남 쌀국수", disc: "10%", benefit: "10% 할인",
    t: {
      en: { sub: "Vietnamese pho", benefit: "10% off" },
      zh: { sub: "越南河粉", benefit: "9 折" },
      ja: { sub: "ベトナムフォー", benefit: "10% オフ" },
    } },
  { name: "Reysol", cat: "food", sub: "식당 · 카페", disc: "10%", benefit: "10% 할인", isNew: true,
    t: {
      en: { sub: "Restaurant · cafe", benefit: "10% off" },
      zh: { sub: "餐廳 · 咖啡廳", benefit: "9 折" },
      ja: { sub: "レストラン · カフェ", benefit: "10% オフ" },
    } },
  { name: "KAYA Korean BBQ Mactan Cebu", cat: "food", sub: "한식 BBQ · 막탄", disc: "5%", benefit: "5% 할인",
    t: {
      en: { sub: "Korean BBQ · Mactan", benefit: "5% off" },
      zh: { sub: "韓式燒烤 · 麥克坦", benefit: "95 折" },
      ja: { sub: "韓国 BBQ · マクタン", benefit: "5% オフ" },
    } },
  { name: "Nimo Brew", cat: "food", sub: "세계 음식 · 퓨전", disc: "5%", benefit: "5% 할인",
    t: {
      en: { sub: "International · fusion", benefit: "5% off" },
      zh: { sub: "異國料理 · 創意料理", benefit: "95 折" },
      ja: { sub: "各国料理 · フュージョン", benefit: "5% オフ" },
    } },
  { name: "Yang Hero", cat: "food", sub: "IT파크점 · 파크몰점", disc: "5%",
    benefit: "IT파크점 · 파크몰점 모두 5% 할인", isNew: true,
    t: {
      en: { sub: "IT Park · Parkmall", benefit: "5% off at both the IT Park and Parkmall branches" },
      zh: { sub: "IT Park 店 · Parkmall 店", benefit: "IT Park 店與 Parkmall 店皆為 95 折" },
      ja: { sub: "IT パーク店 · パークモール店", benefit: "IT パーク店・パークモール店ともに 5% オフ" },
    } },
  { name: "Four Seasons in Malibago", cat: "food", sub: "식당 · 카페 · 말리바고", disc: "5%",
    benefit: "5% 할인", note: "허니트리(Honey Tree) 건물 위층에 있어요.", isNew: true,
    t: {
      en: { sub: "Restaurant · cafe · Malibago", benefit: "5% off", note: "Upstairs in the Honey Tree building." },
      zh: { sub: "餐廳 · 咖啡廳 · Malibago", benefit: "95 折", note: "位於 Honey Tree 大樓樓上。" },
      ja: { sub: "レストラン · カフェ · マリバゴ", benefit: "5% オフ", note: "Honey Tree ビルの上階にあります。" },
    } },
  { name: "소복소복 sobok-sobok", cat: "food", sub: "한식", disc: "₱50",
    benefit: "메인 요리 ₱50 할인", isNew: true,
    t: {
      en: { name: "sobok-sobok", sub: "Korean", benefit: "₱50 off main dishes" },
      zh: { name: "sobok-sobok", sub: "韓式料理", benefit: "主餐折抵 ₱50" },
      ja: { name: "ソボクソボク sobok-sobok", sub: "韓国料理", benefit: "メイン料理 ₱50 引き" },
    } },
  { name: "Yukimaru", cat: "food", sub: "식당 · 카페", disc: "1잔 무료",
    benefit: "음료 1잔 무료", isNew: true,
    t: {
      en: { sub: "Restaurant · cafe", disc: "1 free", benefit: "1 free drink" },
      zh: { sub: "餐廳 · 咖啡廳", disc: "1 杯免費", benefit: "免費飲料 1 杯" },
      ja: { name: "雪丸 Yukimaru", sub: "レストラン · カフェ", disc: "1 杯無料", benefit: "ドリンク 1 杯無料" },
    } },

  /* ---------- ☕ 카페 ---------- */
  { name: "Flavour Coffee Station", cat: "cafe", sub: "카페", disc: "15%", benefit: "15% 할인",
    t: {
      en: { sub: "Cafe", benefit: "15% off" },
      zh: { sub: "咖啡廳", benefit: "85 折" },
      ja: { sub: "カフェ", benefit: "15% オフ" },
    } },
  { name: "Vibe Bar and Cafe", cat: "cafe", sub: "바 · 카페", disc: "13%", benefit: "13% 할인",
    t: {
      en: { sub: "Bar · cafe", benefit: "13% off" },
      zh: { sub: "酒吧 · 咖啡廳", benefit: "87 折" },
      ja: { sub: "バー · カフェ", benefit: "13% オフ" },
    } },
  { name: "Unfinished Coffee Shop Lapu-Lapu", cat: "cafe", sub: "카페", disc: "10%", benefit: "10% 할인",
    t: {
      en: { sub: "Cafe", benefit: "10% off" },
      zh: { sub: "咖啡廳", benefit: "9 折" },
      ja: { sub: "カフェ", benefit: "10% オフ" },
    } },
  { name: "Winning Cafe", cat: "cafe", sub: "카페", disc: "10%", benefit: "10% 할인",
    note: "예약은 대만 매니저 Lowry 에게 부탁해 주세요.", isNew: true,
    t: {
      en: { sub: "Cafe", benefit: "10% off", note: "Ask Lowry, the Taiwanese manager, to book for you." },
      zh: { sub: "咖啡廳", benefit: "9 折", note: "請洽台灣經理 Lowry 協助訂位。" },
      ja: { sub: "カフェ", benefit: "10% オフ", note: "予約は台湾人マネージャーの Lowry にお願いしてください。" },
    } },
  { name: "omni.brew", cat: "cafe", sub: "카페", disc: "10%", benefit: "10% 할인", isNew: true,
    t: {
      en: { sub: "Cafe", benefit: "10% off" },
      zh: { sub: "咖啡廳", benefit: "9 折" },
      ja: { sub: "カフェ", benefit: "10% オフ" },
    } },
  { name: "UkeHub Cafe", cat: "cafe", sub: "카페", disc: "5~10%", benefit: "음식 5% · 음료 10% 할인",
    t: {
      en: { sub: "Cafe", benefit: "5% off food · 10% off drinks" },
      zh: { sub: "咖啡廳", benefit: "餐點 95 折 · 飲料 9 折" },
      ja: { sub: "カフェ", benefit: "フード 5% オフ · ドリンク 10% オフ" },
    } },
  { name: "Buzzed Station", cat: "cafe", sub: "카페", disc: "5~20%", benefit: "음식 5% · 오후 5-8시 음료 20% 할인",
    t: {
      en: { sub: "Cafe", benefit: "5% off food · 20% off drinks from 5 to 8 p.m." },
      zh: { sub: "咖啡廳", benefit: "餐點 95 折 · 下午 5–8 點飲料 8 折" },
      ja: { sub: "カフェ", benefit: "フード 5% オフ · 17〜20 時はドリンク 20% オフ" },
    } },

  /* ---------- 💆 스파 · 네일 · 다이빙 ---------- */
  { name: "Cheeva Spa", cat: "spa", sub: "스파 · 마사지", disc: "20%", benefit: "20% 할인",
    t: {
      en: { sub: "Spa · massage", benefit: "20% off" },
      zh: { sub: "水療 · 按摩", benefit: "8 折" },
      ja: { sub: "スパ · マッサージ", benefit: "20% オフ" },
    } },
  { name: "Ocean Massage", cat: "spa", sub: "마사지", disc: "20%", benefit: "20% 할인",
    note: "예약할 때 LCIC 학생이라고 꼭 말해 주세요 · 2명 이상이면 픽업/드랍 제공",
    map: "https://maps.app.goo.gl/Dz19tPmybYRrWReZA",
    t: {
      en: { sub: "Massage", benefit: "20% off",
        note: "Tell them you are an LCIC student when you book · free pick-up/drop-off for 2 or more people" },
      zh: { sub: "按摩", benefit: "8 折",
        note: "預約時請告知您是 LCIC 學生 · 2 人以上提供免費接送" },
      ja: { sub: "マッサージ", benefit: "20% オフ",
        note: "予約時に LCIC の学生だと必ず伝えてください · 2 名以上は送迎無料" },
    } },
  { name: "VEL SPA", cat: "spa", sub: "스파 · 마사지", disc: "20%",
    benefit: "20% 할인 · 혼자 가도 픽업/드랍 무료", isNew: true,
    t: {
      en: { sub: "Spa · massage", benefit: "20% off · free pick-up/drop-off even for one person" },
      zh: { sub: "水療 · 按摩", benefit: "8 折 · 單人也提供免費接送" },
      ja: { sub: "スパ · マッサージ", benefit: "20% オフ · 1 名でも送迎無料" },
    } },
  { name: "M beauty salon and Nails", cat: "spa", sub: "미용실 · 네일 · Salinas Premier", disc: "10%",
    benefit: "10% 할인", isNew: true,
    t: {
      en: { sub: "Salon · nail · Salinas Premier", benefit: "10% off" },
      zh: { sub: "美髮 · 美甲 · Salinas Premier", benefit: "9 折" },
      ja: { sub: "美容室 · ネイル · Salinas Premier", benefit: "10% オフ" },
    } },
  { name: "COCORABIN 네일샵", cat: "spa", sub: "네일 · 뷰티", disc: "10%",
    benefit: "시술 요금 10% 할인 · 픽업/드랍 무료 · 카페 음료 무료 (학생증 필참)",
    note: "예약 — 전화 032 328 5887 · 스마트 0969 378 8158 · 카톡 cocorabin · 페이스북 cocorabin nail",
    tel: "0323285887", menu: "assets/partner/cocorabin-poster.png", menuLabel: "🖼 안내문 · 예약 QR",
    t: {
      en: { name: "COCORABIN Nail Salon", sub: "Nail · beauty",
        benefit: "10% off services · free pick-up/drop-off · free cafe drink (student ID required)",
        note: "Booking — Tel 032 328 5887 · Smart 0969 378 8158 · KakaoTalk cocorabin · Facebook cocorabin nail",
        menuLabel: "🖼 Flyer · booking QR" },
      zh: { name: "COCORABIN 美甲沙龍", sub: "美甲 · 美容",
        benefit: "服務 9 折 · 免費接送 · 免費咖啡飲品(需出示學生證)",
        note: "預約 — 電話 032 328 5887 · Smart 0969 378 8158 · KakaoTalk cocorabin · Facebook cocorabin nail",
        menuLabel: "🖼 說明 · 預約 QR" },
      ja: { name: "COCORABIN ネイルサロン", sub: "ネイル · ビューティー",
        benefit: "施術料金 10% オフ · 送迎無料 · カフェドリンク無料(学生証提示)",
        note: "予約 — 電話 032 328 5887 · Smart 0969 378 8158 · KakaoTalk cocorabin · Facebook cocorabin nail",
        menuLabel: "🖼 案内 · 予約 QR" },
    } },
];
