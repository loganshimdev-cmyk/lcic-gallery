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
