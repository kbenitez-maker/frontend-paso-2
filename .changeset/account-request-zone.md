---
'@lafise/lde-module-account-request': minor
---

#### Added

- **Account request zone**: New micro-frontend served under `/account-request` for the regional business account opening, built from the design POC: profiling and request creation (`/new`), in-request profile with legal entity reclassification, base documents, the seven form steps (company, economic activity, related parties, references and accounts, Bancanet, document checklist, signature), submission, NPS survey and the submitted screen.
- **Field contracts**: Generator that builds DTOs, the field registry, per-country Zod schemas, contract fixtures and field labels from the field inventory snapshot plus per-step overlays, guarded by `pnpm contracts:check`.
- **Registry-driven form**: Shared fields and collections (list and modal, nested collections, item tabs and groups, drafts, duplicate and known-person recognition), section autosave and cross-field, cross-item and trust rules.
- **Related parties**: Route A/B/C from the related-party matrix, stock-listing question, ownership tree with participation calculation, seal and beneficial owners, and trust rules.
- **Navigation**: Step rail with block progress, Back through visible blocks, `/{id}` resumes at the pending block, and the help popover with officer inquiries.
- **Company step from the opening API**: The company step builds its sections, fields, catalogs and visibility rules from the account-opening sections endpoint, saves each section's answer, and the rail and footer follow those sections.
- **New request**: `/new` verifies the company, quotes annual sales and creates the draft against the account-request API.

#### Changed

- **Tooling**: Spell-check dictionary updated so the pipeline lint passes; local agent tooling and the inventory XLSX are kept out of git.
