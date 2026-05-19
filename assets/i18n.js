// LCIC inline i18n — toggles between Korean (source), English, and Traditional
// Chinese. Translatable elements carry data-i18n-<lang> attributes whose value
// replaces innerHTML when that language is active. The original Korean
// innerHTML is cached lazily into data-i18n-ko on first apply so it can be
// restored. Attribute swaps use data-i18n-<lang>-attr with the format
// "attrName|value||attrName2|value2".
(function () {
  const STORAGE_KEY = "lcic-lang";
  const SUPPORTED = ["ko", "en", "zh"];
  const DEFAULT_LANG = "ko";
  // <html lang="..."> uses BCP-47 codes; Traditional Chinese (Taiwan).
  const HTML_LANG = { ko: "ko", en: "en", zh: "zh-TW" };

  function readInitialLang() {
    const url = new URLSearchParams(location.search).get("lang");
    if (SUPPORTED.includes(url)) return url;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
    return DEFAULT_LANG;
  }

  let currentLang = readInitialLang();
  document.documentElement.lang = HTML_LANG[currentLang] || currentLang;

  // Map a language code to the data-i18n-<lang> dataset key.
  function datasetKey(lang) {
    if (lang === "en") return "i18nEn";
    if (lang === "zh") return "i18nZh";
    return "i18nKo";
  }
  function datasetAttrKey(lang) {
    if (lang === "en") return "i18nEnAttr";
    if (lang === "zh") return "i18nZhAttr";
    return "i18nKoAttr";
  }

  function applyTo(root) {
    const scope = root || document;
    // Translatable innerHTML: elements opt in by carrying any data-i18n-<lang>
    // attribute. We treat the source-language (KO) value as the fallback.
    const selector = "[data-i18n-en], [data-i18n-zh]";
    scope.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.i18nKo === undefined) {
        el.dataset.i18nKo = el.innerHTML;
      }
      const key = datasetKey(currentLang);
      const value = el.dataset[key];
      // Fall back silently to Korean when a translation is missing.
      el.innerHTML = (value !== undefined && value !== "") ? value : el.dataset.i18nKo;
    });

    // Translatable attributes
    const attrSelector = "[data-i18n-en-attr], [data-i18n-zh-attr]";
    scope.querySelectorAll(attrSelector).forEach((el) => {
      // Pick any non-Korean spec to know which attributes to capture.
      const specEn = el.dataset.i18nEnAttr;
      const specZh = el.dataset.i18nZhAttr;
      const refSpec = specEn || specZh;
      if (!refSpec) return;

      if (el.dataset.i18nKoAttr === undefined) {
        const koParts = [];
        refSpec.split("||").forEach((pair) => {
          const [name] = pair.split("|");
          if (name) koParts.push(name + "|" + (el.getAttribute(name) || ""));
        });
        el.dataset.i18nKoAttr = koParts.join("||");
      }

      const sourceKey = datasetAttrKey(currentLang);
      let source = el.dataset[sourceKey];
      if (source === undefined || source === "") source = el.dataset.i18nKoAttr;
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
    const titleEl = document.querySelector("title[data-i18n-en], title[data-i18n-zh]");
    if (!titleEl) return;
    if (titleEl.dataset.i18nKo === undefined) titleEl.dataset.i18nKo = titleEl.textContent;
    const key = datasetKey(currentLang);
    const value = titleEl.dataset[key];
    titleEl.textContent = (value !== undefined && value !== "") ? value : titleEl.dataset.i18nKo;
  }

  function paintToggle() {
    document.querySelectorAll("[data-lang-toggle]").forEach((wrap) => {
      wrap.querySelectorAll("[data-lang-to]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.langTo === currentLang);
        btn.setAttribute("aria-pressed", btn.dataset.langTo === currentLang ? "true" : "false");
      });
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang) || lang === currentLang) return;
    currentLang = lang;
    document.documentElement.lang = HTML_LANG[lang] || lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTo(document);
    paintTitle();
    paintToggle();
    document.dispatchEvent(new CustomEvent("lcic:langchange", { detail: { lang } }));
  }

  function bindToggles() {
    document.querySelectorAll("[data-lang-toggle]").forEach((wrap) => {
      if (wrap.dataset.langBound) return;
      wrap.dataset.langBound = "1";
      wrap.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-lang-to]");
        if (!btn) return;
        setLang(btn.dataset.langTo);
      });
    });
  }

  window.lcicLang = {
    get current() {
      return currentLang;
    },
    set: setLang,
    // Pick a localized string. Pass a map { ko, en, zh } or just (ko, en).
    t: function (ko, en, zh) {
      if (typeof ko === "object" && ko !== null) {
        const map = ko;
        return map[currentLang] || map.en || map.ko || "";
      }
      if (currentLang === "zh") return (zh !== undefined && zh !== "") ? zh : (en || ko);
      if (currentLang === "en") return en || ko;
      return ko;
    },
    apply: applyTo,
  };

  function init() {
    applyTo(document);
    paintTitle();
    paintToggle();
    bindToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
