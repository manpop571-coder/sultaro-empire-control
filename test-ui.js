"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const U = require("./ui.js");
assert.equal(U.activities.length, 21);
assert.equal(new Set(U.activities.map((row) => row.id)).size, 21);
assert.equal(U.normalizeActivities([]).filter((row) => row.enabled).length, 0);
assert.equal(U.normalizeActivities([{ id: "unknown", enabled: true }]).length, 21);
assert.equal(
  U.normalizeActivities([
    { id: "upgrade", enabled: true },
    { id: "upgrade", enabled: true },
  ]).filter((row) => row.id === "upgrade").length,
  1,
);
assert.equal(U.move, undefined);
let choices = U.toggle(U.normalizeActivities([]), "upgrade", true);
choices = U.toggle(choices, "building_upgrade", true);
assert.equal(choices.find((row) => row.id === "upgrade").enabled, false);
assert.equal(choices.find((row) => row.id === "building_upgrade").enabled, true);
choices = U.toggle(choices, "upgrade", true);
assert.equal(choices.find((row) => row.id === "building_upgrade").enabled, false);
assert.equal(
  U.apiUrl("https://api.example.test/", "/api/activities", "public.test"),
  "https://api.example.test/api/activities",
);
assert.equal(
  U.apiUrl("http://localhost:8099", "/api/activities", "localhost"),
  "http://localhost:8099/api/activities",
);
for (const base of [
  "",
  "http://remote.test",
  "http://localhost:8099",
  "https://user:secret@api.test",
  "https://api.test?token=secret",
  "https://api.test/#secret",
  "javascript:alert(1)",
])
  assert.throws(() => U.apiUrl(base, "/api/me", "public.test"));
assert.throws(() => U.apiUrl("https://api.test", "//evil.test", "public.test"));
assert.equal(U.botUrl("SultaroBot"), "https://t.me/SultaroBot");
assert.equal(U.botUrl("javascript:alert(1)"), "https://t.me/sultaro");
assert.equal(U.safeColor("#D6B974"), "#D6B974");
assert.equal(U.safeColor("url(https://example.test)"), "#c7c2ad");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const name of ["locales.js", "i18n.js"])
  vm.runInContext(fs.readFileSync(path.join(__dirname, name), "utf8"), sandbox);
const I = sandbox.window.SultaroI18n,
  catalogs = sandbox.window.SULTARO_LOCALES,
  keys = Object.keys(catalogs.en).sort();
assert.equal(I.languages.length, 16);
assert.equal(Object.keys(catalogs).length, 16);
for (const language of I.languages) {
  assert.deepEqual(Object.keys(catalogs[language.code]).sort(), keys);
  for (const key of keys) {
    assert.ok(catalogs[language.code][key].trim());
    assert.deepEqual(
      (catalogs[language.code][key].match(/\{\d+\}/g) || []).sort(),
      (key.match(/\{\d+\}/g) || []).sort(),
      language.code + ": " + key,
    );
  }
  I.setLocale(language.code);
  assert.ok(I.t("Farm 123").includes("123"));
  assert.ok(I.error("operator_managed"));
}
I.setLocale("ar");
assert.equal(I.t("Activities"), "الأنشطة");
assert.equal(I.t("Farm 123"), "المزرعة 123");
assert.equal(I.t("Lord level"), "مستوى السلطان");
assert.equal(I.t("March 2"), "المسيرة 2");
assert.equal(I.t("Falcon"), "الصقر");
assert.equal(I.t("Resource gathering"), "جمع الموارد");
I.setLocale("invalid");
assert.equal(I.locale(), "en");
assert.ok(
  !keys.some((key) =>
    /\b(functions?|sessions?|passwords?|emails?|workers?|cycles?|headless|SQL)\b/i.test(key),
  ),
);
const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
for (const route of [
  "/api/run",
  "/api/stop",
  "/api/logs",
  "/api/status",
  "/capture",
  "/api/functions",
])
  assert.ok(!source.includes(route), route);
for (const oldId of ["12397154", "12397335", "12397502"]) assert.ok(!source.includes(oldId));
assert.ok(!source.includes("localStorage"));
console.log(
  "Customer UI helpers passed: 21 choices, no ordering/control routes, 16 complete catalogs, safe URLs and reviewed Arabic.",
);
