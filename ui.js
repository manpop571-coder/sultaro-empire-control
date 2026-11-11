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
    ["military_port", "Military Port", "daily"],
    ["hero_upgrade", "Hero development", "heroes"],
    ["invaders", "Invader attacks", "map"],
    ["gathering", "Resource gathering", "resources"],
    ["troop_training", "Troop training", "resources"],
    ["chapters", "Chapter tasks", "daily"],
    ["alliance_donation", "Alliance donations", "alliance"],
    ["fountain", "Treasure Fountain", "resources"],
    ["research", "Research", "castle"],
    ["hospital", "Hospital healing", "daily"],
    ["alliance_treasure", "Alliance treasure", "alliance"],
    ["magic_palace", "Magic Palace", "events"],
    ["mystery_temple", "Mysterious Temple", "events"],
    ["mystery_merchant", "Mysterious Merchant", "resources"],
    ["pet_care", "Pet care", "heroes"],
    ["alliance_help", "Alliance member help", "alliance"],
  ].map(([id, name, group]) => ({ id, name, group }));
  // Stable game identifiers keep these choices independent of API display language.
  const choiceLabels = {
    gathering: { 0: "Disabled", 1: "Random", 1001: "Gold", 1002: "Wheat", 1003: "Wood", 1004: "Iron", 1005: "Mithril" },
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
    { id: "resources", name: "Resources & troops", icon: "leaf" },
    { id: "daily", name: "Daily routine", icon: "check" },
    { id: "heroes", name: "Heroes & regalia", icon: "star" },
    { id: "map", name: "World map", icon: "gem" },
    { id: "alliance", name: "Alliance", icon: "users" },
    { id: "castle", name: "Buildings & research", icon: "castle" },
    { id: "events", name: "Events & bonuses", icon: "spark" },
    { id: "protection", name: "Protection", icon: "shield" },
  ];
  function normalizeActivities(rows, catalog) {
    const descriptors = Array.isArray(catalog) && catalog.length ? catalog : activities;
    const publicNames = new Map(activities.map(row => [row.id, row.name]));
    const known = new Map(descriptors.filter(row => row && typeof row.id === "string" &&
      typeof row.name === "string" && groups.some(group => group.id === row.group)).map(row =>
      [row.id, { id: row.id, name: publicNames.get(row.id) || row.name, group: row.group }])),
      seen = new Set(),
      result = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      if (row && known.has(row.id) && !seen.has(row.id)) {
        result.push({ ...known.get(row.id), enabled: row.enabled === true });
        seen.add(row.id);
      }
    }
    for (const row of known.values()) if (!seen.has(row.id)) result.push({ ...row, enabled: false });
    return result;
  }
  function activityOptions(specs, values) {
    const result = {};
    for (const spec of specs || []) {
      const fields = {};
      for (const field of spec.fields || []) {
        if (!["boolean", "integer", "choice", "multi_choice"].includes(field.type)) continue;
        fields[field.key] = values && values[spec.id] &&
          Object.prototype.hasOwnProperty.call(values[spec.id], field.key)
          ? values[spec.id][field.key] : field.default;
      }
      if (Object.keys(fields).length) result[spec.id] = fields;
    }
    return result;
  }
  function optionChanges(specs, before, after) {
    const left = activityOptions(specs, before), right = activityOptions(specs, after), changes = {};
    for (const [id, fields] of Object.entries(right)) for (const [key, value] of Object.entries(fields)) {
      const equal = Array.isArray(value) && Array.isArray(left[id][key])
        ? value.length === left[id][key].length && value.every(item => left[id][key].includes(item))
        : left[id][key] === value;
      if (!equal) (changes[id] || (changes[id] = {}))[key] = value;
    }
    return changes;
  }
  function validOptions(specs, values) {
    for (const spec of specs || []) for (const field of spec.fields || []) {
      if (!values[spec.id] || !Object.prototype.hasOwnProperty.call(values[spec.id], field.key)) continue;
      const value = values[spec.id][field.key];
      if (field.type === "boolean" && typeof value !== "boolean") return false;
      if (field.type === "integer" && (!Number.isInteger(value) || value < field.min || value > field.max)) return false;
      if (field.type === "choice" && !(field.choices || []).some(choice => choice.id === value)) return false;
      if (field.type === "multi_choice" && (!Array.isArray(value) || new Set(value).size !== value.length ||
        value.some(item => !(field.choices || []).some(choice => choice.id === item)))) return false;
    }
    return true;
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
  function gatheringRanges(value, limits = { min_level: 1, max_level: 8 }) {
    if (value === undefined || value === null)
      return Array.from({ length: 6 }, () => [limits.min_level, limits.max_level]);
    if (!Array.isArray(value) || value.length !== 6 || value.some(pair =>
      !Array.isArray(pair) || pair.length !== 2 || !pair.every(Number.isInteger) ||
      pair[0] < limits.min_level || pair[0] > pair[1] || pair[1] > limits.max_level))
      throw new Error("Please check your choices and try again.");
    return value.map(pair => pair.slice());
  }
  return {
    activities,
    groups,
    choiceLabels,
    normalizeActivities,
    activityOptions,
    optionChanges,
    validOptions,
    toggle,
    sameActivityChoices,
    apiUrl,
    botUrl,
    count,
    safeColor,
    gatheringRanges,
    copy,
  };
});
