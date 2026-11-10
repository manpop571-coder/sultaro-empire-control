(function (root, factory) {
  const value = factory();
  if (typeof module === "object" && module.exports) module.exports = value;
  else root.SultaroUI = value;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const activities = [
    ["upgrade", "Castle upgrades", "castle"],
    ["building_upgrade", "Resource buildings", "castle"],
    ["rewards", "Reward collection", "resources"],
    ["race", "Race event", "events"],
    ["hero_hall", "Hero Hall", "heroes"],
    ["military_port", "Military Port", "army"],
    ["hero_upgrade", "Hero development", "heroes"],
    ["invaders", "Invader attacks", "army"],
    ["gathering", "Resource gathering", "resources"],
    ["troop_training", "Troop training", "army"],
    ["chapters", "Chapter tasks", "castle"],
    ["alliance_donation", "Alliance donations", "alliance"],
    ["fountain", "Treasure Fountain", "resources"],
    ["research", "Research", "castle"],
    ["hospital", "Hospital healing", "army"],
    ["alliance_treasure", "Alliance treasure", "alliance"],
    ["magic_palace", "Magic Palace", "events"],
    ["mystery_temple", "Mysterious Temple", "events"],
    ["mystery_merchant", "Mysterious Merchant", "resources"],
    ["pet_care", "Pet care", "heroes"],
    ["alliance_help", "Alliance member help", "alliance"],
  ].map(([id, name, group]) => ({ id, name, group }));
  // Stable game identifiers keep these choices independent of API display language.
  const choiceLabels = {
    gathering: { 0: "Disabled", 1: "Random", 1002: "Wheat", 1003: "Wood", 1004: "Iron", 1005: "Mithril" },
    fountain: {
      0: "Disabled", 1022: "Safe food", 1023: "Safe wood",
      1024: "Safe iron", 1006: "Steel", 1025: "Safe mithril",
    },
    research: {
      "": "Disabled", military: "Military", anchor: "Castle defense",
      cityDevelop: "Castle development", resource: "Resources", hero: "Heroes",
      advancedMilitary: "Advanced military", special: "Special",
    },
  };
  const groups = [
    { id: "castle", name: "Castle & buildings", icon: "castle" },
    { id: "resources", name: "Resources", icon: "leaf" },
    { id: "army", name: "Army", icon: "shield" },
    { id: "heroes", name: "Heroes & pets", icon: "star" },
    { id: "alliance", name: "Alliance", icon: "users" },
    { id: "events", name: "Events", icon: "spark" },
  ];
  function normalizeActivities(rows) {
    const known = new Map(activities.map((a) => [a.id, a])),
      seen = new Set(),
      result = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      if (known.has(row.id) && !seen.has(row.id)) {
        result.push({ ...known.get(row.id), enabled: row.enabled === true });
        seen.add(row.id);
      }
    }
    for (const row of activities) if (!seen.has(row.id)) result.push({ ...row, enabled: false });
    return result;
  }
  function toggle(rows, id, enabled) {
    return rows.map((row) => ({
      ...row,
      enabled:
        row.id === id
          ? enabled
          : enabled &&
              ((id === "upgrade" && row.id === "building_upgrade") ||
                (id === "building_upgrade" && row.id === "upgrade"))
            ? false
            : row.enabled,
    }));
  }
  function sameActivityChoices(left, right) {
    const selected = new Map(right.map(row => [row.id, row.enabled === true]));
    return left.length === right.length && left.every(row =>
      selected.has(row.id) && selected.get(row.id) === (row.enabled === true));
  }
  function apiUrl(base, path, hostname) {
    if (!base || typeof base !== "string")
      throw new Error("This page is temporarily unavailable. Please try again later.");
    const url = new URL(base),
      local = ["localhost", "127.0.0.1", "[::1]"];
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && local.includes(url.hostname) && local.includes(hostname)))
    )
      throw new Error("This page is temporarily unavailable. Please try again later.");
    if (!path.startsWith("/api/")) throw new Error("Please try again.");
    return url.href.replace(/\/$/, "") + path;
  }
  function botUrl(name) {
    return typeof name === "string" && /^[A-Za-z0-9_]{5,32}$/.test(name)
      ? "https://t.me/" + name
      : "https://t.me/sultaro";
  }
  function count(value) {
    return value === null || value === undefined || value === ""
      ? "—"
      : Number.isFinite(Number(value))
        ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
            Number(value),
          )
        : "—";
  }
  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : "#c7c2ad";
  }
  const copy = (value) => JSON.parse(JSON.stringify(value));
  return {
    activities,
    groups,
    choiceLabels,
    normalizeActivities,
    toggle,
    sameActivityChoices,
    apiUrl,
    botUrl,
    count,
    safeColor,
    copy,
  };
});
