(function (root, factory) {
  const value = factory();
  if (typeof module === "object" && module.exports) module.exports = value;
  else root.SultaroUI = value;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const functions = [
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
  const groups = [
    { id: "castle", name: "Castle & buildings", icon: "castle" },
    { id: "resources", name: "Resources", icon: "leaf" },
    { id: "army", name: "Army", icon: "shield" },
    { id: "heroes", name: "Heroes & pets", icon: "star" },
    { id: "alliance", name: "Alliance", icon: "users" },
    { id: "events", name: "Events", icon: "spark" },
  ];
  function ordered(rows) {
    const known = new Map(functions.map((row) => [row.id, row]));
    const seen = new Set();
    const result = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      if (known.has(row.id) && !seen.has(row.id)) {
        result.push({ ...known.get(row.id), enabled: row.enabled === true });
        seen.add(row.id);
      }
    }
    for (const row of functions) if (!seen.has(row.id)) result.push({ ...row, enabled: false });
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
  function move(rows, index, offset) {
    const result = rows.slice();
    const destination = index + offset;
    if (index < 0 || index >= rows.length || destination < 0 || destination >= rows.length)
      return result;
    const [row] = result.splice(index, 1);
    result.splice(destination, 0, row);
    return result;
  }
  function apiUrl(base, path, pageHostname) {
    if (!base || typeof base !== "string")
      throw new Error("Dashboard connection is not configured yet.");
    const url = new URL(base);
    const local = ["localhost", "127.0.0.1", "[::1]"];
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && local.includes(url.hostname) && local.includes(pageHostname)))
    ) {
      throw new Error("The dashboard connection must use HTTPS.");
    }
    if (!path.startsWith("/api/")) throw new Error("Invalid dashboard request.");
    return url.href.replace(/\/$/, "") + path;
  }
  function botUrl(username) {
    return typeof username === "string" && /^[A-Za-z0-9_]{5,32}$/.test(username)
      ? "https://t.me/" + username
      : "https://t.me/sultaro";
  }
  function count(value) {
    return Number.isFinite(Number(value)) ? new Intl.NumberFormat("en").format(Number(value)) : "—";
  }
  function number(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }
  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : "#a8b7ca";
  }
  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }
  return {
    functions,
    groups,
    ordered,
    toggle,
    move,
    apiUrl,
    botUrl,
    count,
    number,
    safeColor,
    copy,
  };
});
