import type { ThemeRegistrationRaw } from "shiki";

/**
 * Code blocks bound to this site's own tokens.
 *
 * Shiki's old `css-variables` theme was removed in v1, and every bundled theme
 * ships a full palette that would sit inside the page fighting the two-device
 * one. Emitting `var(--token)` as the colour value means code blocks recolour
 * with the theme toggle for free, with no second stylesheet and no flash.
 */
const fg = (token: string) => `var(--${token})`;

const SETTINGS: NonNullable<ThemeRegistrationRaw["settings"]> = [
  { settings: { foreground: fg("text") } },
  {
    scope: ["comment", "punctuation.definition.comment", "string.comment"],
    settings: { foreground: fg("dim"), fontStyle: "italic" },
  },
  {
    scope: ["string", "constant.other.symbol", "string.regexp"],
    settings: { foreground: fg("cyan") },
  },
  {
    scope: ["constant.numeric", "constant.language", "constant.character", "keyword.other.unit"],
    settings: { foreground: fg("hot") },
  },
  {
    scope: ["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new"],
    settings: { foreground: fg("amber") },
  },
  {
    scope: ["entity.name.function", "support.function", "meta.function-call"],
    settings: { foreground: fg("ink-hi") },
  },
  {
    scope: ["entity.name.type", "support.type", "support.class", "entity.name.class"],
    settings: { foreground: fg("amber") },
  },
  {
    scope: ["variable", "variable.parameter", "meta.definition.variable"],
    settings: { foreground: fg("text") },
  },
  {
    scope: ["punctuation", "meta.brace", "keyword.operator"],
    settings: { foreground: fg("dim") },
  },
  {
    scope: ["entity.name.tag", "meta.tag"],
    settings: { foreground: fg("amber") },
  },
  {
    scope: ["entity.other.attribute-name"],
    settings: { foreground: fg("cyan") },
  },
  {
  scope: ["invalid", "invalid.illegal"],
  settings: { foreground: fg("hot") },
  },
];

export const terminalTheme: ThemeRegistrationRaw = {
  name: "terminal",
  type: "dark",
  fg: fg("text"),
  bg: "transparent",
  settings: SETTINGS,
  // `tokenColors` is NOT redundant. rehype-pretty-code decides whether a theme
  // is a raw object or a {light,dark} map with
  //     isJSONTheme = (v) => Object.hasOwn(v, "tokenColors")
  // so a theme carrying only Shiki's `settings` is misread as a multi-theme
  // map, Object.values() is taken over it, and Shiki is asked for a theme named
  // after whatever that yields. Shiki itself reads `settings`.
  tokenColors: SETTINGS,
};
