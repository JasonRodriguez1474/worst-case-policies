# Dependency Maintenance

## Overview

This project uses Deno to manage npm dependencies for SvelteKit. The remediation
baseline was **81 reported vulnerabilities** (9 low, 30 moderate, 40 high,
2 critical). These are audit findings, not necessarily distinct CVE identifiers.
The final `deno audit` result was **No known vulnerabilities found** (exit 0).
A clean audit reflects the current advisory database, not a guarantee of security.

Verification used Deno 2.9.7 on macOS arm64.

| Stage | Result |
| --- | --- |
| Reported baseline | 81 findings |
| `deno update --compatible` | 25 direct dependencies updated; 23 findings remained (58 fewer) |
| Direct jsPDF upgrade | Replaced 3.0.4 with 4.2.1, outside all 10 reported jsPDF advisory ranges |
| Transitive overrides and regenerated lockfile | cookie 0.7.2, undici 6.29.0; zero known vulnerabilities |

## Deno dependency management architecture

- `package.json` declares npm dependency ranges, development dependencies, scripts,
  and transitive `overrides`. Deno understands these declarations without a separate
  npm install step.
- `deno install` resolves the npm graph and installs the local dependencies used by
  Vite and SvelteKit. Imports such as `import { jsPDF } from 'jspdf'` resolve through
  these package declarations. Explicit `npm:` specifiers can also launch package
  tools, for example `deno run -A npm:eslint .`.
- `deno.lock` records exact resolutions, dependency edges, and integrity data.
  Commit it with `package.json`; version ranges alone do not describe the graph
  that was audited and tested.
- `deno task check` and `deno task build` run the corresponding `package.json`
  scripts. The lockfile covers development tooling as well as runtime packages.

## Direct and transitive remediation commands

```sh
# All known vulnerability findings; this is the release gate.
deno audit

# Triage moderate and higher findings (does not prove zero low findings).
deno audit --level moderate

# Optional additional advisory source; requires the external service.
deno audit --socket

# Review available dependency upgrades.
deno outdated

# Upgrade direct dependencies within compatible semver ranges.
deno update --compatible

# Identify which parents introduce vulnerable transitive packages.
deno why cookie
deno why undici
```

Major direct upgrades require an intentional `package.json` edit and API migration.
For this remediation, `jspdf` changed to `^4.2.1` and the exporter uses
`import { jsPDF } from 'jspdf'`. Its `doc: jsPDF` type annotations remain valid.
`import autoTable from 'jspdf-autotable'` remains unchanged.

The current transitive overrides are:

```json
"overrides": {
  "cookie": "^0.7.2",
  "undici": "^6.28.0"
}
```

These are compatible ranges within the selected minor/major, not exact pins.
`deno.lock` records the exact tested versions:

- `@sveltejs/kit@2.70.3 -> cookie@0.7.2`, replacing 0.6.0, which was affected by
  [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x).
- `ai@5.0.267 -> @ai-sdk/provider-utils@3.0.39 -> undici@6.29.0`, replacing 5.29.0.
  The gateway dependency also reaches the same provider-utils package. The audit
  reported 12 undici advisories, with fixes requiring up to 6.28.0.

Overrides cross the parents' declared ranges. Keep them only while needed; review
upstream constraints and runtime compatibility on each maintenance pass. If a
conflict arises, investigate a parent-scoped override or an upstream upgrade rather
than suppressing the audit finding.

## What worked

- The official compatible updater changed 25 direct dependencies. The subsequent
  audit reported 23 findings, matching a reduction of 58 from the reported baseline.
  Typecheck, ESLint, production build, and the smoke scenarios below passed after
  the targeted source corrections.
- jsPDF 4.2.1 removed all 10 jsPDF findings, including critical
  [local file inclusion](https://github.com/advisories/GHSA-f8cm-6447-x5h2) and
  [HTML injection](https://github.com/advisories/GHSA-wfv2-pwc8-crg5).
- `package.json` overrides resolved cookie and undici without waiting for upstream
  dependency-range changes. `deno why` confirmed both corrected chains after install.
- jsPDF 4.2.1 and jspdf-autotable 5.0.8 generated a PDF containing text and a table
  successfully. The smoke checked the PDF header, expected content, and EOF marker;
  the observed output was 3,681 bytes (not a stable size contract).

## Pitfalls

- Do not rely on `deno audit --fix` to perform major API migrations or rewrite
  restrictive direct dependency ranges. Use the explicit jsPDF range change and
  import migration above. The automated fix command was not used in this run.
- Editing `overrides` alone did not change the existing graph: `deno why` still
  showed cookie 0.6.0 and undici 5.29.0. Removing the stale lockfile and running
  `deno install` applied the overrides. Regeneration can change other transitive
  dependencies too, so review and verify the whole resulting graph.
- Use the named `{ jsPDF }` export for the 4.x constructor and class type rather
  than relying on default-import interoperability across runtimes.
- The API route imports `OPENROUTER_API_KEY` from `$env/static/private`. Supply it
  at build/typecheck time through the environment or `.env`. For offline verification,
  a gitignored `.env` containing `OPENROUTER_API_KEY=dummy-build-key` was used.
  Preserve any existing key; never commit credentials. A dummy key cannot generate
  real policies. Production must be built with its intended secret configuration.
- Updated ESLint/Svelte rules required removing unused `quintOut` imports from
  `PolicyPreview.svelte` and `+page.svelte`, and keying the examples loop with
  `{#each constraintExamples as example (example)}`.
- The successful production build still warned about a client chunk above 500 kB
  and adapter-auto not detecting a deployment platform. Choose a suitable adapter
  for deployment; local build success is not deployment verification.
- Deno reported ESLint 9.39.5 as unsupported and skipped the core-js install script.
  Neither prevented the recorded checks. Review supported tooling majors separately;
  do not approve dependency scripts merely to silence a warning.

## Quarterly and pre-release checklist

1. Start from a reviewable working tree. Record `deno --version`, `deno audit`, and
   `deno outdated`. Retain advisory IDs and dependency chains for any findings.
2. Run `deno update --compatible`, then audit again. Review changes to both the
   manifest and lockfile. Do not assume the previous remediation counts still apply.
3. Upgrade remaining vulnerable direct packages explicitly, reading release notes
   and migrating their consumers. For transitive findings, use `deno why <package>`;
   prefer an upstream fix, or document a tested override when necessary.
4. After changing overrides, regenerate the lockfile if the graph remains stale:

   ```sh
   # Intentional lockfile replacement; preserve unrelated work first.
   rm deno.lock
   deno install
   deno why cookie
   deno why undici
   deno audit
   ```

   Require `No known vulnerabilities found`. Do not use severity filters, ignored
   advisories, or ignored registry errors to claim a clean result.
5. Supply `OPENROUTER_API_KEY` without overwriting existing credentials, then run:

   ```sh
   deno task check
   deno run -A npm:eslint .
   deno task build
   ```

   The recorded run had zero typecheck errors/warnings and ESLint exit 0. The
   production SSR and client builds completed, including adapter-auto's `✔ done`.
   This ESLint command does not run the separate Prettier portion of `deno task lint`.
6. Exercise PDF generation with the installed graph:

   ```sh
   deno eval '
     import { jsPDF } from "jspdf";
     import autoTable from "jspdf-autotable";
     const doc = new jsPDF();
     doc.text("Smoke Test", 10, 10);
     autoTable(doc, { head: [["Col1"]], body: [["Val1"]] });
     const buf = doc.output("arraybuffer");
     const pdf = new TextDecoder().decode(buf);
     if (!pdf.startsWith("%PDF-") || !pdf.includes("Smoke Test") ||
         !pdf.includes("Val1") || !pdf.includes("%%EOF")) {
       throw new Error("Invalid PDF output");
     }
     console.log("Smoke test passed, bytes:", buf.byteLength);
   '
   ```

7. Launch `deno task preview`. Check the rendered form and select a constraint
   example; it must populate the textarea. The recorded browser smoke passed and
   reported no browser errors. A POST of `{}` to `/api/generate-policies` returned
   HTTP 400 with `Missing required fields`, exercising server module loading and
   validation. Live OpenRouter generation and the complete browser ZIP download
   were not exercised with the dummy key; verify them with authorized credentials
   before a production release.
8. Optionally run `deno audit --socket` for an additional source (not exercised in
   this remediation). Review whether upstream versions now allow removing each
   override, and repeat verification after removal.
9. Commit the manifest, regenerated lockfile, API/source migrations, and updated
   maintenance notes together. Keep `.env`, generated build output, and temporary
   smoke artifacts out of version control.
