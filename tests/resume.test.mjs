import assert from "node:assert/strict";
import { test } from "node:test";
import { CARDS, CURRENT_ROLE, GROUPS, RELICS, SITE, formatPeriod, roman, rolesOf, whenOf, yearOf, years } from "../src/data/resume.ts";

const role = (start, end) => ({ org: "Org", title: "Title", terms: "Full-time", start, end, location: "Remote" });

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

test("formatPeriod names both ends, and 'now' for an open role", () => {
  assert.equal(formatPeriod("2026-02", null), "Feb 2026 to now");
  assert.equal(formatPeriod("2023-12", "2025-11"), "Dec 2023 to Nov 2025");
  assert.equal(formatPeriod("2022-08", "2022-08"), "Aug 2022 to Aug 2022");
});

test("yearOf reads the year of a YYYY-MM value", () => {
  assert.equal(yearOf("2021-08"), 2021);
  assert.equal(yearOf("2026-02"), 2026);
});

test("roman writes the numeral for a position, subtractive forms included", () => {
  const known = [[1, "I"], [4, "IV"], [6, "VI"], [9, "IX"], [14, "XIV"], [40, "XL"], [49, "XLIX"], [1994, "MCMXCIV"]];
  for (const [n, numeral] of known) assert.equal(roman(n), numeral, String(n));
});

test("every card has a unique id and a known group", () => {
  const groups = new Set(GROUPS.map((g) => g.id));
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
  for (const card of CARDS) assert.ok(groups.has(card.group), `${card.id} has group ${card.group}`);
});

test("cards are numbered from I in position order, with no two alike", () => {
  assert.equal(CARDS[0].numeral, "I");
  assert.equal(new Set(CARDS.map((c) => c.numeral)).size, CARDS.length);
});

test("cards are listed in group order, so the page, the contents and the camera agree", () => {
  const order = GROUPS.map((g) => g.id);
  const positions = CARDS.map((c) => order.indexOf(c.group));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("every group has a card, so the hero and the contents never show an empty row", () => {
  for (const group of GROUPS) {
    assert.ok(CARDS.some((c) => c.group === group.id), `${group.id} is empty`);
  }
});

test("a group without a glance has role cards to take its years from", () => {
  for (const group of GROUPS) {
    if (group.glance) continue;
    const roles = rolesOf(CARDS.filter((c) => c.group === group.id));
    assert.ok(roles.length > 0, `${group.id} has no glance and no role card, so the hero has nothing to show`);
  }
});

test("a glance is a whole sentence, because the hero adds nothing after it", () => {
  for (const group of GROUPS) {
    if (group.glance === undefined) continue;
    assert.match(group.glance, /\.$/, `${group.id}: "${group.glance}"`);
  }
});

test("each card carries the fields of its own type and none of the other's", () => {
  for (const card of CARDS) {
    const practice = card.type === "practice";
    assert.equal("steps" in card, practice, `${card.id}: steps`);
    assert.equal("usedAt" in card, practice, `${card.id}: usedAt`);
    assert.equal("roles" in card, !practice, `${card.id}: roles`);
    if (practice) assert.ok(card.steps.length > 0 && card.usedAt, `${card.id} has no steps or no note`);
  }
});

test("roles end after they start", () => {
  for (const card of CARDS) {
    if (card.type !== "role") continue;
    for (const role of card.roles) {
      assert.ok(role.end === null || role.end >= role.start, `${role.org} ${role.start} to ${role.end}`);
    }
  }
});

test("years spans the roles from the first start to the last end", () => {
  assert.equal(years([role("2023-12", "2025-11")]), "2023 to 2025");
  assert.equal(years([role("2022-08", "2023-11"), role("2022-01", "2022-08")]), "2022 to 2023");
  assert.equal(years([role("2021-08", "2021-12")]), "2021");
});

test("years ends at now while any role is open, whatever order the roles come in", () => {
  assert.equal(years([role("2026-02", null)]), "2026 to now");
  assert.equal(years([role("2020-01", "2022-06"), role("2024-03", null)]), "2020 to now");
  assert.equal(years([role("2024-03", null), role("2020-01", "2022-06")]), "2020 to now");
});

test("years refuses an empty list rather than printing Infinity", () => {
  assert.throws(() => years([]), RangeError);
});

test("rolesOf gathers the roles of role cards in order and skips practice cards", () => {
  const practice = CARDS.filter((c) => c.type === "practice");
  assert.ok(practice.length > 0 && rolesOf(practice).length === 0);
  const all = rolesOf(CARDS);
  assert.equal(all.length, CARDS.reduce((n, c) => n + (c.type === "role" ? c.roles.length : 0), 0));
  assert.equal(all[0], CARDS.find((c) => c.type === "role").roles[0]);
});

test("whenOf gives a role card its years and a practice card nothing", () => {
  for (const card of CARDS) {
    assert.equal(whenOf(card), card.type === "role" ? years(card.roles) : undefined, card.id);
  }
});

test("CURRENT_ROLE is an open role of the now group", () => {
  assert.equal(CURRENT_ROLE.end, null);
  assert.ok(rolesOf(CARDS.filter((c) => c.group === "now")).includes(CURRENT_ROLE));
});

test("a card shows at most three figures and has highlights with content", () => {
  for (const card of CARDS) {
    assert.ok(card.figures.length <= 3, `${card.id} has ${card.figures.length} figures`);
    assert.ok(card.deeds.length > 0, `${card.id} has no highlights`);
    for (const group of card.deeds) {
      assert.ok(group.topic && group.items.length > 0, `${card.id}: empty highlight group`);
    }
    assert.ok(card.stack.length > 0, `${card.id} lists no tools`);
  }
});

test("the scene looks up the section called swarm, so a card must have that id", () => {
  assert.ok(CARDS.some((c) => c.id === "swarm"));
});

test("the shelf's objects have unique ids", () => {
  assert.equal(new Set(RELICS.map((r) => r.id)).size, RELICS.length);
});

test("copy has no em dashes or middle dots, which DESIGN.md bans", () => {
  const banned = strings([SITE, GROUPS, CARDS, RELICS]).filter((s) => /[—·]/.test(s));
  assert.deepEqual(banned, []);
});

test("the location is built from the city, so the two cannot disagree", () => {
  assert.ok(SITE.location.startsWith(SITE.city));
});
