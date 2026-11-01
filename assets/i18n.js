// LCIC inline i18n — Korean (source) + English, Traditional Chinese (Taiwan),
// Simplified Chinese, Japanese, Vietnamese, Thai.
// Translatable elements carry data-i18n-<lang> attributes whose value replaces
// innerHTML when that language is active:
//   data-i18n-en · data-i18n-zh (繁中, Taiwan) · data-i18n-zh-cn (简中) ·
//   data-i18n-ja · data-i18n-vi · data-i18n-th
// The original Korean innerHTML is cached lazily into data-i18n-ko on first
// apply so it can be restored. Attribute swaps use data-i18n-<lang>-attr with
// the format "attrName|value||attrName2|value2".
// 2026-11-01: 간체·베트남어·태국어 추가(사용자 지시 "버디·외박부터 다 있어야 한다").
(function () {
  const STORAGE_KEY = "lcic-lang";
  const SUPPORTED = ["ko", "en", "zh", "zh-cn", "ja", "vi", "th"];
  // 처음 오는 사람은 영어로 시작한다(2026-09-29). 한 번 고른 언어는 lcic-lang 에 남아 그대로 간다.
  const DEFAULT_LANG = "en";
  // <html lang="..."> uses BCP-47 codes. "zh" stays Traditional Chinese (Taiwan).
  const HTML_LANG = { ko: "ko", en: "en", zh: "zh-TW", "zh-cn": "zh-CN", ja: "ja", vi: "vi", th: "th" };
  // 페이지 스크립트와 DB(공지·FAQ·제휴 업체)는 ko·en·zh·ja 넷만 안다 — 가장 가까운 것을 읽는다.
  // lcicLang.current 는 이 값을 돌려준다(기존 페이지 코드가 그대로 돈다). 실제 언어는 lcicLang.lang.
  const DATA_LANG = { ko: "ko", en: "en", zh: "zh", "zh-cn": "zh", ja: "ja", vi: "en", th: "en" };
  // data-i18n-<lang> → dataset key
  const DS = { ko: "i18nKo", en: "i18nEn", zh: "i18nZh", "zh-cn": "i18nZhCn", ja: "i18nJa", vi: "i18nVi", th: "i18nTh" };
  const ATTRS = ["en", "zh", "zh-cn", "ja", "vi", "th"];
  const SELECTOR = ATTRS.map((l) => "[data-i18n-" + l + "]").join(", ");
  const ATTR_SELECTOR = ATTRS.map((l) => "[data-i18n-" + l + "-attr]").join(", ");
  // 스크립트가 그리는 짧은 문구(영어 원문 → 번역). 페이지가 그 언어 값을 안 줬을 때만 쓴다.
  const DICT = {
    "zh-cn": {
      "Pinned notice": "置顶公告", "No notices have been posted yet.": "目前还没有任何公告。", "Pinned": "置顶",
      "Other": "其他", "No matching questions.": "没有找到匹配的问题。", "No FAQs have been posted yet.": "目前还没有任何常见问题。",
      "All": "全部",
    },
    vi: {
      "Pinned notice": "Thông báo được ghim", "No notices have been posted yet.": "Chưa có thông báo nào được đăng.",
      "Pinned": "Đã ghim", "Other": "Khác", "No matching questions.": "Không có câu hỏi phù hợp.",
      "No FAQs have been posted yet.": "Chưa có câu hỏi thường gặp nào được đăng.", "All": "Tất cả",
    },
    th: {
      "Pinned notice": "ประกาศที่ปักหมุด", "No notices have been posted yet.": "ยังไม่มีประกาศ", "Pinned": "ปักหมุด",
      "Other": "อื่น ๆ", "No matching questions.": "ไม่พบคำถามที่ตรงกัน", "No FAQs have been posted yet.": "ยังไม่มีคำถามที่พบบ่อย",
      "All": "ทั้งหมด",
    },
  };

  const has = (v) => v !== undefined && v !== null && v !== "";

  function readInitialLang() {
    const url = new URLSearchParams(location.search).get("lang");
    if (SUPPORTED.includes(url)) return url;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
    return DEFAULT_LANG;
  }

  let currentLang = readInitialLang();
  document.documentElement.lang = HTML_LANG[currentLang] || currentLang;

  // 그 언어 값이 없을 때: (간체는 사전 → 번체를 화면에서 간체로) → 영어 → 한국어.
  function pickElement(ds) {
    if (currentLang === "ko") return ds.i18nKo;
    const own = ds[DS[currentLang]];
    if (has(own)) return own;
    const dict = DICT[currentLang];
    if (dict && has(ds.i18nEn) && has(dict[ds.i18nEn])) return dict[ds.i18nEn];
    if (currentLang === "zh-cn" && has(ds.i18nZh)) return ds.i18nZh;
    if (has(ds.i18nEn)) return ds.i18nEn;
    return ds.i18nKo;
  }
  function pickAttrSpec(ds) {
    if (currentLang === "ko") return ds.i18nKoAttr;
    const own = ds[DS[currentLang] + "Attr"];
    if (has(own)) return own;
    if (currentLang === "zh-cn" && has(ds.i18nZhAttr)) return ds.i18nZhAttr;
    if (has(ds.i18nEnAttr)) return ds.i18nEnAttr;
    return ds.i18nKoAttr;
  }

  function applyTo(root) {
    const scope = root || document;
    scope.querySelectorAll(SELECTOR).forEach((el) => {
      if (el.tagName === "TITLE") return; // paintTitle 이 따로 한다
      if (el.dataset.i18nKo === undefined) el.dataset.i18nKo = el.innerHTML;
      el.innerHTML = pickElement(el.dataset);
    });

    scope.querySelectorAll(ATTR_SELECTOR).forEach((el) => {
      // Pick any non-Korean spec to know which attributes to capture.
      let refSpec = "";
      for (const l of ATTRS) { const v = el.dataset[DS[l] + "Attr"]; if (has(v)) { refSpec = v; break; } }
      if (!refSpec) return;

      if (el.dataset.i18nKoAttr === undefined) {
        const koParts = [];
        refSpec.split("||").forEach((pair) => {
          const [name] = pair.split("|");
          if (name) koParts.push(name + "|" + (el.getAttribute(name) || ""));
        });
        el.dataset.i18nKoAttr = koParts.join("||");
      }

      const source = pickAttrSpec(el.dataset) || el.dataset.i18nKoAttr;
      source.split("||").forEach((pair) => {
        const idx = pair.indexOf("|");
        if (idx < 0) return;
        const name = pair.slice(0, idx);
        const value = pair.slice(idx + 1);
        if (name) el.setAttribute(name, value);
      });
    });
  }

  function paintTitle() {
    const titleEl = document.querySelector(ATTRS.map((l) => "title[data-i18n-" + l + "]").join(", "));
    if (!titleEl) return;
    if (titleEl.dataset.i18nKo === undefined) titleEl.dataset.i18nKo = titleEl.textContent;
    titleEl.textContent = pickElement(titleEl.dataset);
  }

  function paintToggle() {
    document.querySelectorAll("[data-lang-toggle]").forEach((wrap) => {
      wrap.querySelectorAll("[data-lang-to]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.langTo === currentLang);
        btn.setAttribute("aria-pressed", btn.dataset.langTo === currentLang ? "true" : "false");
        // 데스크톱의 "EN ▾" 버튼에 지금 언어의 짧은 이름을 띄운다
        if (btn.dataset.langTo === currentLang) {
          const label = wrap.querySelector("[data-lang-current]");
          const code = btn.querySelector(".lang-code");
          if (label) label.textContent = code ? code.textContent : btn.textContent;
        }
      });
    });
  }
  function closeMenus(except) {
    document.querySelectorAll("[data-lang-toggle].open").forEach((wrap) => {
      if (wrap === except) return;
      wrap.classList.remove("open");
      const cur = wrap.querySelector(".lang-current");
      if (cur) cur.setAttribute("aria-expanded", "false");
    });
  }

  // ── 간체: DB·스크립트 문구는 번체(zh)뿐이라, 간체를 고르면 화면에 그려진 글자를 간체로 바꾼다.
  // 나중에 그려지는 목록·모달도 잡도록 MutationObserver 를 건다. 다른 언어로 가면 끈다
  // (그 뒤 고정 문구는 속성에서, 목록은 각 페이지가 lcic:langchange 로 다시 그린다).
  let cc = null, ccLoading = null, observer = null;
  function loadConverter() {
    if (cc) return Promise.resolve(cc);
    if (!ccLoading) {
      ccLoading = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/t2cn.js";
        s.onload = () => {
          try { cc = window.OpenCC.Converter({ from: "tw", to: "cn" }); resolve(cc); } catch (e) { reject(e); }
        };
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return ccLoading;
  }
  function simplify(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      // 언어 고르기 목록(繁體中文 등)은 그대로 둔다
      acceptNode: (n) => (n.parentNode && (/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) || (n.parentNode.closest && n.parentNode.closest("[data-lang-toggle]")))) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let n;
    while ((n = walker.nextNode())) {
      const v = cc(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  }
  function startSimplified() {
    loadConverter().then(() => {
      if (currentLang !== "zh-cn") return;
      simplify(document.body);
      if (!observer) {
        observer = new MutationObserver((ms) => {
          if (currentLang !== "zh-cn") return;
          ms.forEach((m) => m.addedNodes.forEach((node) => {
            if (node.nodeType === 3) {
              if (node.parentNode && node.parentNode.closest && node.parentNode.closest("[data-lang-toggle]")) return;
              const v = cc(node.nodeValue); if (v !== node.nodeValue) node.nodeValue = v;
            }
            else if (node.nodeType === 1) simplify(node);
          }));
        });
      }
      observer.observe(document.body, { childList: true, subtree: true });
    }).catch(() => { /* 변환기를 못 받으면 번체 그대로 둔다 */ });
  }
  function stopSimplified() {
    if (observer) observer.disconnect();
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang) || lang === currentLang) return;
    stopSimplified();
    currentLang = lang;
    document.documentElement.lang = HTML_LANG[lang] || lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTo(document);
    paintTitle();
    paintToggle();
    document.dispatchEvent(new CustomEvent("lcic:langchange", { detail: { lang: DATA_LANG[lang], fullLang: lang } }));
    if (lang === "zh-cn") startSimplified();
  }

  function bindToggles() {
    document.querySelectorAll("[data-lang-toggle]").forEach((wrap) => {
      if (wrap.dataset.langBound) return;
      wrap.dataset.langBound = "1";
      wrap.addEventListener("click", (e) => {
        // 데스크톱: "EN ▾" 를 누르면 목록을 열고 닫는다
        const cur = e.target.closest(".lang-current");
        if (cur) {
          const open = !wrap.classList.contains("open");
          closeMenus(wrap);
          wrap.classList.toggle("open", open);
          cur.setAttribute("aria-expanded", open ? "true" : "false");
          return;
        }
        const btn = e.target.closest("[data-lang-to]");
        if (!btn) return;
        setLang(btn.dataset.langTo);
        closeMenus();
      });
    });
    if (!document.documentElement.dataset.langMenuBound) {
      document.documentElement.dataset.langMenuBound = "1";
      document.addEventListener("click", (e) => { if (!e.target.closest("[data-lang-toggle]")) closeMenus(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });
    }
  }

  window.lcicLang = {
    // 기존 페이지 코드용: ko·en·zh·ja 중 하나(간체→zh, 베트남어·태국어→en).
    get current() {
      return DATA_LANG[currentLang];
    },
    // 실제로 고른 언어: ko·en·zh·zh-cn·ja·vi·th
    get lang() {
      return currentLang;
    },
    set: setLang,
    // Pick a localized string. Pass a map { ko, en, zh, ja, "zh-cn", vi, th } or
    // positional (ko, en, zh, ja). Missing translations fall back: ja -> zh -> en,
    // zh-cn -> dictionary -> zh (shown simplified) -> en, vi/th -> dictionary -> en,
    // and finally ko, so a partially translated map still renders something readable.
    t: function (ko, en, zh, ja) {
      const map = (typeof ko === "object" && ko !== null) ? ko : { ko: ko, en: en, zh: zh, ja: ja };
      const pick = (k) => has(map[k]) ? map[k] : null;
      const dict = DICT[currentLang];
      const fromDict = () => (dict && has(map.en) && has(dict[map.en])) ? dict[map.en] : null;
      switch (currentLang) {
        case "ko": return pick("ko") || pick("en") || "";
        case "en": return pick("en") || pick("ko") || "";
        case "zh": return pick("zh") || pick("en") || pick("ko") || "";
        case "ja": return pick("ja") || pick("zh") || pick("en") || pick("ko") || "";
        case "zh-cn": return pick("zh-cn") || fromDict() || pick("zh") || pick("en") || pick("ko") || "";
        default: return pick(currentLang) || fromDict() || pick("en") || pick("ko") || "";
      }
    },
    apply: applyTo,
  };

  function init() {
    applyTo(document);
    paintTitle();
    paintToggle();
    bindToggles();
    if (currentLang === "zh-cn") startSimplified();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
