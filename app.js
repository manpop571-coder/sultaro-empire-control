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
      node.append(option);
    }
    node.value = String(value == null ? "" : value);
    return node;
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
      node.disabled = preview || state.mutations > 0;
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
    if (
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
    image.src = "./mark.svg";
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
    }
  }
  function pagination() {
    const previous = button(
        "Previous",
        action(async () => {
          await loadFarms(state.pageNumber - 1);
          render();
          if (state.page === "settings") loadPreferences(state.selectedFarmId);
        }),
        "subtle",
      ),
      next = button(
        "Next",
        action(async () => {
          await loadFarms(state.pageNumber + 1);
          render();
          if (state.page === "settings") loadPreferences(state.selectedFarmId);
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
  function renderActivities() {
    heading("Activities", "Choose what your farms should take care of.");
    const grid = el("div", "activity-grid");
    for (const group of U.groups) {
      const rows = state.activities.filter((row) => row.group === group.id),
        card = el("section", "activity-card panel");
      card.append(panelTitle(group.name, null, group.icon));
      for (const activity of rows) {
        const check = locked(checkbox(activity.enabled));
        check.id = "activity-" + activity.id;
        check.addEventListener("change", () => {
          state.activities = U.toggle(state.activities, activity.id, check.checked);
          state.dirty = true;
          render();
        });
        card.append(switchLabel(activity.name, check));
      }
      if (group.id === "castle")
        card.append(
          el(
            "p",
            "card-help",
            "Castle upgrades and resource building upgrades are separate choices.",
          ),
        );
      grid.append(card);
    }
    const save = locked(
      button(
        "Save choices",
        action(async () => {
          const result = await api("/api/activities", "PATCH", {
            rows: state.activities.map((row) => ({ id: row.id, enabled: row.enabled })),
          });
          state.activities = U.normalizeActivities(result.rows);
          state.dirty = false;
          toast("Choices saved.");
          render();
        }),
        "primary",
        "check",
      ),
    );
    main.append(
      grid,
      add(
        el("div", "savebar"),
        add(
          el("div"),
          el("strong", "", state.activities.filter((row) => row.enabled).length + " selected"),
          el(
            "span",
            "",
            state.dirty ? "Unsaved changes" : "These choices apply to all your farms.",
          ),
        ),
        save,
      ),
    );
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
      ["shared", "Other choices", "sliders"],
    ]) {
      const item = button(
        title,
        () => {
          state.tab = id;
          render();
          if (id !== "shared" && !state.prefs && !state.loadingPrefs)
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
      loadPreferences(chooser.value);
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
      for (let index = 0; index < 6; index++) {
        const choice = locked(select(state.catalog.gathering || [], draft.slots[index] || 0));
        choice.setAttribute("aria-label", "March " + (index + 1) + " resource");
        choice.addEventListener("change", () => (draft.slots[index] = Number(choice.value)));
        inputs.push(choice);
        slots.append(
          add(
            el("div", "slot-card"),
            add(
              el("div", "slot-heading"),
              el("span", "slot-number", index + 1),
              el("span", "", "March " + (index + 1)),
            ),
            choice,
          ),
        );
      }
      form.append(
        slots,
        el("p", "card-help", "Busy marches and marches not yet unlocked are skipped."),
      );
      read = () => ({ slots: inputs.map((input) => Number(input.value)) });
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
        check.addEventListener(
          "change",
          () => (draft.hero_ids = inputs.filter((row) => row[1].checked).map((row) => row[0])),
        );
        inputs.push([hero.id, check]);
        const mark = el("span", "hero-mark", "✦");
        mark.style.color = U.safeColor(hero.color);
        const name = raw("span", "hero-name", hero.name);
        name.style.color = U.safeColor(hero.color);
        grid.append(add(el("label", "hero-choice"), mark, name, check));
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
      for (const choice of state.catalog[section] || []) {
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
              name: U.petNames[row.id] || row.name,
              raw: !U.petNames[row.id],
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
  const previewPrefs = {
    gathering: { slots: [1003, 1002, 1003, 1002, 0, 0], version: 1 },
    research: { value: "resource", version: 1 },
    fountain: { value: 1023, version: 1 },
    heroes: { hero_ids: [1, 2], version: 1 },
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
        { id: 1003, name: "Wood" },
        { id: 1002, name: "Wheat" },
        { id: 1004, name: "Iron" },
        { id: 1005, name: "Mithril" },
      ],
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
        { id: 1263, name: "Falcon" },
        { id: 1262, name: "Lion" },
      ],
      heroes: [
        { id: 1, name: "Mehmed II", color: "#d8b76a" },
        { id: 2, name: "Kara Murad", color: "#d8b76a" },
        { id: 3, name: "Osman", color: "#b998dd" },
        { id: 4, name: "Selim", color: "#b998dd" },
        { id: 5, name: "Ibrahim", color: "#80acd3" },
        { id: 6, name: "Mustafa", color: "#80acd3" },
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
      if (tg.setHeaderColor) tg.setHeaderColor("#0c1514");
      if (tg.setBackgroundColor) tg.setBackgroundColor("#0c1514");
    }
    try {
      const [me, catalog, activities, settings, farms] = await Promise.all([
        api("/api/me"),
        api("/api/catalog"),
        api("/api/activities"),
        api("/api/settings"),
        api("/api/farms?page=0&limit=8"),
      ]);
      state.user = me.user;
      I.setLocale(me.user.locale || "en");
      state.catalog = catalog;
      state.activities = U.normalizeActivities(activities.rows);
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
