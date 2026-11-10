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
  let current = "en",
    observer;
  const originals = new WeakMap(),
    attributes = new WeakMap();
  const errors = {
    authentication_required: "Open the dashboard from Telegram again.",
    origin_denied: "This website is not allowed to access the dashboard.",
    farm_not_found: "Farm not found.",
    not_found: "Page not found.",
    invalid_request: "Check the submitted values and try again.",
    body_too_large: "The submitted request is too large.",
    stale_version: "This row changed. Reload it before saving.",
    account_busy: "This farm is running. Stop it before editing.",
    job_busy: "Stop the current operation before changing its settings.",
    service_busy: "All available job slots are busy. Try again shortly.",
    service_stopping: "The service is stopping. Try again shortly.",
    no_functions: "Select at least one function before starting.",
    no_farms: "No enabled farms are available in the selected range.",
    farm_disabled: "Enable the selected farm before starting.",
    invalid_workers: "The requested worker count is not available.",
    account_not_saved: "The account could not be saved. Check its details.",
    configured_farm_limit: "The configured farm limit has been reached.",
    internal_error: "The operation could not be completed. Try again shortly.",
    desktop_assignment_required:
      "Farms are assigned by the operator. Share your Telegram ID with support.",
    invalid_locale: "Choose a supported language.",
    capture_failed: "The session could not be captured. Check your account details.",
    invalid_credentials: "Check your account email and password.",
  };
  const events = {
    queued: "Waiting for an available worker.",
    running: "Working on selected farms.",
    cycle_started: "Cycle started.",
    cycle_finished: "Cycle finished.",
    waiting: "Waiting before the next cycle.",
    stopping: "Finishing the current safe step.",
    completed: "Operation completed.",
    cancelled: "Operation stopped.",
    completed_with_errors: "Operation completed with function errors. Check the failure count.",
    failed: "Operation could not be completed.",
    farm_started: "Farm started.",
    farm_finished: "Farm processed.",
    farm_failed: "Farm operation failed.",
    farm_skipped: "Farm is unavailable or already busy.",
    function_started: "Function started.",
    function_failed: "Function failed; continuing.",
    function_finished: "Function finished.",
    connection_reconnecting: "Reconnecting to the game.",
    idle: "Ready when you are. Only enabled farms and selected functions will run.",
  };
  const patterns = [
    [/^Farm (\d+)$/, "Farm {0}"],
    [/^FARM (\d+)$/, "Farm {0}"],
    [/^Edit Farm (\d+)$/, "Edit farm {0}"],
    [/^Enable Farm (\d+)$/, "Enable farm {0}"],
    [/^Telegram ID: (.+)$/, "Telegram ID: {0}"],
    [/^Kingdom (.+)$/, "Kingdom {0}"],
    [/^Lv\. (.+)$/, "Level {0}"],
    [/^Level (\d+)$/, "Level {0}"],
    [/^Cycle (\d+)$/, "Cycle {0}"],
    [/^March (\d+)$/, "March {0}"],
    [/^March (\d+) resource$/, "March {0} resource"],
    [/^Move (.+) up$/, "Move {0} up"],
    [/^Move (.+) down$/, "Move {0} down"],
    [/^(\d+) tasks$/, "{0} tasks"],
    [/^(\d+) on$/, "{0} enabled"],
    [/^([\d,]+) farms in your workspace$/, "{0} farms in your workspace"],
    [/^([\d,]+) selected( · Unsaved changes)?$/, "{0} selected"],
    [/^Applies to Farm (\d+) only\.$/, "Applies to farm {0} only."],
    [/^([\d,]+) of ([\d,]+) farms$/, "{0} of {1} farms"],
    [/^([\d,]+)–([\d,]+) of ([\d,]+) farms$/, "{0}–{1} of {2} farms"],
    [/^([\d,]+) farms$/, "{0} farms"],
    [/^Farm (\d+) · (.+)$/, "Farm {0} · {1}"],
  ];
  const aliases = {
    "Safe Food": "Safe food",
    "Safe Wood": "Safe wood",
    "Safe Iron": "Safe iron",
    "Safe Mithril": "Safe mithril",
    "Castle Defense": "Castle defense",
    "Castle Development": "Castle development",
    "Advanced Military": "Advanced military",
    "Any available pet": "Best available",
    Fountain: "Treasure Fountain",
    gathering: "Gathering",
    research: "Research",
    fountain: "Treasure Fountain",
    "hero selection": "Hero selection",
    "Save gathering": "Save gathering",
    "Save research": "Save research",
    "Save fountain": "Save fountain",
    "Save hero selection": "Save hero selection",
    Research: "Research",
    Military: "Military",
  };
  function interpolate(template, args) {
    return template.replace(/\{(\d+)\}/g, (_, i) => (args[i] === undefined ? "" : String(args[i])));
  }
  function t(value, args = []) {
    if (value === null || value === undefined) return "";
    const original = String(value),
      key = original.trim();
    if (!key) return original;
    const catalog = root.SULTARO_LOCALES[current] || root.SULTARO_LOCALES.en,
      entry = aliases[key] || key;
    let translated;
    if (Object.prototype.hasOwnProperty.call(catalog, entry))
      translated = interpolate(catalog[entry], args);
    else {
      for (const [pattern, template] of patterns) {
        const match = key.match(pattern);
        if (match) {
          translated = interpolate(
            catalog[template],
            match
              .slice(1)
              .map((arg, index) => (template === "Farm {0} · {1}" && index === 1 ? arg : t(arg))),
          );
          if (template === "{0} selected" && match[2]) translated += " · " + t("Unsaved changes");
          break;
        }
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
      node.parentElement.closest("script,style,[data-language-select],[data-i18n-skip],.hero-label")
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
      if (node.matches("script,style,[data-language-select]")) return;
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
      document.title = t("SULTARO · Farm control");
      translateNode(document.body);
      for (const n of document.querySelectorAll("[data-language-select]")) n.value = current;
    }
  }
  function observe(node) {
    translateNode(node);
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") for (const n of record.addedNodes) translateNode(n);
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
    error: (code, message) => t(errors[code] || "This request could not be completed."),
    event: (code) => (events[code] ? events[code] : ""),
    errors,
    events,
    patterns,
  };
})(typeof window !== "undefined" ? window : globalThis);
