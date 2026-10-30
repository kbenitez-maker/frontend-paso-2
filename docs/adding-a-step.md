# Adding a registry-driven step

A form step whose fields come from the inventory is an overlay plus a thin wrapper. The
generator and the step-agnostic form in `src/shared/step-form/` pick it up from the generated
contract.

A step registered with an empty overlay renders the placeholder card until its overlay maps a
field (`economic-activity`, `references-accounts` and `bancanet` are mapped already).

## Files a step owns

For a step `<slug>` (`economic-activity`, `references-accounts`, `bancanet`):

| File                                                                                                                   | What goes there                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `contracts/inventory/overlay/<slug>.ts`                                                                                | One entry per typed row of the step's tabs (see `contracts/inventory/README.md`)                      |
| `src/types/catalog-names/<slug>.ts`                                                                                    | Catalog names the overlay uses that `CATALOG_NAMES` does not list yet                                 |
| `i18n/{es,en}/<slug>.json`                                                                                             | Hand-written copy of custom block UI (namespace `EconomicActivity`, `ReferencesAccounts`, `Bancanet`) |
| `src/features/<slug>/**`                                                                                               | `<slug>-step.tsx` wrapper, custom block components, tests under `tests/`                              |
| Generated: `src/contracts/generated/<slug>.ts`, `test/fixtures/generated/<slug>.ts`, `i18n/{es,en}/<slug>-fields.json` | Written by `pnpm contracts:generate <slug>`; never edit by hand                                       |

Do not edit shared files: `contracts/inventory/{overlay/index,schema,resolve,emit,outputs}.ts`,
`src/contracts/**` (except your generated file, via the generator), `src/shared/**`,
`src/types/{domain,request}.ts`, `src/i18n/messages.ts`, `src/lib/constants/steps.ts`,
and the other steps' files. If one of them needs a change, report it instead.

## Overlay rules that bite

- Once the overlay has one entry, every typed row of its tabs must be mapped or ignored
  (`references-accounts` covers both "Referencias" and "Cuentas").
- Field labels come from the overlay (`label`, `label_es`, `label_en`); block titles already
  exist under `Steps.blocks`.
- `section` is kebab-case, unique across all steps and different from the step slug; `block`
  must be a block of the step in `STEPS`.
- Conditions may only reference fields of the same overlay. A collection item field may also
  reference sibling fields of the same item (`visible_when: { field: 'person_type_id', eq: 'legal' }`):
  the form and the required-field validation (`when_visible` applies per item) evaluate
  it per item. A child collection field may also reference the fields of its parent item. A
  section-level field cannot reference a collection field, and an item field cannot reference
  another collection (other than its parent).
- Labels repeated with the same `section_header` (duplicate sheet rows) take a `row` hint with
  the sheet row number; update it when the sheet shifts.
- A field must sit in the collection the sheet nests it in. When the POC groups it differently
  (e.g. transfers inside each account), set `regrouped: true` with a `note` saying why.
- A catalog must be in `CATALOG_NAMES` (your `catalog-names/<slug>.ts`) before the overlay uses
  it; `src/contracts/tests/contracts.test.ts` checks it.
- `type: 'phone'` stores `{ dial_code, number }` (Onyx phone field, default dial code from the
  request country); use it for every phone row the sheet types `Entero`.
- `multiline: true` (type `string` only) renders a full-width text area; the POC marks free-text
  answers (addresses, descriptions) this way. `max_length` alone no longer switches to a text area.
- Item counts of a collection go in the overlay's `collections` map:
  `collections: { references: { min_items: 2 } }`. `min_items` blocks completing the section (and
  "Continue") only while the collection is visible; `max_items` disables the add button. Without an
  entry a collection takes any number of items.
- A collection nested in the items of another one (sheet path `Cuentas > Agregar tarjeta adicional`)
  declares its parent in the same map: `collections: { additional_cards: { parent: 'accounts' } }`.
  One level only; the child fields keep `collection: 'additional_cards'` and must share the parent's
  section and block. The DTO nests the array (`AccountsItemDto.additional_cards`), the parent item
  modal lists the child items and edits each one in a panel over it, and child edits are kept only
  when the parent item is saved. The child's `min_items`/`max_items` apply per parent item. The
  sheet may nest deeper than the overlay (a missing `[Fin]`): the overlay decides, and only the
  top collection and the child's full sheet path must map to one key.
- `item_tab: '<key>'` on the fields of a top-level collection splits its item modal into tabs (as in the
  POC), shown when some field applies to the country and ordered as their labels in
  `Form.collections.<collection>.tabs.<key>` (then registry order). Own fields without an
  `item_tab` render above the tabs as a common header; each child collection of a tabbed one takes
  `collections: { <child>: { item_tab: '<key>' } }`. On save the modal opens the first tab with
  errors and marks every tab that has some (header errors show in place).
- `item_group: '<key>'` puts a field under a sub-group heading inside its tab, or inside a modal
  without tabs (the POC `bloque`); a child collection takes `collections.<child>.item_group`.
  Headings show once the visible fields span two groups, ungrouped fields first; labels live in
  `Form.collection.groups.<key>`. `item_title: true` marks the fields whose answers, joined, name
  the item in the list (else "<Noun> <n>").
- When the POC differs from the sheet, the POC wins and the entry's `note` says so: `countries` replaces
  the sheet's countries, `sort_row` (a sheet row, fractions allowed) moves the field, `full_width: true`
  takes the whole grid row (POC `ancho: 'completo'`) and `help: { es, en }` shows product help under the
  field (POC `ayuda`, never its design notes). In lists of people, `identity: true` marks the
  identification type and number and `person_field` names the shared datum (`first_name`) so duplicates
  are warned and known people prefilled.
- Once the step has fields, the rail hides the blocks with no applicable field for the
  country, so a block that only has custom UI still needs at least one registry field.

## The wrapper

```tsx
import { StepForm } from '@/shared/step-form/step-form';

import { AccountsTable } from './accounts-table';

const ReferencesAccountsStep = ({
  requestId,
}: Readonly<{ requestId: string }>) => (
  <StepForm
    step='references-accounts'
    requestId={requestId}
    blocks={{ accounts: AccountsTable }}
  />
);
```

- `icons`: optional `ReadonlyMap<fieldKey, ReactNode>` of leading icons for text inputs.
- `blocks`: optional custom component per block, typed `ComponentType<BlockCardProps>`
  (`@/shared/step-form/block-card`). It renders inside the block's `FormProvider` and receives
  the block's `items`, `fields`, `context`, `country`, `bankId`, `labelOf` and `icons`, so
  autosave, validation and the footer gate keep working. Reuse `BlockCard`, `FormField` and
  `CollectionField` (`@/shared/form/*`) for the parts that stay standard. Collections
  (`[Inicio]`/`[Fin]` rows) already render as a list with an add/edit modal without custom code, child
  collections included; the per-collection nouns live in `Form.collections` (`i18n/{es,en}/form.json`,
  one entry per collection key, children too) and the item limits and parents in the overlay's
  `collections`.

## Commands

```bash
pnpm contracts:generate <slug>   # regenerate only your overlay's files
pnpm contracts:check             # all overlays; fails on stale files or any overlay error
pnpm type-check
pnpm exec vitest run src/features/<slug> src/contracts
pnpm lint && pnpm knip && pnpm format:check && pnpm lint:spell
```

Always pass `<slug>` to `contracts:generate` while other steps are being worked on: a bare run
builds every overlay and writes nothing if any of them is invalid. Each overlay only writes its
own files, so filtered runs from different agents never collide. `contracts:check` reports
problems in other steps' overlays too; only yours are yours to fix.
