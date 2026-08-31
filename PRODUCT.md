# PRODUCT.md

Context for design work on this repository. Consumed by the `impeccable` skill.

## Register

`brand`

This is a personal portfolio. The design *is* the product. A visitor's impression in the
first four seconds is the entire deliverable. There is no funnel, no retention metric, no
task to complete. The only conversion event is "this person should build things for us."

## Product purpose

A single-owner portfolio for **Julio Cesar Avolio**, a Brazilian full-stack developer
working remotely for US companies. It exists to:

1. Make a hiring manager or founder stop scrolling.
2. Prove technical range without a wall of bullet points.
3. Be the artifact that itself demonstrates the craft it claims.
4. Host long-form writing (MDX blog) on engineering topics.

Bilingual: English and Brazilian Portuguese. English is the default and the hiring
language; Portuguese is for local network and community.

## Who it is for

**Primary: the technical evaluator.** A staff engineer, eng manager, or technical founder
in the US who opens the link from a LinkedIn message, a GitHub profile, or a referral.
They have thirty seconds and a strong slop detector. They have seen four hundred
`dillionverma/portfolio` clones. They will not read the summary paragraph. They *will*
open devtools if something looks impossible.

**Secondary: recruiters and non-technical screeners.** They need name, role, stack,
location, availability, and contact reachable without interpretation. The art must never
cost them the facts.

**Tertiary: other developers.** Peers who find it through a blog post or a shared link.
They are the ones who will share it if it earns sharing.

## Voice and tone

- **Load-bearing, not decorative.** Every claim is a thing that happened, with a
  consequence attached. "Centralized email delivery across six systems into one service"
  beats "passionate about scalable solutions."
- **First person, low ceremony.** No third-person bio voice. No "I'm a passionate
  developer who loves to code."
- **Precise about scope.** Says what was owned versus contributed to.
- **Dry, not jokey.** Occasional wit in system copy (empty states, 404, console) is
  welcome. Never in the work history.
- **No adjective inflation.** No "cutting-edge," "robust," "seamless," "leveraging."

## Anti-references

Things this site must not resemble:

- `dillionverma/portfolio` and its thousands of forks. This repo is currently one of
  them. That is the specific thing being escaped.
- Any portfolio whose hero is `Hi, I'm <Name> 👋` next to a circular avatar.
- The Vercel/Linear house style: Inter, subtle gradients, glass cards, dark navy.
- The "AI-generated landing page" shape: centered stack, three icon-heading-text cards,
  gradient text, a testimonial slot with no testimonials.
- Green-on-black hacker-movie terminal. The site is text-mode; it is not a Matrix
  screensaver. Terminal aesthetic done by reflex is its own cliché.
- Portfolios that are one WebGL toy and no information.
- Portfolios that are a resume in HTML and no point of view.

## Strategic principles

1. **The medium is the argument.** If the site claims systems ability, the site must
   itself be a system: a real renderer, a real grid, real constraints, not a picture of
   one. Anyone who opens devtools should find something they did not expect.
2. **Text-mode is a constraint, not a costume.** Committing to a character grid means the
   layout math, the imagery, the loaders, the charts and the transitions all resolve to
   glyphs. Half-committing (a mono font over a normal Tailwind page) is worse than not
   committing.
3. **Facts survive the art.** Every piece of ASCII art is `aria-hidden`. Underneath it is
   real semantic HTML that a screen reader, a scraper, and Google all parse correctly.
   Turning off JavaScript, or turning on reduced-motion, must leave a site that still
   reads and still impresses.
4. **One dominant spectacle.** The galaxy is the centerpiece. Everything else is
   quieter on purpose. Layering five extraordinary moments produces noise, not awe.
5. **Never lie about the work.** All content is sourced from the LinkedIn resume of
   record. No invented metrics, no invented clients.

## Content of record

Source of truth for all copy: `/Users/jravolio/Downloads/Profile.pdf` (LinkedIn export,
5 pages, retrieved 2026-08-28), mirrored into `src/data/`.

Key facts the current site gets wrong and must fix:

- Current role is **Full Stack Developer at PlanetBids** (US e-procurement for public
  agencies), Sep 2025 to present, contracted through **GoFasti**. Not TopicTree.
- **topictree** ran Dec 2023 to Nov 2025 and has ended.
- **V.tal** has two entries: Full Stack Developer (Aug 2022 to Nov 2023) and O&M Intern
  (Jan 2022 to Aug 2022).
- **Oi** was an IT Intern role, Aug 2021 to Dec 2021.
- The stack is **AWS-first** now (SES, SQS, Kubernetes, OpenSearch, Terraform), not the
  GCP/Azure framing the current site shows.
- Languages: English and Portuguese, both listed native/bilingual.

## Non-goals

- No CMS. Content lives in the repo.
- No contact form. Email and LinkedIn are enough; a form is a spam magnet and a lie about
  responsiveness.
- No testimonials, no logo wall, no "trusted by."
- No analytics beyond privacy-respecting page counts.
- No newsletter capture.
