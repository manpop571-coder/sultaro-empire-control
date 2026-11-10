(function (root) {
  "use strict";
  const languages = [
    ["zh-Hant", "繁體中文"],
    ["zh-Hans", "简体中文"],
    ["en", "English"],
    ["id", "Bahasa Indonesia"],
    ["fr", "Français"],
    ["de", "Deutsch"],
    ["th", "ไทย"],
    ["pt", "Português"],
    ["es", "Español"],
    ["tr", "Türkçe"],
    ["it", "Italiano"],
    ["ru", "Русский"],
    ["vi", "Tiếng Việt"],
    ["ja", "日本語"],
    ["ko", "한국어"],
    ["ar", "العربية"],
  ].map(([code, name]) => ({ code, name }));
  let current = "en";
  const originals = new WeakMap(),
    attributes = new WeakMap();
  const errors = {
    authentication_required: "Open this page again from Telegram.",
    farm_not_found: "This farm is not available.",
    not_found: "This page is not available.",
    invalid_request: "Please check your choices and try again.",
    body_too_large: "Please check your choices and try again.",
    stale_version: "These choices changed. Refresh the page and try again.",
    account_busy: "Your farm is busy. Please try again shortly.",
    job_busy: "Your farms are busy. Please try again shortly.",
    service_busy: "Please try again shortly.",
    service_stopping: "Please try again shortly.",
    internal_error: "Please try again later.",
    operator_managed: "Please contact support for help.",
    desktop_assignment_required: "Please contact support for help.",
    invalid_locale: "Choose a supported language.",
    origin_denied: "Please open this page again from Telegram.",
  };
  const aliases = {
    "Safe Food": "Safe food",
    "Safe Wood": "Safe wood",
    "Safe Iron": "Safe iron",
    "Safe Mithril": "Safe mithril",
    "Castle Defense": "Castle defense",
    "Castle Development": "Castle development",
    "Advanced Military": "Advanced military",
    "Any available pet": "Best available",
  };
  const patterns = [
    [/^Farm (\d+)$/, "Farm {0}"],
    [/^Kingdom (.+)$/, "Kingdom {0}"],
    [/^Level (.+)$/, "Level {0}"],
    [/^March (\d+)$/, "March {0}"],
    [/^March (\d+) resource$/, "March {0} resource"],
    [/^(\d+) farms$/, "{0} farms"],
    [/^(\d+) selected$/, "{0} selected"],
    [/^Applies to Farm (\d+) only\.$/, "Applies to farm {0} only."],
  ];
  function format(template, args) {
    return template.replace(/\{(\d+)\}/g, (_, index) =>
      args[index] === undefined ? "" : String(args[index]),
    );
  }
  function t(value, args = []) {
    if (value == null) return "";
    const original = String(value),
      key = original.trim();
    if (!key) return original;
    const catalog = root.SULTARO_LOCALES[current] || root.SULTARO_LOCALES.en,
      entry = aliases[key] || key;
    let translated;
    if (Object.prototype.hasOwnProperty.call(catalog, entry))
      translated = format(catalog[entry], args);
    else
      for (const [pattern, template] of patterns) {
        const match = key.match(pattern);
        if (match) {
          translated = format(catalog[template], match.slice(1));
          break;
        }
      }
    if (translated === undefined) return original;
    return (
      original.slice(0, original.indexOf(key)) +
      translated +
      original.slice(original.indexOf(key) + key.length)
    );
  }
  function skip(node) {
    return (
      node.parentElement &&
      node.parentElement.closest("script,style,[data-language-select],[data-i18n-skip]")
    );
  }
  function translateNode(node) {
    if (node.nodeType === 3) {
      if (skip(node)) return;
      let saved = originals.get(node);
      if (!saved || node.nodeValue !== saved.last)
        saved = { source: node.nodeValue, last: node.nodeValue };
      const next = t(saved.source);
      saved.last = next;
      originals.set(node, saved);
      if (node.nodeValue !== next) node.nodeValue = next;
    } else if (node.nodeType === 1) {
      if (node.matches("script,style,[data-language-select],[data-i18n-skip]")) return;
      let saved = attributes.get(node) || {};
      for (const key of ["placeholder", "aria-label", "title"]) {
        const value = node.getAttribute(key);
        if (value === null) continue;
        let record = saved[key];
        if (!record || value !== record.last) record = { source: value, last: value };
        const next = t(record.source);
        record.last = next;
        saved[key] = record;
        if (value !== next) node.setAttribute(key, next);
      }
      attributes.set(node, saved);
      for (const child of node.childNodes) translateNode(child);
    }
  }
  function setLocale(code) {
    current = languages.some((row) => row.code === code) ? code : "en";
    if (typeof document !== "undefined") {
      document.documentElement.lang = current;
      document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
      document.title = t("SULTARO · My farms");
      translateNode(document.body);
      for (const node of document.querySelectorAll("[data-language-select]")) node.value = current;
    }
  }
  function observe(node) {
    translateNode(node);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") for (const node of record.addedNodes) translateNode(node);
        else translateNode(record.target);
      }
    });
    observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"],
    });
  }
  root.SultaroI18n = {
    languages,
    t,
    setLocale,
    locale: () => current,
    observe,
    error: (code) => t(errors[code] || "Please try again later."),
    errors,
    patterns,
  };
})(typeof window !== "undefined" ? window : globalThis);
