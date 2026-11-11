(function () {
  "use strict";
  const U = window.SultaroUI,
    I = window.SultaroI18n,
    tg = window.Telegram && window.Telegram.WebApp;
  let config = window.SULTARO_CONFIG || {};
  const preview = new URLSearchParams(location.search).get("preview") === "1",
    auth = preview ? "" : (tg && tg.initData) || "",
    app = document.getElementById("app");
  const navigation = [
    ["farms", "My farms", "castle"],
    ["activities", "Activities", "spark"],
    ["settings", "Farm settings", "sliders"],
  ];
  const state = {
    page: "farms",
    user: {},
    catalog: {},
    farms: [],
    total: 0,
    pageNumber: 0,
    selectedFarmId: null,
    activities: U.normalizeActivities([]),
    activityFarms: [],
    activityFarmsLoaded: false,
    activityFarmsLoading: false,
    activityFarmsError: false,
    activitySourceId: null,
    activityTargets: new Set(),
    activitySavedRows: [],
    activityLoading: false,
    activityReady: false,
    activityLoadError: false,
    activityPendingId: null,
    activityExcludedSaved: false,
    activityGroup: "all",
    settingsGroup: "all",
    activityAutomation: null,
    activityOptionsDraft: {},
    activitySaving: false,
    statsDay: new Date().toISOString().slice(0, 10),
    statsData: null,
    statsLoading: false,
    statsError: false,
    settings: {},
    settingsDraft: {},
    prefs: null,
    drafts: {},
    tab: "gathering",
    dirty: false,
    mutations: 0,
    loadingPrefs: false,
  };
  let main,
    toastTimer,
    farmGeneration = 0,
    prefGeneration = 0,
    activityFarmGeneration = 0,
    activityGeneration = 0,
    statsGeneration = 0,
    fieldNumber = 0;
  const shapes = {
    castle: '<path d="M3 21V8h4V4h3v4h4V4h3v4h4v13M2 21h20M10 21v-6h4v6M7 12h1m8 0h1"/>',
    sliders:
      '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/>',
    leaf: '<path d="M20 3C9 2 2 8 4 16c3 7 14 5 16-13ZM4 21 15 10"/>',
    shield: '<path d="m12 3 9 4v6c0 4-5 7-9 9-4-2-9-5-9-9V7l9-4Z"/>',
    star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
    spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    moon: '<path d="M20 14a9 9 0 0 1-10-12A9 9 0 1 0 20 14Z"/>',
    gem: '<path d="m7 3-5 7 10 12 10-12-5-7H7Zm-5 7h20M7 3l5 19 5-19"/>',
    wheat:
      '<path d="M12 22V4m0 13c-5 0-7-3-7-6 4 0 7 2 7 6Zm0-6c5 0 7-3 7-6-4 0-7 2-7 6Zm0-7L10 1"/>',
    wood: '<path d="m12 2-7 9h4l-6 7h7v4h4v-4h7l-6-7h4l-7-9Z"/>',
    iron: '<path d="m6 5 10-2 6 11-9 8L2 15 6 5Zm0 0 7 7 9 2m-9-2v10L2 15"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
  };
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function raw(tag, cls, text) {
    const node = el(tag, cls, text);
    node.dataset.i18nSkip = "true";
    return node;
  }
  function add(node, ...children) {
    for (const child of children.flat())
      if (child !== null && child !== undefined) node.append(child);
    return node;
  }
  function icon(name) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("class", "icon");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = shapes[name] || shapes.spark;
    return node;
  }
  function button(label, handler, cls = "", symbol) {
    const node = el("button", cls);
    node.type = "button";
    if (symbol) node.append(icon(symbol));
    node.append(document.createTextNode(label));
    if (handler) node.addEventListener("click", handler);
    return node;
  }
  function locked(node) {
    node.dataset.mutation = "true";
    node.disabled = preview || state.mutations > 0;
    return node;
  }
  function select(rows, value) {
    const node = el("select");
    for (const row of rows) {
      const option = el("option", "", row.name);
      option.value = row.id;
      if (row.raw) option.dataset.i18nSkip = "true";
      if (row.gameKind) {
        option.dataset.gameKind = row.gameKind;
        option.dataset.gameId = String(row.id);
        option.dir = "auto";
      }
      node.append(option);
    }
    node.value = String(value == null ? "" : value);
    return node;
  }
  function catalogChoices(kind) {
    const labels = U.choiceLabels[kind] || {};
    return (state.catalog[kind] || []).map((row) => {
      const known = Object.prototype.hasOwnProperty.call(labels, String(row.id));
      return {
        ...row,
        name: known ? labels[row.id] : I.t(kind === "research" ? "Research" : "Resources") + " " + row.id,
        raw: !known,
      };
    });
  }
  function field(label, control, help) {
    if (!control.id) control.id = "choice-" + ++fieldNumber;
    const title = el("label", "", label);
    title.htmlFor = control.id;
    return add(el("div", "field"), title, control, help ? el("small", "", help) : null);
  }
  function checkbox(checked) {
    const node = el("input");
    node.type = "checkbox";
    node.checked = checked;
    return node;
  }
  function number(value, min, max) {
    const node = el("input");
    node.type = "number";
    node.value = value;
    node.min = min;
    node.max = max;
    node.step = 1;
    node.required = true;
    return node;
  }
  function switchLabel(text, control, help) {
    return add(
      el("label", "switch-label"),
      add(el("span", "switch-copy"), el("span", "", text), help ? el("small", "", help) : null),
      add(el("span", "switch"), control, el("span", "switch-track")),
    );
  }
  function note(text) {
    return add(el("div", "note"), icon("moon"), el("p", "", text));
  }
  function toast(text, error = false) {
    clearTimeout(toastTimer);
    const node = document.getElementById("toast");
    node.textContent = text;
    node.className = "toast visible" + (error ? " error" : "");
    toastTimer = setTimeout(() => node.classList.remove("visible"), 4500);
  }
  function syncLocks() {
    for (const node of document.querySelectorAll("[data-mutation]"))
      node.disabled = preview || state.mutations > 0 || state.activitySaving;
    for (const node of document.querySelectorAll("[data-activity-source]"))
      node.disabled = state.mutations > 0 || state.activitySaving;
    for (const node of document.querySelectorAll("[data-activity-save]"))
      node.disabled = preview || state.mutations > 0 || state.activitySaving || !state.activityReady ||
        state.activityLoading || !state.activityTargets.size || state.activityTargets.size > 1000;
    for (const node of document.querySelectorAll("[data-activity-all]"))
      node.disabled = preview || state.mutations > 0 || state.activitySaving || state.activityFarms.length > 1000;
  }
  async function api(path, method = "GET", body) {
    if (preview) throw new Error("This is a read-only preview.");
    const changed = method !== "GET";
    if (changed) {
      state.mutations++;
      syncLocks();
    }
    const cancel = new AbortController(),
      timer = setTimeout(() => cancel.abort(), 20000);
    try {
      const response = await fetch(U.apiUrl(config.apiBaseUrl, path, location.hostname), {
        method,
        headers: { Authorization: "tma " + auth, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: cancel.signal,
        cache: "no-store",
        credentials: "omit",
      });
      let result;
      try {
        result = await response.json();
      } catch (_) {
        throw new Error("Please try again later.");
      }
      if (!response.ok || !result.ok) throw new Error(I.error(result.error && result.error.code));
      return result.data;
    } catch (error) {
      if (error.name === "AbortError")
        throw new Error("Please refresh the page before trying again.");
      throw error;
    } finally {
      clearTimeout(timer);
      if (changed) {
        state.mutations--;
        syncLocks();
      }
    }
  }
  function action(handler) {
    return async () => {
      try {
        await handler();
      } catch (error) {
        toast(error.message, true);
      }
    };
  }
  function farmName(farm) {
    return "Farm " + farm.farm_number;
  }
  function selectedFarm() {
    return state.farms.find((f) => String(f.id) === String(state.selectedFarmId));
  }
  function navigate(page) {
    if (!navigation.some((row) => row[0] === page)) return;
    state.page = page;
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    if (page === "activities" && !state.activityFarmsLoaded && !state.activityFarmsLoading)
      loadActivityFarms();
    if (page === "settings" && state.tab === "balances" && state.selectedFarmId)
      loadResourceStats(state.selectedFarmId);
    else if (
      page === "settings" &&
      state.tab !== "shared" &&
      state.selectedFarmId &&
      !state.prefs &&
      !state.loadingPrefs
    )
      loadPreferences(state.selectedFarmId);
  }
  function languageControl() {
    const control = select(
      I.languages.map((row) => ({ id: row.code, name: row.name })),
      I.locale(),
    );
    control.dataset.languageSelect = "true";
    control.className = "language-select";
    control.setAttribute("aria-label", "Language");
    control.addEventListener("change", async () => {
      const previous = I.locale();
      control.disabled = true;
      try {
        if (auth && !preview) {
          const result = await api("/api/me", "PATCH", { locale: control.value });
          state.user = result.user;
        }
        I.setLocale(control.value);
        if (main) layout();
        else gate();
        toast("Language saved.");
      } catch (error) {
        control.value = previous;
        toast(error.message, true);
      } finally {
        control.disabled = false;
      }
    });
    return control;
  }
  function brand() {
    const image = el("img");
    image.src = "./mark.svg?v=20261110-defaults";
    image.alt = "";
    image.width = 43;
    image.height = 43;
    return add(
      el("div", "brand"),
      image,
      add(el("div"), el("strong", "", "SULTARO"), el("span", "", "DAYS OF EMPIRE")),
    );
  }
  function navigationBar(cls) {
    const node = el("nav", cls);
    node.setAttribute("aria-label", "Navigation");
    for (const [id, title, symbol] of navigation) {
      const item = button(title, () => navigate(id), "nav-item", symbol);
      item.dataset.page = id;
      node.append(item);
    }
    return node;
  }
  function layout() {
    app.replaceChildren();
    app.removeAttribute("aria-busy");
    const shell = el("div", "shell"),
      header = el("header", "header"),
      identity = add(
        el("div", "identity"),
        raw("span", "identity-name", state.user.first_name || "SULTARO"),
        add(
          el("div", "identity-id"),
          el("span", "", "Telegram ID"),
          raw("b", "numeric", state.user.id),
        ),
      );
    const copy = button(
      "",
      action(async () => {
        await navigator.clipboard.writeText(String(state.user.id));
        toast("Telegram ID copied.");
      }),
      "icon-button",
      "copy",
    );
    copy.setAttribute("aria-label", "Copy Telegram ID");
    identity.append(copy);
    header.append(
      add(
        el("div", "header-inner"),
        brand(),
        navigationBar("desktop-nav"),
        add(el("div", "header-tools"), languageControl(), identity),
      ),
    );
    main = el("main", "main");
    main.id = "main";
    const footer = el("footer", "footer"),
      support = el("a", "", "Community & support");
    support.href = "https://t.me/sultaro";
    support.target = "_blank";
    support.rel = "noopener noreferrer";
    footer.append(el("span", "", "SULTARO"), support);
    shell.append(header, main, footer, navigationBar("bottom-nav"));
    app.append(shell);
    render();
  }
  function heading(title, copy, extra) {
    main.append(
      add(
        el("div", "page-heading"),
        add(
          el("div"),
          el("div", "eyebrow", "DAYS OF EMPIRE"),
          el("h1", "", title),
          el("p", "", copy),
        ),
        extra,
      ),
    );
  }
  function panelTitle(title, copy, symbol) {
    return add(
      el("div", "panel-title"),
      symbol ? add(el("span", "title-symbol"), icon(symbol)) : null,
      add(el("div"), el("h2", "", title), copy ? el("p", "", copy) : null),
    );
  }
  function empty() {
    return add(
      el("section", "empty panel"),
      add(el("span", "empty-emblem"), icon("castle")),
      el("h2", "", "No assigned farms"),
      el("p", "", "Share your Telegram ID with support to assign your farms."),
      add(
        el("div", "empty-id"),
        el("span", "", "Telegram ID"),
        raw("strong", "numeric", state.user.id),
      ),
    );
  }
  function render() {
    if (!main) return;
    main.replaceChildren();
    for (const node of document.querySelectorAll("[data-page]")) {
      const active = node.dataset.page === state.page;
      node.classList.toggle("active", active);
      node.setAttribute("aria-current", active ? "page" : "false");
    }
    if (preview)
      main.append(el("div", "preview-note", "Preview · Example farms. Changes are disabled."));
    ({ farms: renderFarms, activities: renderActivities, settings: renderSettings })[state.page]();
    syncLocks();
  }
  async function loadFarms(page = state.pageNumber) {
    const generation = ++farmGeneration,
      result = await api("/api/farms?page=" + page + "&limit=8");
    if (generation !== farmGeneration) return;
    state.farms = result.rows || [];
    state.total = result.total || 0;
    state.pageNumber = result.page || 0;
    if (!selectedFarm()) {
      state.selectedFarmId = state.farms[0] ? state.farms[0].id : null;
      state.prefs = null;
      state.drafts = {};
      state.statsData = null;
      statsGeneration++;
    }
  }
  function pagination() {
    const previous = button(
        "Previous",
        action(async () => {
          await loadFarms(state.pageNumber - 1);
          render();
          if (state.page === "settings") {
            if (state.tab === "balances") loadResourceStats(state.selectedFarmId);
            else loadPreferences(state.selectedFarmId);
          }
        }),
        "subtle",
      ),
      next = button(
        "Next",
        action(async () => {
          await loadFarms(state.pageNumber + 1);
          render();
          if (state.page === "settings") {
            if (state.tab === "balances") loadResourceStats(state.selectedFarmId);
            else loadPreferences(state.selectedFarmId);
          }
        }),
        "subtle",
      );
    previous.disabled = preview || state.pageNumber === 0;
    next.disabled = preview || (state.pageNumber + 1) * 8 >= state.total;
    return add(
      el("div", "pagination"),
      el("span", "", state.total + " farms"),
      add(el("div", "button-row"), previous, next),
    );
  }
  function renderFarms() {
    heading(
      "My farms",
      "Your castles and their resources.",
      button(
        "Refresh",
        action(async () => {
          if (preview) {
            toast("This is a read-only preview.");
            return;
          }
          await loadFarms();
          render();
        }),
        "subtle",
        "refresh",
      ),
    );
    if (!state.farms.length) {
      main.append(empty());
      return;
    }
    const grid = el("div", "farm-grid");
    for (const farm of state.farms) {
      const card = el("article", "farm-card panel"),
        crest = add(el("span", "farm-crest"), icon("castle")),
        title = add(
          el("div", "farm-title"),
          el("h2", "", farmName(farm)),
          add(
            el("div", "farm-number"),
            el("span", "", "Player ID"),
            raw("span", "numeric", farm.game_user_id || "—"),
          ),
        );
      card.append(
        add(
          el("div", "farm-card-top"),
          crest,
          title,
          add(
            el("div", "level-seal"),
            el("small", "", "Castle"),
            raw("strong", "numeric", farm.castle_level || "—"),
          ),
        ),
      );
      const facts = el("div", "farm-facts");
      for (const [label, value] of [
        ["Kingdom", farm.kingdom],
        ["Lord level", farm.lord_level],
        ["VIP", farm.vip],
      ])
        facts.append(
          add(
            el("div"),
            el("span", "", label),
            raw("strong", "numeric", value == null ? "—" : value),
          ),
        );
      card.append(facts);
      const resources = el("div", "farm-resources");
      for (const [key, label, symbol] of [
        ["wheat", "Wheat", "wheat"],
        ["wood", "Wood", "wood"],
        ["iron", "Iron", "iron"],
        ["gold_total", "Gold", "coin"],
      ])
        resources.append(
          add(
            el("div", "resource"),
            icon(symbol),
            el("span", "", label),
            raw("strong", "numeric", U.count(farm[key])),
          ),
        );
      card.append(
        resources,
        button(
          "Farm settings",
          () => {
            state.selectedFarmId = farm.id;
            state.prefs = null;
            state.drafts = {};
            navigate("settings");
          },
          "farm-link",
          "arrow",
        ),
      );
      grid.append(card);
    }
    main.append(grid, pagination());
  }
  async function loadActivityFarms() {
    const generation = ++activityFarmGeneration;
    state.activityFarmsLoading = true;
    state.activityFarmsError = false;
    if (state.page === "activities") render();
    try {
      const all = [], seen = new Set();
      if (preview) {
        all.push(...state.farms.map(farm => ({ id: farm.id, farm_number: farm.farm_number })));
      } else {
        let page = 0;
        while (true) {
          const result = await api("/api/activity-farms?page=" + page + "&limit=100");
          if (generation !== activityFarmGeneration) return;
          for (const farm of result.rows || []) {
            if (!seen.has(String(farm.id))) { all.push(farm); seen.add(String(farm.id)); }
          }
          if (!result.rows.length || (page + 1) * 100 >= result.total) break;
          page++;
        }
      }
      state.activityFarms = all;
      state.activityFarmsLoaded = true;
      state.activityFarmsLoading = false;
      if (!all.length) {
        state.activitySourceId = null;
        state.activityTargets.clear();
        state.activityReady = false;
        if (state.page === "activities") render();
        return;
      }
      await loadFarmActivities(all[0].id);
    } catch (error) {
      if (generation !== activityFarmGeneration) return;
      state.activityFarmsLoading = false;
      state.activityFarmsError = true;
      if (state.page === "activities") render();
      toast(error.message, true);
    }
  }
  async function loadFarmActivities(id, resetTargets = true) {
    const generation = ++activityGeneration;
    state.activitySourceId = String(id);
    if (resetTargets) state.activityTargets = new Set([String(id)]);
    state.activityLoading = true;
    state.activityReady = false;
    state.activityLoadError = false;
    state.activityPendingId = null;
    state.activityExcludedSaved = false;
    state.activityAutomation = null;
    state.activityOptionsDraft = {};
    state.dirty = false;
    if (state.page === "activities") render();
    try {
      const [result, preferences] = preview
        ? [{ farm_id: id, rows: U.copy(previewActivityChoices[id] || []) }, U.copy(previewPrefs)]
        : await Promise.all([api("/api/activities?farm_id=" + encodeURIComponent(id)),
            activitySpecs().length ? api("/api/farms/" + encodeURIComponent(id) + "/preferences") : Promise.resolve({})]);
      if (generation !== activityGeneration || String(id) !== state.activitySourceId) return;
      if (String(result.farm_id) !== String(id)) throw new Error("Please refresh the page before trying again.");
      state.activities = U.normalizeActivities(result.rows, state.catalog.activities);
      state.activitySavedRows = U.copy(state.activities);
      state.activityAutomation = preferences.automation || null;
      state.activityOptionsDraft = U.activityOptions(activitySpecs(), state.activityAutomation && state.activityAutomation.options);
      state.activityLoading = false;
      state.activityReady = true;
      if (state.page === "activities") render();
    } catch (error) {
      if (generation !== activityGeneration || String(id) !== state.activitySourceId) return;
      state.activityLoading = false;
      state.activityLoadError = true;
      if (state.page === "activities") render();
      toast(error.message, true);
    }
  }
  function changeActivitySource(id) {
    if (state.activitySaving) return;
    if (String(id) === state.activitySourceId) return;
    if (state.dirty) {
      state.activityPendingId = String(id);
      render();
      return;
    }
    loadFarmActivities(id);
  }
  function syncActivityTargets() {
    for (const control of document.querySelectorAll("[data-activity-target]"))
      control.checked = state.activityTargets.has(control.value);
    for (const node of document.querySelectorAll("[data-activity-target-count]"))
      node.textContent = state.activityTargets.size + " farms selected";
    syncLocks();
  }
  function activityScope() {
    const box = el("section", "activity-scope panel");
    const source = select(state.activityFarms.map(farm => ({ id: farm.id, name: farmName(farm) })), state.activitySourceId);
    source.dataset.activitySource = "true";
    source.addEventListener("change", () => changeActivitySource(source.value));
    box.append(field("View farm choices", source, "Choose a farm to view its saved activities."));
    if (state.activityPendingId) {
      const prompt = el("div", "activity-discard-prompt");
      const discard = button("Discard changes", () => loadFarmActivities(state.activityPendingId), "subtle");
      discard.dataset.activityDiscard = "true";
      const keep = button("Keep editing", () => { state.activityPendingId = null; render(); }, "subtle");
      keep.dataset.activityKeep = "true";
      prompt.append(el("p", "", "Discard unsaved choices and view another farm?"), add(el("div", "button-row"), keep, discard));
      box.append(prompt);
    }
    const all = locked(button("Select all", () => {
      if (state.activityFarms.length > 1000) return;
      state.activityTargets = new Set(state.activityFarms.map(farm => String(farm.id)));
      syncActivityTargets();
    }, "subtle"));
    all.dataset.activityAll = "true";
    const none = locked(button("Clear selection", () => { state.activityTargets.clear(); syncActivityTargets(); }, "subtle"));
    none.dataset.activityClear = "true";
    box.append(add(el("div", "activity-target-heading"), el("h2", "", "Apply these choices to"), add(el("div", "button-row"), all, none)));
    const targets = el("div", "activity-target-grid");
    for (const farm of state.activityFarms) {
      const check = locked(checkbox(state.activityTargets.has(String(farm.id))));
      check.value = String(farm.id);
      check.dataset.activityTarget = "true";
      check.addEventListener("change", () => {
        if (check.checked && state.activityTargets.size >= 1000) {
          check.checked = false;
          toast("Choose up to 1000 farms at a time.", true);
          return;
        }
        if (check.checked) state.activityTargets.add(check.value);
        else state.activityTargets.delete(check.value);
        syncActivityTargets();
      });
      targets.append(add(el("label", "activity-target"), check, el("span", "", farmName(farm))));
    }
    box.append(targets, el("p", "card-help", "Only checked farms will be changed."));
    return box;
  }
  async function saveFarmActivities() {
    if (preview || state.mutations || state.activitySaving || !state.activityReady || state.activityLoading) return;
    const targets = Array.from(state.activityTargets);
    if (!targets.length || targets.length > 1000) return;
    const source = state.activitySourceId;
    const specs = activitySpecs(), changes = U.optionChanges(specs,
      state.activityAutomation && state.activityAutomation.options, state.activityOptionsDraft);
    const options = U.copy(changes);
    // Copy the displayed choices for enabled services, leaving other preferences intact.
    for (const row of state.activities) if (row.enabled && state.activityOptionsDraft[row.id])
      options[row.id] = U.copy(state.activityOptionsDraft[row.id]);
    if (!U.validOptions(specs, options)) throw new Error("Please check your choices and try again.");
    if (Object.keys(options).length && !state.activityAutomation)
      throw new Error("Please refresh the page before trying again.");
    state.activitySaving = true;
    syncLocks();
    let result;
    try {
      // Resolve all versions before writing; conflicts remain visible rather than overwriting newer choices.
      const versions = new Map();
      if (Object.keys(options).length) for (const id of targets) {
        const pref = id === source ? state.activityAutomation :
          (await api("/api/farms/" + encodeURIComponent(id) + "/preferences")).automation;
        if (!pref || !Number.isInteger(pref.version)) throw new Error("Please refresh the page before trying again.");
        versions.set(id, pref.version);
      }
      result = await api("/api/activities", "PATCH", {
        farm_ids: targets,
        rows: state.activities.map(row => ({ id: row.id, enabled: row.enabled })),
      });
      for (const [id, version] of versions) {
        const saved = await api("/api/farms/" + encodeURIComponent(id) + "/preferences", "PATCH", {
          section: "automation", version, options,
        });
        if (id === source) state.activityAutomation = saved.automation;
        if (String(id) === String(state.selectedFarmId)) { state.prefs = saved; state.drafts = U.copy(saved); }
      }
    } catch (error) {
      // The batch may be partially saved. A fresh read is required before another save.
      if (result) {
        state.activityReady = false;
        state.activityLoadError = true;
        throw new Error("Some choices may have been saved. Reload the farm choices before trying again.");
      }
      throw error;
    } finally {
      state.activitySaving = false;
      syncLocks();
      if (!state.activityReady) render();
    }
    if (source === state.activitySourceId) {
      if (targets.includes(source)) {
        state.activities = U.normalizeActivities(result.rows, state.catalog.activities);
        state.activitySavedRows = U.copy(state.activities);
        state.dirty = false;
        state.activityExcludedSaved = false;
        state.activityPendingId = null;
      } else {
        updateActivityDirty();
        state.activityExcludedSaved = true;
      }
      render();
    }
    toast("Choices saved for " + result.applied_count + " farms.");
  }
  function activitySpecs() {
    return Array.isArray(state.catalog.activity_settings) ? state.catalog.activity_settings : [];
  }
  function publicLabel(row, key = "label") {
    return I.locale() === "ar" && row.arabic ? row.arabic : I.t(row[key] || "Activity options");
  }
  function updateActivityDirty() {
    state.dirty = !U.sameActivityChoices(state.activities, state.activitySavedRows) ||
      Object.keys(U.optionChanges(activitySpecs(), state.activityAutomation && state.activityAutomation.options,
        state.activityOptionsDraft)).length > 0;
  }
  function groupTabs(selected, rows, change, scope) {
    const tabs = el("div", "settings-tabs activity-group-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", I.t("Activity categories"));
    const available = [{ id: "all", name: "All activities", icon: "sliders" },
      ...U.groups.filter(group => rows.some(row => row.group === group.id))];
    for (const group of available) {
      const item = button(group.name, () => change(group.id), selected === group.id ? "active" : "", group.icon);
      item.setAttribute("role", "tab");
      item.setAttribute("aria-selected", String(selected === group.id));
      item.dataset.activityGroup = group.id;
      item.dataset.groupScope = scope;
      tabs.append(item);
    }
    return tabs;
  }
  function optionsFields(spec, draft, onChange) {
    const box = el("div", "activity-options-fields");
    if (spec.id === "auto_shield") box.append(el("p", "card-help",
      "Shield checks happen during farm visits. Renewal between visits is not guaranteed."));
    for (const descriptor of spec.fields || []) {
      if (!["boolean", "integer", "choice", "multi_choice"].includes(descriptor.type)) continue;
      let control;
      const value = draft[descriptor.key] === undefined ? descriptor.default : draft[descriptor.key];
      if (descriptor.type === "multi_choice") {
        const choices = el("fieldset", "activity-multi-choice");
        choices.append(el("legend", "", publicLabel(descriptor)));
        const grid = el("div", "activity-multi-grid");
        for (const row of descriptor.choices || []) {
          const check = locked(checkbox(Array.isArray(value) && value.includes(row.id)));
          check.value = row.id;
          check.dataset.activityOption = spec.id + ":" + descriptor.key;
          check.addEventListener("change", () => {
            const selected = new Set(draft[descriptor.key] || []);
            if (check.checked) selected.add(row.id); else selected.delete(row.id);
            draft[descriptor.key] = Array.from(selected);
            onChange();
          });
          grid.append(add(el("label", "activity-multi-item"), check, el("span", "", publicLabel(row))));
        }
        choices.append(grid);
        box.append(choices);
        continue;
      }
      if (descriptor.type === "boolean") control = checkbox(value === true);
      else if (descriptor.type === "integer") control = number(value, descriptor.min, descriptor.max);
      else control = select((descriptor.choices || []).map(row => ({ id: row.id, name: publicLabel(row), raw: true })), value);
      locked(control);
      control.dataset.activityOption = spec.id + ":" + descriptor.key;
      control.addEventListener("change", () => {
        const next = descriptor.type === "boolean" ? control.checked : descriptor.type === "integer"
          ? (control.value.trim() === "" ? null : Number(control.value))
          : (descriptor.choices || []).find(row => String(row.id) === control.value).id;
        draft[descriptor.key] = next;
        onChange();
      });
      box.append(descriptor.type === "boolean" ? switchLabel(publicLabel(descriptor), control) : field(publicLabel(descriptor), control));
    }
    return box;
  }
  function renderActivities() {
    heading("Activities", "Choose what your farms should take care of.");
    if (state.activityFarmsError) {
      main.append(note("Could not load farm choices. Please try again."), button("Try again", loadActivityFarms, "subtle", "refresh"));
      return;
    }
    if (!state.activityFarmsLoaded || state.activityFarmsLoading) {
      main.append(el("div", "loading-copy", "Loading your choices…"));
      return;
    }
    if (!state.activityFarms.length) { main.append(empty()); return; }
    main.append(activityScope());
    if (state.activityLoading) {
      main.append(el("div", "loading-copy", "Loading your choices…"));
      return;
    }
    if (state.activityLoadError || !state.activityReady) {
      main.append(note("Could not load farm choices. Please try again."), button("Try again", () => loadFarmActivities(state.activitySourceId, false), "subtle", "refresh"));
      return;
    }
    main.append(groupTabs(state.activityGroup, state.activities, id => { state.activityGroup = id; render(); }, "activities"));
    const grid = el("div", "activity-grid" + (state.activityGroup === "all" ? "" : " activity-grid-filtered")),
      specs = new Map(activitySpecs().map(spec => [spec.id, spec]));
    for (const group of U.groups) {
      if (state.activityGroup !== "all" && group.id !== state.activityGroup) continue;
      const rows = state.activities.filter(row => row.group === group.id), card = el("section", "activity-card panel");
      if (!rows.length) continue;
      card.append(panelTitle(group.name, null, group.icon));
      for (const activity of rows) {
        const check = locked(checkbox(activity.enabled));
        check.id = "activity-" + activity.id;
        check.addEventListener("change", () => {
          state.activities = U.toggle(state.activities, activity.id, check.checked);
          updateActivityDirty();
          if (!state.dirty) state.activityPendingId = null;
          state.activityExcludedSaved = false;
          render();
        });
        const item = el("div", "activity-item"), spec = specs.get(activity.id);
        item.append(switchLabel(spec ? publicLabel(spec, "name") : activity.name, check));
        if (spec && spec.fields.length && state.activityAutomation) {
          const details = el("details", "activity-options");
          details.append(el("summary", "", "Activity options"), optionsFields(spec,
            state.activityOptionsDraft[activity.id], () => {
              updateActivityDirty();
              state.activityExcludedSaved = false;
              const status = document.querySelector("[data-activity-dirty]");
              if (status) status.textContent = I.t(state.dirty ? "Unsaved changes" : "Only checked farms will be changed.");
            }));
          item.append(details);
        }
        card.append(item);
      }
      if (group.id === "castle") card.append(el("p", "card-help", "Castle upgrades and resource building upgrades are separate choices."));
      grid.append(card);
    }
    const save = locked(button("Save choices", action(saveFarmActivities), "primary", "check"));
    save.dataset.activitySave = "true";
    const count = el("strong", "", state.activityTargets.size + " farms selected");
    count.dataset.activityTargetCount = "true";
    const help = state.activityExcludedSaved
      ? "The displayed farm was not selected. Its saved choices are unchanged."
      : state.dirty ? "Unsaved changes" : "Only checked farms will be changed.";
    const status = el("span", "", help); status.dataset.activityDirty = "true";
    main.append(grid, el("p", "card-help", "Options for enabled activities are copied to the selected farms."),
      add(el("div", "savebar"), add(el("div"), count, status), save));
  }
  async function loadPreferences(id) {
    if (!id) return;
    const generation = ++prefGeneration;
    state.loadingPrefs = true;
    state.prefs = null;
    if (state.page === "settings") render();
    try {
      const result = preview
        ? U.copy(previewPrefs)
        : await api("/api/farms/" + id + "/preferences");
      if (generation !== prefGeneration || String(id) !== String(state.selectedFarmId)) return;
      state.prefs = result;
      state.drafts = U.copy(result);
      state.loadingPrefs = false;
      if (state.page === "settings") render();
    } catch (error) {
      if (generation !== prefGeneration) return;
      state.loadingPrefs = false;
      toast(error.message, true);
      if (state.page === "settings") render();
    }
  }
  function renderSettings() {
    heading("Farm settings", "Give each farm its own priorities.");
    if (!state.farms.length) {
      main.append(empty());
      return;
    }
    const tabs = el("div", "settings-tabs");
    tabs.setAttribute("role", "tablist");
    for (const [id, title, symbol] of [
      ["gathering", "Gathering", "leaf"],
      ["fountain", "Fountain", "gem"],
      ["research", "Research", "star"],
      ["heroes", "Heroes", "shield"],
      ["automation", "Activity options", "spark"],
      ["balances", "Daily balances", "coin"],
      ["shared", "Other choices", "sliders"],
    ]) {
      const item = button(
        title,
        () => {
          state.tab = id;
          render();
          if (id === "balances") loadResourceStats(state.selectedFarmId);
          else if (id !== "shared" && !state.prefs && !state.loadingPrefs)
            loadPreferences(state.selectedFarmId);
        },
        state.tab === id ? "active" : "",
        symbol,
      );
      item.setAttribute("role", "tab");
      item.setAttribute("aria-selected", String(state.tab === id));
      item.dataset.tab = id;
      tabs.append(item);
    }
    main.append(tabs);
    if (state.tab === "shared") {
      renderShared();
      return;
    }
    const chooser = select(
      state.farms.map((farm) => ({ id: farm.id, name: farmName(farm) })),
      state.selectedFarmId,
    );
    chooser.setAttribute("aria-label", "Selected farm");
    chooser.addEventListener("change", () => {
      state.selectedFarmId = chooser.value;
      state.drafts = {};
      state.prefs = null;
      if (state.tab === "balances") loadResourceStats(chooser.value);
      else loadPreferences(chooser.value);
    });
    const farm = selectedFarm(),
      selector = add(
        el("div", "farm-selector"),
        field("Selected farm", chooser),
        add(
          el("div", "selection-detail"),
          icon("castle"),
          el("span", "", farm ? "Level " + (farm.castle_level || "—") : ""),
          el("span", "separator", "·"),
          el("span", "", farm ? "Kingdom " + (farm.kingdom || "—") : ""),
        ),
      );
    main.append(selector);
    if (state.total > 8) main.append(pagination());
    if (state.tab === "balances") { renderResourceStats(); return; }
    const box = el("section", "preference-panel panel");
    if (state.loadingPrefs) {
      box.append(el("div", "loading-copy", "Loading your choices…"));
      main.append(box);
      return;
    }
    if (!state.prefs) {
      box.append(
        note("Please refresh the page before trying again."),
        button("Refresh", () => loadPreferences(state.selectedFarmId), "subtle", "refresh"),
      );
      main.append(box);
      return;
    }
    if (state.tab === "automation") {
      renderActivitySettings(box);
      return;
    }
    const section = state.tab,
      pref = state.prefs[section],
      draft = state.drafts[section],
      form = el("form");
    let read;
    if (section === "gathering") {
      box.append(
        panelTitle("Gathering marches", "Choose a resource for each available march.", "leaf"),
      );
      const slots = el("div", "slot-grid"),
        inputs = [];
      const limits = state.catalog.gathering_limits || { min_level: 1, max_level: 8 };
      draft.level_ranges = U.gatheringRanges(draft.level_ranges, limits);
      const levels = Array.from({ length: limits.max_level - limits.min_level + 1 },
        (_, index) => ({ id: limits.min_level + index, name: String(limits.min_level + index) }));
      for (let index = 0; index < 6; index++) {
        const choice = locked(select(catalogChoices("gathering"), draft.slots[index] || 0));
        choice.setAttribute("aria-label", "March " + (index + 1) + " resource");
        choice.addEventListener("change", () => (draft.slots[index] = Number(choice.value)));
        const minimum = locked(select(levels, draft.level_ranges[index][0]));
        const maximum = locked(select(levels, draft.level_ranges[index][1]));
        minimum.setAttribute("aria-label", "March " + (index + 1) + " minimum level");
        maximum.setAttribute("aria-label", "March " + (index + 1) + " maximum level");
        minimum.addEventListener("change", () => {
          maximum.value = String(Math.max(Number(minimum.value), Number(maximum.value)));
          draft.level_ranges[index] = [Number(minimum.value), Number(maximum.value)];
        });
        maximum.addEventListener("change", () => {
          minimum.value = String(Math.min(Number(minimum.value), Number(maximum.value)));
          draft.level_ranges[index] = [Number(minimum.value), Number(maximum.value)];
        });
        inputs.push({ choice, minimum, maximum });
        slots.append(
          add(
            el("div", "slot-card"),
            add(
              el("div", "slot-heading"),
              el("span", "slot-number", index + 1),
              el("span", "", "March " + (index + 1)),
            ),
            choice,
            add(el("div", "slot-levels"), field("Minimum level", minimum), field("Maximum level", maximum)),
          ),
        );
      }
      form.append(
        slots,
        el("p", "card-help", "Busy marches and marches not yet unlocked are skipped."),
      );
      read = () => ({ slots: inputs.map((input) => Number(input.choice.value)),
        level_ranges: inputs.map(input => [Number(input.minimum.value), Number(input.maximum.value)]) });
    } else if (section === "heroes") {
      box.append(
        panelTitle(
          "Hero experience",
          "Use experience books only for the heroes you choose.",
          "shield",
        ),
      );
      const grid = el("div", "heroes-grid"),
        inputs = [];
      for (const hero of state.catalog.heroes || []) {
        const check = locked(checkbox((draft.hero_ids || []).includes(hero.id)));
        check.value = String(hero.id);
        check.addEventListener(
          "change",
          () => (draft.hero_ids = inputs.filter((row) => row[1].checked).map((row) => row[0])),
        );
        inputs.push([hero.id, check]);
        const mark = el("span", "hero-mark", "✦");
        mark.style.color = U.safeColor(hero.color);
        const name = raw("span", "hero-name", I.gameName("heroes", hero.id));
        name.dataset.gameKind = "heroes";
        name.dataset.gameId = String(hero.id);
        name.dir = "auto";
        name.style.color = U.safeColor(hero.color);
        const row = add(el("label", "hero-choice"), mark, name, check);
        row.dataset.heroId = String(hero.id);
        grid.append(row);
      }
      form.append(
        grid,
        el("p", "card-help", "Recruitment, stars and skills still apply to all available heroes."),
      );
      read = () => ({ hero_ids: inputs.filter((row) => row[1].checked).map((row) => row[0]) });
    } else {
      box.append(
        panelTitle(
          section === "research" ? "Research field" : "Treasure Fountain",
          section === "research"
            ? "Choose the field your farm should study."
            : "Choose the resource your farm should receive.",
          section === "research" ? "star" : "gem",
        ),
      );
      const grid = el("div", "choice-grid");
      for (const choice of catalogChoices(section)) {
        const item = locked(
          button(
            choice.name,
            () => {
              draft.value = choice.id;
              for (const item of grid.children) {
                const active = item.dataset.choice === String(choice.id);
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
              }
            },
            "choice-card" + (String(draft.value) === String(choice.id) ? " active" : ""),
            section === "research" ? "star" : "leaf",
          ),
        );
        item.dataset.choice = choice.id;
        item.setAttribute("aria-pressed", String(String(draft.value) === String(choice.id)));
        grid.append(item);
      }
      form.append(grid);
      read = () => ({ value: draft.value });
    }
    const save = locked(button("Save preferences", null, "primary", "check"));
    save.type = "submit";
    form.append(
      add(
        el("div", "form-footer"),
        el("span", "", farm ? "Applies to Farm " + farm.farm_number + " only." : ""),
        save,
      ),
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (preview || state.mutations) return;
      const id = state.selectedFarmId;
      action(async () => {
        const result = await api("/api/farms/" + id + "/preferences", "PATCH", {
          section,
          version: pref.version,
          ...read(),
        });
        if (String(id) === String(state.selectedFarmId)) {
          state.prefs = result;
          state.drafts = U.copy(result);
          render();
        }
        toast("Preferences saved.");
      })();
    });
    box.append(form);
    main.append(box);
  }
  function renderActivitySettings(box) {
    const specs = activitySpecs().filter(spec => spec.fields && spec.fields.length),
      pref = state.prefs.automation;
    box.append(panelTitle("Activity options", "Set the preferences for this farm.", "sliders"));
    if (!pref || !specs.length) {
      box.append(note("No additional choices are available."));
      main.append(box);
      return;
    }
    if (!state.drafts.automation) state.drafts.automation = U.copy(pref);
    const draft = state.drafts.automation;
    draft.options = U.activityOptions(specs, draft.options);
    box.append(groupTabs(state.settingsGroup, specs, id => { state.settingsGroup = id; render(); }, "settings"));
    const form = el("form", "activity-settings-form");
    for (const spec of specs) {
      if (state.settingsGroup !== "all" && spec.group !== state.settingsGroup) continue;
      const section = el("section", "activity-settings-card");
      section.append(el("h3", "", publicLabel(spec, "name")), optionsFields(spec, draft.options[spec.id], () => {}));
      form.append(section);
    }
    const save = locked(button("Save preferences", null, "primary", "check"));
    save.type = "submit";
    form.append(save);
    form.addEventListener("submit", event => {
      event.preventDefault();
      action(async () => {
        if (preview || state.mutations) return;
        const options = U.optionChanges(specs, pref.options, draft.options);
        if (!U.validOptions(specs, options)) throw new Error("Please check your choices and try again.");
        if (!Object.keys(options).length) return;
        const id = state.selectedFarmId, result = await api("/api/farms/" + encodeURIComponent(id) + "/preferences", "PATCH", {
          section: "automation", version: pref.version, options,
        });
        if (String(id) === String(state.selectedFarmId)) {
          state.prefs = result;
          state.drafts = U.copy(result);
        }
        // Re-open activities from saved data after an independent preferences edit.
        state.activityFarmsLoaded = false;
        render();
        toast("Preferences saved.");
      })();
    });
    box.append(form);
    main.append(box);
  }
  async function loadResourceStats(id) {
    if (!id) return;
    const generation = ++statsGeneration, day = state.statsDay;
    state.statsLoading = true;
    state.statsError = false;
    state.statsData = null;
    if (state.page === "settings" && state.tab === "balances") render();
    try {
      const result = preview ? { day, timezone: "UTC", resources: [], samples: 0 } :
        await api("/api/farms/" + encodeURIComponent(id) + "/resource-stats?date=" + encodeURIComponent(day));
      if (generation !== statsGeneration || String(id) !== String(state.selectedFarmId) || day !== state.statsDay) return;
      state.statsData = result;
    } catch (error) {
      if (generation !== statsGeneration) return;
      state.statsError = true;
      toast(error.message, true);
    } finally {
      if (generation === statsGeneration) {
        state.statsLoading = false;
        if (state.page === "settings" && state.tab === "balances") render();
      }
    }
  }
  function renderResourceStats() {
    const box = el("section", "preference-panel panel"), day = el("input");
    day.type = "date";
    day.value = state.statsDay;
    day.max = new Date().toISOString().slice(0, 10);
    day.dataset.balanceDate = "true";
    day.addEventListener("change", () => {
      if (!day.value || !day.checkValidity()) return;
      state.statsDay = day.value;
      loadResourceStats(state.selectedFarmId);
    });
    box.append(panelTitle("Daily resource balances", "Net balance change includes spending; records start from the first observation.", "coin"),
      field("Date (UTC)", day));
    if (state.statsLoading) box.append(el("p", "loading-copy", "Loading your choices…"));
    else if (state.statsError) box.append(button("Try again", () => loadResourceStats(state.selectedFarmId), "subtle", "refresh"));
    else if (!state.statsData || !(state.statsData.resources || []).length) box.append(note("No resource observations for this day."));
    else {
      const table = el("table", "balance-table"), head = el("tr");
      for (const title of ["Resources", "Opening balance", "Latest balance", "Net change"]) head.append(el("th", "", title));
      table.append(add(el("thead"), head));
      const body = el("tbody");
      for (const row of state.statsData.resources) {
        const line = el("tr"), name = U.choiceLabels.gathering[row.id] ||
          ({ 1006: "Steel", 1027: "Crystal" }[row.id]) || "Resources";
        line.append(el("th", "", name));
        for (const key of ["opening", "latest", "change"]) {
          const value = Number(row[key]), cell = raw("td", key === "change" ? "balance-change" : "", U.count(row[key]));
          if (Number.isFinite(value)) {
            cell.title = new Intl.NumberFormat(I.locale()).format(value);
            if (key === "change" && value > 0) cell.textContent = "+" + cell.textContent;
          }
          cell.dir = "ltr";
          line.append(cell);
        }
        body.append(line);
      }
      table.append(body);
      box.append(table);
      if (state.statsData.first_seen && state.statsData.last_seen) {
        const range = el("div", "balance-observations");
        for (const [key, label] of [["first_seen", "First observation"], ["last_seen", "Latest observation"]]) {
          const date = new Date(state.statsData[key]);
          if (!Number.isNaN(date.getTime())) range.append(add(el("p"), el("span", "", label),
            raw("time", "", date.toLocaleTimeString(I.locale(), { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC")));
        }
        box.append(range);
      }
    }
    main.append(box);
  }
  function renderShared() {
    const form = el("form", "shared-grid"),
      draft = state.settingsDraft;
    const castle = locked(
      select(
        Array.from({ length: 30 }, (_, index) => ({ id: index + 1, name: "Level " + (index + 1) })),
        draft.castle_target_level || 30,
      ),
    );
    castle.addEventListener("change", () => (draft.castle_target_level = Number(castle.value)));
    const training = locked(checkbox(!!draft.training_use_speedups));
    training.addEventListener("change", () => (draft.training_use_speedups = training.checked));
    const gold = locked(checkbox(!!draft.merchant_buy_gold));
    gold.addEventListener("change", () => (draft.merchant_buy_gold = gold.checked));
    const refreshes = locked(number(draft.merchant_refreshes || 0, 0, 1000));
    refreshes.addEventListener("input", () => (draft.merchant_refreshes = Number(refreshes.value)));
    const pet = locked(
      select(
        [
          { id: 0, name: "Best available" },
          ...(state.catalog.pets || [])
            .filter((row) => Number(row.id) !== 0)
            .map((row) => ({
              ...row,
              name: I.gameName("pets", row.id),
              raw: true,
              gameKind: "pets",
            })),
        ],
        draft.pet_preferred_id || 0,
      ),
    );
    pet.addEventListener("change", () => (draft.pet_preferred_id = Number(pet.value)));
    const cards = [
      add(
        el("section", "shared-card panel"),
        panelTitle("Castle upgrades", null, "castle"),
        field("Target castle level", castle),
      ),
      add(
        el("section", "shared-card panel"),
        panelTitle("Troop training", null, "shield"),
        switchLabel("Use speedups for grain carts", training),
        el("p", "card-help", "Normal training continues when speedups run out."),
      ),
      add(
        el("section", "shared-card panel"),
        panelTitle("Mysterious Merchant", null, "leaf"),
        switchLabel("Buy offers below 50 gold", gold),
        field("Paid shop refreshes", refreshes, "0 keeps the free refresh only."),
      ),
      add(
        el("section", "shared-card panel"),
        panelTitle("Pet care", null, "star"),
        field("Preferred pet", pet, "Uses an available pet when this one is missing."),
      ),
    ];
    form.append(...cards);
    const save = locked(button("Save preferences", null, "primary", "check"));
    save.type = "submit";
    form.append(
      add(
        el("div", "form-footer shared-footer"),
        el("span", "", "These choices apply to all your farms."),
        save,
      ),
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (preview || state.mutations) return;
      action(async () => {
        state.settings = await api("/api/settings", "PATCH", {
          castle_target_level: Number(castle.value),
          training_use_speedups: training.checked,
          merchant_buy_gold: gold.checked,
          merchant_refreshes: Number(refreshes.value),
          pet_preferred_id: Number(pet.value),
        });
        state.settingsDraft = U.copy(state.settings);
        toast("Preferences saved.");
      })();
    });
    main.append(form);
  }
  function gate(message) {
    app.replaceChildren();
    app.removeAttribute("aria-busy");
    const card = add(
      el("section", "gate-card panel"),
      languageControl(),
      brand(),
      el("h1", "", "Your farms, your choices."),
      el("p", "", message || "Open SULTARO from Telegram to see your farms."),
    );
    const link = el("a", "primary button-link", "Open in Telegram");
    link.href = U.botUrl(config.botUsername);
    link.rel = "noopener noreferrer";
    link.append(icon("arrow"));
    card.append(link);
    if (message) card.append(button("Try again", boot, "subtle", "refresh"));
    app.append(add(el("main", "gate"), card));
  }
  const previewActivityChoices = {
    "demo-1": U.activities.map(row => ({ ...row, enabled: ["upgrade", "rewards", "gathering", "troop_training", "hero_upgrade", "research", "alliance_help", "chapters"].includes(row.id) })),
    "demo-2": U.activities.map(row => ({ ...row, enabled: ["building_upgrade", "gathering", "rewards", "hospital"].includes(row.id) })),
    "demo-3": U.activities.map(row => ({ ...row, enabled: ["hero_hall", "hero_upgrade", "pet_care", "alliance_help"].includes(row.id) })),
  };
  const previewPrefs = {
    gathering: { slots: [1, 1, 1, 1, 1, 1], level_ranges: Array.from({ length: 6 }, () => [1, 8]), version: 1 },
    research: { value: "resource", version: 1 },
    fountain: { value: 1023, version: 1 },
    heroes: { hero_ids: [5503027, 5501042], version: 1 },
  };
  function seedPreview() {
    state.user = { id: 123456789, first_name: "Alex", locale: "en" };
    state.farms = [
      {
        id: "demo-1",
        farm_number: 1,
        game_user_id: 90010001,
        castle_level: 14,
        kingdom: 52,
        lord_level: 18,
        vip: 4,
        wheat: 1240000,
        wood: 980000,
        iron: 352000,
        gold_total: 520,
      },
      {
        id: "demo-2",
        farm_number: 2,
        game_user_id: 90010002,
        castle_level: 12,
        kingdom: 52,
        lord_level: 16,
        vip: 3,
        wheat: 782000,
        wood: 640000,
        iron: 186000,
        gold_total: 340,
      },
      {
        id: "demo-3",
        farm_number: 3,
        game_user_id: 90010003,
        castle_level: 8,
        kingdom: 52,
        lord_level: 11,
        vip: 2,
        wheat: 265000,
        wood: 198000,
        iron: 68000,
        gold_total: 180,
      },
    ];
    state.total = 3;
    state.selectedFarmId = "demo-1";
    state.activities = U.normalizeActivities(
      U.activities.map((row) => ({
        ...row,
        enabled: [
          "upgrade",
          "rewards",
          "gathering",
          "troop_training",
          "hero_upgrade",
          "research",
          "alliance_help",
          "chapters",
        ].includes(row.id),
      })),
    );
    state.settings = {
      castle_target_level: 30,
      training_use_speedups: true,
      merchant_buy_gold: false,
      merchant_refreshes: 0,
      pet_preferred_id: 0,
    };
    state.settingsDraft = U.copy(state.settings);
    state.catalog = {
      gathering: [
        { id: 0, name: "Disabled" },
        { id: 1, name: "Random" },
        { id: 1003, name: "Wood" },
        { id: 1002, name: "Wheat" },
        { id: 1004, name: "Iron" },
        { id: 1005, name: "Mithril" },
        { id: 1001, name: "Gold" },
      ],
      gathering_limits: { min_level: 1, max_level: 8 },
      fountain: [
        { id: 0, name: "Disabled" },
        { id: 1023, name: "Safe wood" },
        { id: 1022, name: "Safe food" },
        { id: 1024, name: "Safe iron" },
        { id: 1006, name: "Steel" },
        { id: 1025, name: "Safe mithril" },
      ],
      research: [
        { id: "", name: "Disabled" },
        { id: "military", name: "Military" },
        { id: "anchor", name: "Castle defense" },
        { id: "cityDevelop", name: "Castle development" },
        { id: "resource", name: "Resources" },
        { id: "hero", name: "Heroes" },
        { id: "advancedMilitary", name: "Advanced military" },
        { id: "special", name: "Special" },
      ],
      pets: [
        { id: 1263, name: "الصقر" },
        { id: 1262, name: "الأسد" },
      ],
      heroes: [
        { id: 5503027, name: "ابن بطوطة", color: "#FF465A" },
        { id: 5501042, name: "السلطان محمد الفاتح", color: "#FF465A" },
        { id: 5501027, name: "أتيلا", color: "#FF9946" },
        { id: 5501013, name: "أرطغرل", color: "#FF9946" },
        { id: 5501006, name: "الزعيم عمر", color: "#D446FF" },
        { id: 5501008, name: "السيد محمود", color: "#D446FF" },
      ],
    };
    state.prefs = U.copy(previewPrefs);
    state.drafts = U.copy(previewPrefs);
  }
  async function boot() {
    if (window.SULTARO_CONFIG_READY) await window.SULTARO_CONFIG_READY;
    config = window.SULTARO_CONFIG || {};
    if (preview) {
      seedPreview();
      I.setLocale(new URLSearchParams(location.search).get("lang") || "en");
      layout();
      return;
    }
    if (!auth) {
      gate();
      return;
    }
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor("#100806");
      if (tg.setBackgroundColor) tg.setBackgroundColor("#100806");
    }
    try {
      const [me, catalog, settings, farms] = await Promise.all([
        api("/api/me"),
        api("/api/catalog"),
        api("/api/settings"),
        api("/api/farms?page=0&limit=8"),
      ]);
      state.user = me.user;
      I.setLocale(me.user.locale || "en");
      state.catalog = catalog;
      state.settings = settings;
      state.settingsDraft = U.copy(settings);
      state.farms = farms.rows || [];
      state.total = farms.total || 0;
      state.selectedFarmId = state.farms[0] ? state.farms[0].id : null;
      layout();
    } catch (error) {
      gate(error.message);
    }
  }
  I.observe(document.body);
  boot();
})();
