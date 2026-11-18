# PRODUCT.md

Context for design work on this repository.

## Purpose

A single-owner portfolio for **Julio Cesar Avolio**, a product engineer in Rio de Janeiro
working remotely. It exists to make a hiring manager or founder stop, and then to let them
find the facts fast. The only conversion is "this person should build things for us".

English only. No blog.

## Who it is for

**First: the technical evaluator.** A staff engineer, engineering manager or founder who
opens the link from LinkedIn or a referral and has little time. The hero answers "who,
where, what now, what before" in one screen, and the contents list on the right jumps to
any entry.

**Second: peers**, who share it if it earns sharing.

## The fiction

The owner runs tabletop RPGs as a Game Master, and the campaign that stayed with them was
Curse of Strahd. The site is an original gothic valley in that spirit:

| On the page | What it stands for |
|---|---|
| The lord on the castle balcony | The owner |
| The keep | SockPuppet, the current role |
| The bats leaving the high tower | The agent workflows the owner designs |
| The scribe's tower in the village | RollSummary, the owner's product |
| The river bridge | topictree (a content delivery network) |
| The mill | V.tal (automation) |
| The gate tower | Oi (monitoring and incident handling) |
| The study | Off duty: games, the table, the home server |
| Villagers on the road, skeletons in the graveyard | Nothing. They are there so the valley is lived in |
| Tarot-style cards | One per entry; a nod to the campaign's card reading |

The fiction is decoration. A reader who ignores it loses nothing: real names lead every
panel, and the fiction's names appear small and muted.

## Voice

- Facts are plain, first person and specific: what was built, with its number.
- The lord speaks in one italic line per entry, dry and polite. Never in the facts.
- No adjective inflation: no "cutting-edge", "robust", "seamless", "leveraging".
- No em dashes in copy.

## Content of record

The owner's LinkedIn profile as of 2026-11-18, mirrored into `src/data/resume.ts`.

## Non-goals

- No CMS, contact form, testimonials, logo wall or newsletter.
- No analytics beyond Vercel Analytics and Speed Insights, which the layout mounts.
- No fallback for browsers without JavaScript or WebGL, and no separate plain CV page. The
  owner chose this.
