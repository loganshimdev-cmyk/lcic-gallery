# lcic-gallery scripts

`lcic-campus.com` 갤러리/공지 데이터를 Supabase에 업로드·관리하는 Node.js 유틸리티 모음.

원래 `lcic-portal` 리포에 있던 것을 이관 (lcic-portal 삭제 시 보존 목적).

## 대상 Supabase

`https://rzsmcysgijeshiiuyqjn.supabase.co` (lcic-gallery 버킷 + 관련 테이블)

> 참고: lcic-campus.com의 메인 앱 데이터(notices/faqs)는 다른 Supabase(`cedienlogevuhgqmcgph` / lcic-cels)를 쓴다. 이 스크립트들은 **갤러리 전용**.

## 셋업

```bash
cd scripts
npm install                              # @supabase/supabase-js + sharp 설치
cp .env.example .env                     # 또는 직접 env 변수 export
# .env에 SUPABASE_SERVICE_ROLE_KEY 입력
```

필요한 env:

| 키 | 용도 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | rzsmcysgijeshiiuyqjn 프로젝트의 service_role 키. **절대 커밋 금지**. |

## 스크립트별 용도

| 파일 | 기능 |
|---|---|
| `upload-student-photos.mjs` | 학생 사진(`pictures/students/`) → Supabase storage 업로드 |
| `upload-sports-photos.mjs` | 스포츠 사진(`pictures/sports/`) → 업로드 |
| `upload-sports-heic.mjs` | iPhone HEIC 사진 → JPG 변환 후 업로드 (sharp 사용) |
| `generate-student-index.mjs` | 학생 사진 인덱스 JSON 생성 |
| `apply-labels.mjs` | 사진에 라벨/카테고리 메타데이터 적용 |

## 실행

```bash
node scripts/upload-student-photos.mjs
node scripts/upload-sports-photos.mjs
# 등등
```

스크립트별로 입력 경로/옵션은 파일 상단 주석 참조.

---

## 오리엔테이션 덱 (`orientation-*.py`)

`lcic-campus.com/orientation*/` 슬라이드 덱을 만들고 유지하는 파이썬 스크립트.
Supabase와 무관하며 `pip install pillow fonttools brotli` 만 있으면 된다.

**에셋 폴더는 여섯 덱이 공유한다.** `orientation/assets/` 를 원본·백석대본
(`orientation2`)·외박금지본(`orientation3`)·동의대본(`orientation-oct`)·
단국대본(`orientation-dankook`) 이 함께 쓰고, 8월본(`orientation-aug`, `aug2`)만
자기 `orientation-aug/assets/` 를 쓴다. 그래서 에셋을 손대면 다섯 덱이 한꺼번에
영향을 받는다.

| 파일 | 기능 |
|---|---|
| `orientation-build-dankook.py` | 원본 덱 → 2027년 1월 단국대본 생성 (다음 기수 변형본의 본보기) |
| `orientation-optimize-assets.py` | 공유 사진·로고 축소 (145MB → 13MB) |
| `orientation-subset-fonts.py` | Pretendard·Fraunces 서브셋 (6.9MB → 0.6MB) |
| `orientation-patch-lazy.py` | 영상 `preload="none"` + 배경/이미지 지연 로딩 |

```bash
python scripts/orientation-optimize-assets.py            # 미리보기
python scripts/orientation-optimize-assets.py --apply    # 적용
python scripts/orientation-subset-fonts.py --apply
python scripts/orientation-patch-lazy.py                 # 멱등, 바로 적용
python scripts/orientation-build-dankook.py
```

### 알아둘 것

- **덱 문구를 고쳤으면 `orientation-subset-fonts.py` 를 다시 돌린다.**
  폰트에 없는 글자는 시스템 한글 폰트로 대체되어 글꼴만 달라진다(깨지지는 않는다).
- 사진·폰트 스크립트는 작업 폴더가 아니라 **git 의 최적화 직전 커밋
  (`abcdde8`) 에 있는 원본**에서 작업한다. 몇 번을 돌려도 결과가 같고, 이미 줄인
  파일을 또 줄여 화질을 깎는 일이 없다. 두 스크립트의 `BASE_COMMIT` 상수가 그것.
- 로고는 투명도 때문에 **PNG 로 둔다.** JPEG 로 바꾸면 배경이 흰색으로 박힌다.
- 영상 2개(홍보 54MB + 센터장 인사말 58MB)는 줄이지 않았다. `preload="none"` 이라
  재생 버튼을 눌러야 받는다.
- 측정값(2026-10-19): 첫 화면 262MB·92초 → **1.0MB·2.4초**, 32쪽 전부 봐도 13.9MB.
