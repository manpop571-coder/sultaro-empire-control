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
const dynamicCatalog = [{ id: "fresh_service", name: "Fresh service", group: "map" }, ...U.activities];
const dynamicRows = U.normalizeActivities([{ id: "fresh_service", enabled: true }, { id: "upgrade", enabled: true },
  { id: "unknown", enabled: true }], dynamicCatalog);
assert.equal(dynamicRows.length, 22);
assert.equal(dynamicRows[0].id, "fresh_service");
assert.equal(dynamicRows[0].enabled, true);
assert.equal(dynamicRows[1].id, "upgrade");
assert.equal(U.normalizeActivities([], [{id:"gathering",name:"Resource Gathering",group:"resources"}])[0].name, "Resource gathering");
assert.ok(!dynamicRows.some(row => row.id === "unknown"));
assert.deepEqual(U.normalizeActivities([], [dynamicCatalog[0]]).map(row => row.id), ["fresh_service"]);
const specs = [{id:"fresh_service", fields:[
  {key:"duration", type:"choice", default:900, choices:[{id:900},{id:3600}]},
  {key:"count", type:"integer", default:1, min:1, max:6},
  {key:"buy", type:"boolean", default:false},
  {key:"items", type:"multi_choice", default:[], choices:[{id:101},{id:102}]}]}];
const defaults = U.activityOptions(specs, {});
assert.deepEqual(defaults, {fresh_service:{duration:900,count:1,buy:false,items:[]}});
assert.deepEqual(U.optionChanges(specs, defaults, {fresh_service:{...defaults.fresh_service,count:3}}), {fresh_service:{count:3}});
assert.deepEqual(U.optionChanges(specs, defaults, defaults), {});
assert.ok(U.validOptions(specs, defaults));
for (const patch of [{duration:"900"}, {count:0}, {count:1.2}, {count:null}, {buy:1}])
  assert.ok(!U.validOptions(specs, {fresh_service:patch}));
assert.ok(!U.activityOptions(specs, {fresh_service:{secret:1}}).fresh_service.secret);
assert.ok(U.validOptions(specs, {fresh_service:{items:[101,102]}}));
assert.deepEqual(U.optionChanges(specs, {fresh_service:{items:[101,102]}}, {fresh_service:{items:[102,101]}}), {});
for (const items of [[101,101], [103], ["101"], "101", null])
  assert.ok(!U.validOptions(specs, {fresh_service:{items}}));
let choices = U.toggle(U.normalizeActivities([]), "upgrade", true);
choices = U.toggle(choices, "building_upgrade", true);
assert.equal(choices.find((row) => row.id === "upgrade").enabled, false);
assert.equal(choices.find((row) => row.id === "building_upgrade").enabled, true);
choices = U.toggle(choices, "upgrade", true);
assert.equal(choices.find((row) => row.id === "building_upgrade").enabled, false);
const savedChoices = U.normalizeActivities([{ id: "upgrade", enabled: true }]);
assert.ok(U.sameActivityChoices(savedChoices, savedChoices.slice().reverse()));
assert.ok(!U.sameActivityChoices(savedChoices, U.toggle(savedChoices, "rewards", true)));
assert.ok(!U.sameActivityChoices(savedChoices, []));
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
for (const name of ["locales.js", "game-names.js", "i18n.js"])
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
  assert.ok(I.t("3 farms selected").includes("3"));
  assert.ok(I.t("Choices saved for 2 farms.").includes("2"));
}
I.setLocale("ar");
assert.equal(I.t("Activities"), "الأنشطة");
assert.equal(I.t("Farm 123"), "المزرعة 123");
assert.equal(I.t("Lord level"), "مستوى السلطان");
assert.equal(I.t("March 2"), "المسيرة 2");
assert.equal(I.gameName("pets", 1263), "الصقر");
assert.equal(I.t("Resource gathering"), "جمع الموارد");
assert.equal(I.t("Activity options"), "خيارات الأنشطة");
assert.equal(I.t("Daily balances"), "أرصدة اليوم");
assert.equal(I.t("Resources & troops"), "الموارد والجنود");
const marchTemplate = catalogs.ar["March {0} minimum level"];
delete catalogs.ar["March {0} minimum level"];
assert.equal(I.t("March 2 minimum level"), "March 2 minimum level");
catalogs.ar["March {0} minimum level"] = marchTemplate;
I.setLocale("invalid");
assert.equal(I.locale(), "en");
assert.equal(U.petNames, undefined);
assert.equal(U.choiceLabels.gathering[1003], "Wood");
assert.equal(U.choiceLabels.gathering[1001], "Gold");
const gatheringDefaults = U.gatheringRanges();
assert.deepEqual(gatheringDefaults, Array.from({ length: 6 }, () => [1, 8]));
gatheringDefaults[0][0] = 3;
assert.deepEqual(gatheringDefaults[1], [1, 8]);
const copiedRanges = U.gatheringRanges(gatheringDefaults);
copiedRanges[0][1] = 5;
assert.deepEqual(gatheringDefaults[0], [3, 8]);
for (const invalid of [[], [[1, 8]], Array(6).fill([5, 2]), Array(6).fill([0, 8]),
  Array(6).fill([1, 9]), Array(6).fill([true, 8])]) assert.throws(() => U.gatheringRanges(invalid));
I.setLocale("ar");
assert.equal(I.t("Minimum level"), "أدنى مستوى");
assert.equal(I.t("March 2 maximum level"), "المسيرة 2: أقصى مستوى");
I.setLocale("en");
assert.equal(U.choiceLabels.fountain[1023], "Safe wood");
assert.equal(U.choiceLabels.research.resource, "Resources");
const official = sandbox.window.SULTARO_GAME_NAMES;
assert.equal(Object.keys(official.heroes).length, 82);
assert.equal(Object.keys(official.pets).length, 15);
for (const language of I.languages) {
  I.setLocale(language.code);
  for (const kind of ["heroes", "pets"]) {
    for (const [id, names] of Object.entries(official[kind])) {
      assert.ok(names[language.code], kind + " " + id + " " + language.code);
      assert.equal(I.gameName(kind, id), names[language.code]);
      if (language.code !== "ar") assert.ok(!/[\u0600-\u06ff]/.test(I.gameName(kind, id)));
    }
    assert.ok(I.gameName(kind, 99999999).includes("99999999"));
    if (language.code !== "ar") assert.ok(!/[\u0600-\u06ff]/.test(I.gameName(kind, 99999999)));
  }
}
I.setLocale("en");
assert.equal(I.gameName("pets", 1263), "Eagle");
assert.equal(I.gameName("pets", 1267), "Ironclad Elephant");
assert.equal(I.gameName("pets", 1272), "Sandstorm Griffin");
official.heroes[99999990] = { en: "English fallback", ar: "اسم عربي" };
I.setLocale("de");
assert.equal(I.gameName("heroes", 99999990), "English fallback");
official.heroes[99999990] = { ar: "اسم عربي" };
assert.equal(I.gameName("heroes", 99999990), "Held 99999990");
delete official.heroes[99999990];
I.setLocale("ar");
assert.equal(I.gameName("heroes", 99999990), "البطل 99999990");
I.setLocale("en");
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
