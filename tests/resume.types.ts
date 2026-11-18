// Type-level tests, never run: each @ts-expect-error is a state the data model must reject, and an unused one fails typecheck.
import type { Card, Group, PracticeCard, Relic, Role, RoleCard, StopId } from "@/data/resume";
import { GROUPS } from "@/data/resume";

declare const role: Role;
declare const roleBase: Omit<RoleCard, "type" | "roles">;
declare const practiceBase: Omit<PracticeCard, "type" | "usedAt" | "steps">;
declare const card: Card;

export const roleCard: RoleCard = { ...roleBase, type: "role", roles: [role] };
export const practiceCard: PracticeCard = { ...practiceBase, type: "practice", usedAt: "Used here.", steps: [] };

// @ts-expect-error a role card needs roles
export const noRoles: RoleCard = { ...roleBase, type: "role" };
// @ts-expect-error a role card needs at least one role
export const emptyRoles: RoleCard = { ...roleBase, type: "role", roles: [] };
// @ts-expect-error a role card has no practice note
export const roleWithNote: RoleCard = { ...roleBase, type: "role", roles: [role], usedAt: "Used here." };
// @ts-expect-error a role card has no steps
export const roleWithSteps: RoleCard = { ...roleBase, type: "role", roles: [role], steps: [] };
// @ts-expect-error a practice card has no roles
export const practiceWithRoles: PracticeCard = { ...practiceBase, type: "practice", usedAt: "x", steps: [], roles: [role] };
// @ts-expect-error a practice card needs its note
export const noNote: PracticeCard = { ...practiceBase, type: "practice", steps: [] };
// @ts-expect-error a practice card needs its steps
export const noSteps: PracticeCard = { ...practiceBase, type: "practice", usedAt: "Used here." };
// @ts-expect-error a card is a role card or a practice card
export const otherType: RoleCard = { ...roleBase, type: "job", roles: [role] };
// @ts-expect-error the numeral is derived from the card's position, not written on it
export const typedNumeral: RoleCard = { ...roleBase, type: "role", roles: [role], numeral: "I" };
// @ts-expect-error a card belongs to a group that exists
export const unknownGroup: RoleCard = { ...roleBase, group: "later", type: "role", roles: [role] };

// @ts-expect-error roles exist only on a role card
export const rolesOfAnyCard = card.roles;
// @ts-expect-error steps exist only on a practice card
export const stepsOfAnyCard = card.steps;
// @ts-expect-error a practice card is not narrowed to roles
export const practiceRoles = card.type === "practice" ? card.roles : [];
// @ts-expect-error the glance belongs to the group, not the card
export const cardGlance = card.glance;
export const firstRole: Role = card.type === "role" ? card.roles[0] : role;
// @ts-expect-error a card id is one of the ids in CARDS
export const strayId: Card = { ...card, id: "hall" };
type OmitFromEach<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
declare const unnumbered: OmitFromEach<Card, "numeral">;
// @ts-expect-error a card needs the numeral CARDS derives for it
export const noNumeral: Card = unnumbered;

// @ts-expect-error a card id is one of the cards in CARDS
export const unknownStop: StopId = "hall";
export const knownStop: StopId = "seat";

// @ts-expect-error a group id is one of the groups in GROUPS
export const unknownGroupId: Group = "later";
// @ts-expect-error a group may have no glance
export const glanceOfAnyGroup: string = GROUPS[0].glance;
export const groupId: Group = GROUPS[0].id;

// @ts-expect-error a relic id is one of the relics in RELICS
export const unknownRelic: Relic["id"] = "sword";
export const knownRelic: Relic["id"] = "dice";
