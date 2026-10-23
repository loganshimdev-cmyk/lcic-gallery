// 한국팀 페이지(summer-2026 · arrivals · report-card · invoice)를 잠그는 키.
//
// 2026-10-23 부터 사람이 외우는 비밀번호 대신 무작위 키로 잠근다. 그전 비밀번호는 이 공개 저장소의
// 커밋 메시지·스크립트에 적혀 있었다. 키를 아는 곳은 둘뿐이다:
//   ① 이 PC 의 ~/.lcic/korea-pages.key  (저장소·Google Drive 밖. 절대 커밋하지 말 것)
//   ② 새 시스템 서버 설정 KOREA_PAGES_KEY (Vercel lcic-students)
// 한국팀은 system.lcic-campus.com 한국팀 보드에서 비밀번호 없이 연다 — 서버가 ②로 풀어 보여 준다.
// 커밋 메시지에 키나 예전 비밀번호를 적지 말 것.

const fs = require("fs");
const os = require("os");
const path = require("path");

const KEY_FILE = path.join(os.homedir(), ".lcic", "korea-pages.key");

function readKoreaKey() {
  if (process.env.KOREA_PAGES_KEY) return process.env.KOREA_PAGES_KEY.trim();
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`한국팀 페이지 키가 없습니다: ${KEY_FILE}\n키를 만든 PC 에서 그 파일을 복사해 오세요(Drive·메신저로 보내지 말 것).`);
  }
  const key = fs.readFileSync(KEY_FILE, "utf8").trim();
  if (key.length < 32) throw new Error(`키가 너무 짧습니다: ${KEY_FILE}`);
  return key;
}

module.exports = { readKoreaKey, KEY_FILE };
