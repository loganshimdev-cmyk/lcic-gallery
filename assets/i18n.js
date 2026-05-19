// LCIC inline i18n — toggles between Korean (source) and English (data-i18n-en).
// Translatable elements carry a data-i18n-en attribute whose value replaces the
// element's innerHTML when English is active. The original Korean innerHTML is
// cached lazily into data-i18n-ko on first apply so it can be restored.
(function () {
  const STORAGE_KEY = "lcic-lang";
  const SUPPORTED = ["ko", "en"];
  const DEFAULT_LANG = "ko";

  function readInitialLang() {
    const url = new URLSearchParams(location.search).get("lang");
    if (SUPPORTED.includes(url)) return url;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
    return DEFAULT_LANG;
  }

  let currentLang = readInitialLang();
  document.documentElement.lang = currentLang;

  function applyTo(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n-en]").forEach((el) => {
      if (el.dataset.i18nKo === undefined) {
        el.dataset.i18nKo = el.innerHTML;
      }
      el.innerHTML = currentLang === "en" ? el.dataset.i18nEn : el.dataset.i18nKo;
    });
    scope.querySelectorAll("[data-i18n-en-attr]").forEach((el) => {
      // Format: "attrName|en text||attrName2|en text2"
      const spec = el.dataset.i18nEnAttr;
      if (el.dataset.i18nKoAttr === undefined) {
        const koParts = [];
        spec.split("||").forEach((pair) => {
          const [name] = pair.split("|");
          if (name) koParts.push(name + "|" + (el.getAttribute(name) || ""));
        });
        el.dataset.i18nKoAttr = koParts.join("||");
      }
      const source = currentLang === "en" ? spec : el.dataset.i18nKoAttr;
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
    const titleEl = document.querySelector("title[data-i18n-en]");
    if (!titleEl) return;
    if (titleEl.dataset.i18nKo === undefined) titleEl.dataset.i18nKo = titleEl.textContent;
    titleEl.textContent = currentLang === "en" ? titleEl.dataset.i18nEn : titleEl.dataset.i18nKo;
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
    document.documentElement.lang = lang;
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
    t: function (ko, en) {
      return currentLang === "en" ? en : ko;
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
