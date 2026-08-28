# vendor

Verbatim copies pulled from the React Bits registry via
`pnpm dlx shadcn@latest add @react-bits/<Name>-TS-TW`.

Only local change: a `"use client"` directive, which the registry does not ship
(8 of its 168 components have one) and without which these fail as server
components.

Do not hand-edit otherwise. `eslint.config.mjs` relaxes the `react-hooks` rules
here because the violations are upstream's, and rewriting them would mean
maintaining a fork every time the registry updates.
