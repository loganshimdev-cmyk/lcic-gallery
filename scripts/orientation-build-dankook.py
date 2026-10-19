# -*- coding: utf-8 -*-
"""orientation/index.html -> orientation-dankook/index.html (2027년 1월 단국대 기수)

원본(4주 · 외박 허용 · 액티비티 포함)을 베이스로 한다.
- 시간표: 2027 Module A / SC 1 (Jan 4-29) 한 장. 원본의 둘째 시간표는 삭제.
- 출석률 80%, 수강 기준 문구 갱신 (8월본 이후 기준과 동일)
- 학생 직접 송금 안내 슬라이드 1장 추가
"""
import re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'orientation', 'index.html')
DST = os.path.join(ROOT, 'orientation-dankook', 'index.html')

s = open(SRC, encoding='utf-8').read()
orig_len = len(s)


def must(old, new, s, count=1, label=''):
    n = s.count(old)
    if n != count:
        sys.exit('FAIL [%s]: %d개 예상, %d개 발견\n%r' % (label, count, n, old[:120]))
    return s.replace(old, new)


# ---------------------------------------------------------------- 1. 에셋 경로
n = len(re.findall(r'(["\'(])assets/', s))
s = re.sub(r'(["\'(])assets/', r'\1../orientation/assets/', s)
print('에셋 참조 재지정:', n)
assert n == 62, n

# ---------------------------------------------------------------- 2. 타이틀 · 게이트
s = must('<title>LCIC Orientation</title>',
         '<title>LCIC Orientation · 2027 January</title>', s, 1, 'title')
s = must('var KEY="lcic-ot-2026-v3", PW="0706";',
         'var KEY="lcic-ot-2027-jan-v1", PW="0104";', s, 1, 'gate')

# ---------------------------------------------------------------- 3. 표지
s = must('<div class="kicker r d2">2026 · July</div>',
         '<div class="kicker r d2">2027 · January</div>', s, 1, 'cover-month')
s = must('<span class="lbl">Pages</span>\n          <span class="val">36</span>',
         '<span class="lbl">Pages</span>\n          <span class="val">32</span>', s, 1, 'cover-pages')
# Program 칸("ONE-EFL · 4 Weeks")은 그대로 — 단국대도 4주다.

# ---------------------------------------------------------------- 4. 출석률 70% -> 80%
for _old, _new, _lbl in [
    ('학점은 출석률 70% 이상 시 인정', '학점은 출석률 80% 이상 시 인정', 'att-credit'),
    ('출석률 70% 미만 = 수료증 미발급', '출석률 80% 미만 = 수료증 미발급', 'att-fail'),
    ('<b>출석률 70% 이상</b> 시 수료증 발급', '<b>출석률 80% 이상</b> 시 수료증 발급', 'att-pass'),
    ('각 과목 출석 <b>70% 미달</b> 시 수료 불가', '각 과목 출석 <b>80% 미달</b> 시 수료 불가', 'att-cal'),
    ('정규 수업 출석 <b>70% 이상</b> 충족 시', '정규 수업 출석 <b>80% 이상</b> 충족 시', 'att-tor'),
    ('>출석률 70% 이상</h3>', '>출석률 80% 이상</h3>', 'att-head'),
]:
    s = must(_old, _new, s, 1, _lbl)

# ---------------------------------------------------------------- 5. 수강 기준 (6쪽)
# 단국대 요청: "최소 4과목 이상 수강". 원본 문구를 그대로 쓰고
# CELS Jan '27 문서의 "English as a Second Language = 필수 과목"만 한 줄 덧붙인다.
s = must('<li>· 모든 수업은 그룹 수업 · 최소 <b>4과목</b> 이상 수강</li>',
         '<li>· 모든 수업은 그룹 수업 · 최소 <b>4과목</b> 이상 수강</li>\n'
         '            <li>· <b>English as a Second Language</b>는 필수 과목</li>',
         s, 1, 'sub-li')

# ---------------------------------------------------------------- 6. 시간표 (2027 Module A)
def cell(cls, main, sub=None):
    inner = main + ('<span class="sub-opt">%s</span>' % sub if sub else '')
    return '          <td class="cell %s">%s</td>\n' % (cls, inner)


def row(pn, time, cells):
    out = '        <tr>\n          <td class="tm"><span class="pn">%s</span>%s</td>\n' % (pn, time)
    for c in cells:
        out += cell(*c)
    return out + '        </tr>\n'


BUDDY = ('        <tr>\n          <td class="tm"><span class="pn">%s</span>%s</td>\n'
         '          <td class="buddy" colspan="5">One-on-One / Student Buddy &nbsp;(월—금)</td>\n'
         '        </tr>\n')
LUNCH = '        <tr><td class="lunch" colspan="6">Lunch · 11:50 — 12:40</td></tr>\n'

ESL  = ('eng',   'English as a Second Language')
FIL  = ('fil',   'Filipino History &amp; People / TOEIC S&amp;W', 'Korean / Mandarin / English Communication Skills')
VOC  = ('eff',   'Vocabulary Builder / English For Travel', 'Filipino / SDGs for EFL')
IELT = ('ielts', 'IELTS or TOEIC R&amp;L (B1—C2) / Exam Foundations (A1—A2)', 'Japanese / Effective Speaking')

rows = (
    row('P1', '08:30—10:00', [VOC,  ESL,  ESL,  ESL,  ESL]) +
    row('P2', '10:10—11:40', [FIL,  ESL,  ESL,  ESL,  ESL]) +
    LUNCH +
    row('P3', '12:50—14:20', [FIL,  FIL,  FIL,  IELT, VOC]) +
    row('P4', '14:30—16:00', [IELT, VOC,  IELT, VOC,  IELT]) +
    (BUDDY % ('P5', '16:10—17:00')) +
    (BUDDY % ('P6', '17:10—18:00'))
)

table = ('    <table class="stbl r d4">\n'
         '      <thead><tr><th>교시 / 시간</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th></tr></thead>\n'
         '      <tbody>\n' + rows + '      </tbody>\n    </table>\n')

legend = ('    <div class="legend r d5">\n'
          '      <span><i style="background:rgba(147,197,253,0.4);"></i>English as a Second Language <b>(필수)</b></span>\n'
          '      <span><i style="background:rgba(254,215,170,0.5);"></i>Filipino History + TOEIC S&amp;W</span>\n'
          '      <span><i style="background:rgba(186,230,253,0.5);"></i>Vocabulary Builder + English for Travel</span>\n'
          '      <span><i style="background:rgba(251,207,232,0.5);"></i>IELTS / TOEIC R&amp;L / Exam Foundations</span>\n'
          '      <span style="margin-left:auto; color: var(--text-dim);">첫날 1월 4일은 <b>3교시(12:50)</b>부터 · 모든 수업은 Language Building</span>\n'
          '    </div>\n')

m = re.search(r'<section class="slide sched-page" id="s17"[\s\S]*?\n</section>', s)
if not m:
    sys.exit('FAIL: s17 시간표 슬라이드를 못 찾음')
sec = m.group(0)
sec2 = re.sub(r'(<span class="module-tag r d1">)[^<]*(</span>)',
              lambda mm: mm.group(1) + 'Module A · SC 1' + mm.group(2), sec, count=1)
sec2 = re.sub(r'(<span class="period r d3">)[^<]*(</span>)',
              lambda mm: mm.group(1) + '2027 · January 4 — 29' + mm.group(2), sec2, count=1)
sec2 = re.sub(r'    <table class="stbl r d4">[\s\S]*?    </table>\n', lambda mm: table, sec2, count=1)
sec2 = re.sub(r'    <div class="legend r d5">[\s\S]*?    </div>\n', lambda mm: legend, sec2, count=1)
if sec2 == sec:
    sys.exit('FAIL: s17 내용이 바뀌지 않음')
s = s.replace(sec, sec2, 1)

# 둘째 시간표(s18)는 4주 단일 모듈이라 필요 없다.
m = re.search(r'\n*(?:<!--[^\n]*-->\n)?<section class="slide sched-page" id="s18"[\s\S]*?\n</section>\n', s)
if not m:
    sys.exit('FAIL: s18 을 못 찾음')
print('s18 삭제: %d자' % len(m.group(0)))
s = s[:m.start()] + '\n' + s[m.end():]

# 6쪽에서 "8·9페이지 시간표 참조" -> 한 장이 되었으므로 수정
s = must('전체 프로그램 · 8·9페이지 시간표 참조', '전체 프로그램 · 7페이지 시간표 참조', s, 1, 'curr-ref')

# ------------------------------------------- 6b. 13쪽 "수료 후 개별 여행" (단국대 요청)
s = must('''        <div class="rw-rule rw-rule-warn">
          <div class="rw-rule-head"><span class="rw-icon"><span class="pic pic-alert pic-warn"></span></span><h3>금지 행위</h3></div>''',
         '''        <div class="rw-rule">
          <div class="rw-rule-head"><span class="rw-icon"><span class="pic pic-plane"></span></span><h3>수료 후 개별 여행</h3></div>
          <ul>
            <li>· 프로그램이 끝난 뒤 <b>개별 여행 가능</b></li>
            <li>· <b>관광비자 만료일</b>을 먼저 확인하세요</li>
            <li>· 비자 연장은 <b>학교에서 도와드립니다</b></li>
            <li class="rw-warn">※ 연장 비용은 본인 부담</li>
          </ul>
        </div>
        <div class="rw-rule rw-rule-warn">
          <div class="rw-rule-head"><span class="rw-icon"><span class="pic pic-alert pic-warn"></span></span><h3>금지 행위</h3></div>''',
         s, 1, 'rule-travel')

# ---------------------------------------------------------------- 7. 송금 안내 슬라이드
REMIT = '''
<!-- ============================== 학비 송금 (단국대: 학생 직접 송금) ============================== -->
<section class="slide" id="s-remittance" data-slide="27" style="background: var(--paper-warm);">
  <span class="section-stamp" style="color: var(--accent);">Tuition Payment</span>
  <span class="page-marker"><span>Chapter X</span><span class="rule"></span><span class="pg">27</span></span>
  <div class="slide-inner" style="display: flex; flex-direction: column; gap: clamp(1rem, 1.8vw, 1.5rem);">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--ink); padding-bottom: 12px;">
      <div>
        <div class="kicker r d1" style="color: var(--accent);">Bank Remittance</div>
        <h2 class="r d2">학비 송금.</h2>
      </div>
      <p class="r d3" style="text-align: right; font-size: 0.85rem; color: var(--text-dim);">본인이 직접 은행에서 송금합니다</p>
    </div>

    <div style="display: grid; grid-template-columns: 0.85fr 1.15fr; gap: clamp(1rem, 1.8vw, 1.4rem); align-items: start;">

      <div class="r d4" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: var(--ink); color: #fff; padding: clamp(1.2rem, 2vw, 1.6rem); border-radius: 4px;">
          <div class="kicker" style="color: rgba(255,255,255,0.65); margin-bottom: 8px;">송금액 · Amount</div>
          <div style="font-family: 'Fraunces', serif; font-size: clamp(2rem, 3.6vw, 2.9rem); font-weight: 600; line-height: 1;">260만원</div>
          <div style="font-size: 0.82rem; color: rgba(255,255,255,0.78); margin-top: 10px; line-height: 1.6;">
            <b>원화 그대로</b> 보내시면 됩니다.<br/>은행에서 USD로 환전해 입금됩니다.
          </div>
        </div>

        <div style="background: #fff; border-left: 3px solid var(--accent); padding: clamp(1rem, 1.6vw, 1.3rem);">
          <div class="kicker" style="margin-bottom: 10px;">꼭 지켜주세요</div>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 0.84rem; color: var(--text-dim); line-height: 1.55;">
            <li>· 보내는 분 이름은 <b>학생 본인 이름</b>으로</li>
            <li>· 영문 이름은 <b>여권과 똑같이</b> 적어주세요</li>
            <li>· <b>송금 영수증</b>을 사진으로 남겨두세요</li>
            <li>· 송금 수수료는 <b>보내는 분 부담</b>입니다</li>
          </ul>
        </div>
      </div>

      <div class="r d5" style="background: #fff; border: 1px solid var(--rule); padding: clamp(1.2rem, 2vw, 1.6rem); display: flex; flex-direction: column; gap: 10px;">
        <div class="kicker" style="color: var(--accent);">입금 계좌 · Bank Details</div>
        <div style="display: flex; flex-direction: column; gap: 0;">
          <div class="rm-row"><span class="rm-k">Account Name</span><span class="rm-v"><b>LAPULAPU-CEBU INTERNATIONAL<br/>STUDENT SERVICES PTE.LTD.</b></span></div>
          <div class="rm-row"><span class="rm-k">Bank</span><span class="rm-v">Standard Chartered Bank (Singapore)</span></div>
          <div class="rm-row"><span class="rm-k">Account No.</span><span class="rm-v"><b style="font-size: 1.05em; letter-spacing: 0.02em;">01-04374-853</b> <span style="color: var(--text-dim);">(USD)</span></span></div>
          <div class="rm-row"><span class="rm-k">SWIFT Code</span><span class="rm-v"><b>SCBLSG22</b></span></div>
          <div class="rm-row"><span class="rm-k">Bank Code</span><span class="rm-v">9496 &nbsp;·&nbsp; Branch Code 001</span></div>
          <div class="rm-row"><span class="rm-k">Bank Address</span><span class="rm-v">8 Marina Boulevard #27-01,<br/>Marina Bay Financial Centre, Singapore 018981</span></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px; padding-top: 12px; border-top: 1px solid var(--rule);">
          <div style="background: var(--paper-warm); padding: 10px 12px; border-radius: 4px;">
            <div style="font-size: 0.68rem; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 700;">송금 기한</div>
            <div style="font-size: 0.84rem; font-weight: 700; margin-top: 3px;">연수 담당자 안내</div>
          </div>
          <div style="background: var(--paper-warm); padding: 10px 12px; border-radius: 4px;">
            <div style="font-size: 0.68rem; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 700;">영수증 제출</div>
            <div style="font-size: 0.84rem; font-weight: 700; margin-top: 3px;">연수 담당자 안내</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <style>
    #s-remittance .rm-row { display: grid; grid-template-columns: 112px 1fr; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--rule); align-items: baseline; }
    #s-remittance .rm-row:last-child { border-bottom: 0; }
    #s-remittance .rm-k { font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); font-weight: 700; }
    #s-remittance .rm-v { font-size: 0.86rem; line-height: 1.45; word-break: break-word; }
    @media (max-width: 900px) {
      #s-remittance .slide-inner > div:last-child { grid-template-columns: 1fr; }
    }
  </style>
</section>

'''

m = re.search(r'\n*(?:<!--[^\n]*-->\n)?<section class="slide checklist" id="s24"', s)
if not m:
    sys.exit('FAIL: 출국 전 체크리스트(s24) 앞 위치를 못 찾음')
s = s[:m.start()] + '\n' + REMIT + s[m.start():].lstrip('\n')

# ---------------------------------------------------------------- 8. 쪽번호 재정렬
secs = list(re.finditer(r'<section class="slide[^"]*"[^>]*>', s))
print('최종 쪽수:', len(secs))
starts = [m.start() for m in secs] + [len(s)]
out, prev = [], 0
for i in range(len(secs)):
    n = i + 1
    blk = s[starts[i]:starts[i + 1]]
    blk = re.sub(r'(<section class="slide[^"]*"[^>]*\sdata-slide=")\d+(")',
                 lambda mm: mm.group(1) + str(n) + mm.group(2), blk, count=1)
    blk = re.sub(r'(<span class="pg">)\d+(</span>)',
                 lambda mm: mm.group(1) + '%02d' % n + mm.group(2), blk, count=1)
    out.append(s[prev:starts[i]]); out.append(blk); prev = starts[i + 1]
s = ''.join(out) + s[prev:]

# ---------------------------------------------------------------- 검증
for bad in ['출석률 70%', '출석 <b>70%', '2026 · July', 'Module B · SC 8',
            '8·9페이지']:
    if bad in s:
        sys.exit('FAIL: 잔존 %r' % bad)
assert s.count('Module A · SC 1') == 1
assert s.count('2027 · January 4 — 29') == 1
assert s.count('<section class="slide sched-page"') == 1, '시간표는 한 장이어야 함'
assert s.count('01-04374-853') == 1 and s.count('SCBLSG22') == 1
assert '외박 신청' in s and 'Travel Waiver' in s, '외박 허용본이어야 함'
assert '주짓수' in s and '7D 망고' in s and '마시멜로' in s, '액티비티가 살아 있어야 함'
assert s.count('최소 <b>4과목</b> 이상 수강') == 1
assert s.count('수료 후 개별 여행') == 1 and s.count('관광비자 만료일') == 1
assert s.count('data-slide="32"') == 1 and 'data-slide="33"' not in s

os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, 'w', encoding='utf-8').write(s)
print('완성:', DST, orig_len, '->', len(s))
