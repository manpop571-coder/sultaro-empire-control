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
  const petNames = {
    1261: "Deer",
    1262: "Lion",
    1263: "Falcon",
    1264: "Wolf",
    1265: "Leopard",
    1266: "War bear",
    1267: "Giant elephant",
    1268: "Wild bull",
    1269: "Kangal dog",
    1270: "Saber-toothed tiger",
    1271: "Rhinoceros",
    1272: "Sandstorm phoenix",
    1273: "Rebel tiger",
    1274: "Death lizard",
    1275: "Hydra",
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
    petNames,
    normalizeActivities,
    toggle,
    apiUrl,
    botUrl,
    count,
    safeColor,
    copy,
  };
});
