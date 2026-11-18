import assert from "node:assert/strict";
import { test } from "node:test";
import { CARDS, GROUPS, RELICS, SITE, formatPeriod, yearOf } from "../src/data/resume.ts";

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

test("every card has a unique id and numeral, and a known group", () => {
  const groups = new Set(GROUPS.map((g) => g.id));
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
  assert.equal(new Set(CARDS.map((c) => c.numeral)).size, CARDS.length);
  for (const card of CARDS) assert.ok(groups.has(card.group), `${card.id} has group ${card.group}`);
});

test("every group has a card, so the hero and the contents never show an empty row", () => {
  for (const group of GROUPS) {
    assert.ok(CARDS.some((c) => c.group === group.id), `${group.id} is empty`);
  }
});

test("a group of several cards does not depend on a glance line", () => {
  for (const group of GROUPS) {
    const cards = CARDS.filter((c) => c.group === group.id);
    if (cards.length === 1) assert.ok(cards[0].glance, `${cards[0].id} is alone in its group and needs a glance`);
  }
});

test("roles end after they start", () => {
  for (const card of CARDS) {
    for (const role of card.roles) {
      assert.ok(role.end === null || role.end >= role.start, `${role.org} ${role.start} to ${role.end}`);
    }
  }
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
  const banned = strings([SITE, CARDS, RELICS]).filter((s) => /[—·]/.test(s));
  assert.deepEqual(banned, []);
});

test("the location is built from the city, so the two cannot disagree", () => {
  assert.ok(SITE.location.startsWith(SITE.city));
});
