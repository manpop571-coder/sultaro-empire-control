"use strict";
const assert = require("node:assert/strict");
const UI = require("./ui.js");

assert.equal(UI.functions.length, 21);
assert.equal(new Set(UI.functions.map((row) => row.id)).size, 21);
assert.equal(UI.ordered([]).filter((row) => row.enabled).length, 0);
assert.equal(UI.ordered([{ id: "injected", enabled: true }]).length, 21);
assert.equal(
  UI.ordered([
    { id: "upgrade", enabled: true },
    { id: "upgrade", enabled: true },
  ]).filter((row) => row.id === "upgrade").length,
  1,
);
let rows = UI.toggle(UI.ordered([]), "upgrade", true);
rows = UI.toggle(rows, "building_upgrade", true);
assert.equal(rows.find((row) => row.id === "upgrade").enabled, false);
assert.equal(rows.find((row) => row.id === "building_upgrade").enabled, true);
rows = UI.toggle(rows, "upgrade", true);
assert.equal(rows.find((row) => row.id === "building_upgrade").enabled, false);
const original = UI.ordered([]);
assert.equal(UI.move(original, 0, 3)[3].id, "upgrade");
assert.equal(original[0].id, "upgrade");
assert.deepEqual(UI.move(original, 0, -1), original);
assert.deepEqual(UI.move(original, 21, 1), original);
assert.equal(
  UI.apiUrl("https://api.example.test/", "/api/status", "public.test"),
  "https://api.example.test/api/status",
);
assert.equal(
  UI.apiUrl("http://localhost:8099", "/api/status", "localhost"),
  "http://localhost:8099/api/status",
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
  assert.throws(() => UI.apiUrl(base, "/api/me", "public.test"));
assert.throws(() => UI.apiUrl("https://api.test", "//evil.test", "public.test"));
assert.equal(UI.botUrl("SultaroBot"), "https://t.me/SultaroBot");
assert.equal(UI.botUrl("javascript:alert(1)"), "https://t.me/sultaro");
assert.equal(UI.safeColor("#E9BC72"), "#E9BC72");
assert.equal(UI.safeColor("url(https://example.test)"), "#a8b7ca");
console.log("Frontend helpers: all checks passed.");
const vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "locales.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "i18n.js"), "utf8"), sandbox);
const I = sandbox.window.SultaroI18n,
  catalogs = sandbox.window.SULTARO_LOCALES;
assert.equal(I.languages.length, 16);
assert.equal(Object.keys(catalogs).length, 16);
const englishKeys = Object.keys(catalogs.en).sort();
for (const language of I.languages) {
  assert.deepEqual(Object.keys(catalogs[language.code]).sort(), englishKeys);
  for (const key of englishKeys) {
    assert.ok(catalogs[language.code][key].trim());
    assert.deepEqual(
      (catalogs[language.code][key].match(/\{\d+\}/g) || []).sort(),
      (key.match(/\{\d+\}/g) || []).sort(),
      language.code + ": " + key,
    );
  }
  I.setLocale(language.code);
  assert.ok(I.t("Farm 123").includes("123"));
  assert.ok(I.t("Move Castle upgrades up"));
  assert.ok(I.error("no_farms"));
}
I.setLocale("ar");
assert.equal(I.t("Functions"), "الدوال");
assert.equal(I.t("Farm 123"), "المزرعة 123");
assert.equal(I.t("Farm 1 · user@example.test"), "المزرعة 1 · user@example.test");
assert.equal(I.t("Resource gathering"), "جمع الموارد");
I.setLocale("invalid");
assert.equal(I.locale(), "en");
console.log("All 16 locale catalogs are complete; placeholders and dynamic labels passed.");
