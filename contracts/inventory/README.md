# Contratos desde el inventario de campos

<!-- cspell:ignore desactualizados tipada tipados Economica precargada OSFL -->

Genera DTO, registro de campos, esquemas Zod y fixtures de contrato a partir del Google Sheet
"Inventario de campos | Onboarding regional". El Sheet es la fuente de verdad del negocio;
el repo versiona solo un snapshot JSON y las decisiones de traducción (overlay).

## Flujo

```text
Drive (XLSX) -> source/ -> snapshot.json -> overlay/<tab>.ts -> generate -> check
```

1. Descargar el XLSX manualmente desde Drive (Archivo > Descargar > .xlsx) y guardarlo como
   `contracts/inventory/source/inventario.xlsx`. El binario no se versiona (`.gitignore`).
2. `pnpm contracts:snapshot` lee el XLSX (excluye pestañas ocultas) y escribe `snapshot.json`:
   formato largo, ordenado y determinista, para que el diff del PR muestre cambios de negocio.
3. Revisar el diff de `snapshot.json`. Ajustar el overlay de las pestañas afectadas.
4. `pnpm contracts:generate` valida los overlays contra el snapshot y escribe:
   - `src/contracts/generated/<name>.ts` (DTO, registro `as const`, `schemaFor(country)`).
   - `test/fixtures/generated/<name>.ts` (muestras por país y sección para pruebas de contrato).
   - `i18n/{es,en}/<name>-fields.json` (etiquetas de los campos; `label` del overlay, o `label_es` / `label_en` si la redacción del Sheet hay que corregirla o traducirla; sin `label_en` el inglés repite el español y `contracts:generate` lo cuenta).
5. `pnpm contracts:check` regenera en memoria y falla si los archivos generados están
   desactualizados. Correrlo antes de abrir el PR.

Los archivos generados no se editan a mano.

## Reglas

- **Drive es solo lectura.** Nunca se modifica el Sheet desde el repo ni desde agentes. Los
  hallazgos se documentan como `note` en el overlay y se reportan a negocio.
- Las columnas de país se enlazan por nombre de encabezado (el orden cambia por pestaña).
  `BLRD` se mapea a `DO`, el código de país de `CountryCode`.
- El Sheet no tiene columna de obligatoriedad: por defecto `required: 'when_visible'`.
- Los catálogos usan `source: 'unknown'` salvo que el Sheet diga otra cosa. Los códigos de
  opciones usados en `visible_when` (por ejemplo `corporation`, `DO`) son provisionales hasta
  conocer los códigos reales de MDM.

## Agregar el overlay de un paso nuevo

Los overlays de `economic-activity`, `references-accounts` (pestañas "Referencias" y "Cuentas") y
`bancanet` ya están registrados vacíos; un overlay sin entradas es válido y genera archivos
vacíos. Con la primera entrada, todas las filas con tipo de sus pestañas deben quedar mapeadas.

1. Crear `overlay/<name>.ts` que exporte un `Overlay` (`tabs`, `name` = slug del paso, `entries`).
2. Una entrada por fila tipada del snapshot: `tab`, `label` idéntico al snapshot, `key` en
   snake_case, `section` (kebab-case, distinta del slug y de las secciones de otros pasos),
   `block` (un bloque del paso en `STEPS`), `type`, `required`, y opcionalmente `catalog`,
   `visible_when`, `validation`, `max_length`, `multiline`, `note`.
   - Etiqueta repetida en la pestaña: agregar `section_header` para desambiguar; si también se
     repite el encabezado (filas duplicadas), agregar `row` con el número de fila del Sheet
     (actualizarlo cuando el Sheet se desplace).
   - Campo en otra colección que la del Sheet (la POC lo agrupa distinto, p. ej. transferencias
     dentro de cada cuenta): `regrouped: true` con una `note` que explique por qué.
   - Una pregunta distinta por país con el mismo `key`: filas con países disjuntos y `variant`
     (ver `lawyer_name`).
   - Filas de colección (`[Inicio]`/`[Fin]`): `collection: '<key>'` en cada campo interno; las
     filas marcador no se mapean.
   - Fila que no genera campo: `{ tab, label, ignore: true, reason }`.
   - Teléfonos: `type: 'phone'` (valor `{ dial_code, number }`, selector de código de país del
     componente Onyx, por defecto el país de la solicitud).
   - Texto en párrafos (direcciones, descripciones): `multiline: true` (solo `type: 'string'`); se
     muestra como área de texto a todo el ancho.
   - Mínimos y máximos de una colección: `collections` en el overlay, p. ej.
     `collections: { superusers: { min_items: 1, max_items: 2 } }`. El generador los copia a cada
     campo del ítem; el mínimo solo se exige mientras la colección es visible.
   - Colección dentro de los ítems de otra (ruta del snapshot `Cuentas > Agregar tarjeta adicional`):
     `collections: { additional_cards: { parent: 'accounts' } }`. Un solo nivel; los campos hijos
     llevan `collection: 'additional_cards'`, comparten sección y bloque con el padre y el generador
     les copia `parent_collection`. El DTO anida el arreglo en el ítem del padre y `schemaFor`,
     la validación de obligatorios, `min_items`/`max_items` (por ítem padre) y el guardado
     lo recorren de forma recursiva. Si el Sheet anida de más (un `[Fin]` que falta), decide el
     overlay: solo se exige que la colección superior y la ruta completa del hijo correspondan a
     una sola clave.
   - Modal del ítem (como la POC): `item_tab: '<key>'` en un campo de colección superior lo pone
     en esa pestaña; los campos propios sin `item_tab` se muestran arriba de las pestañas
     (encabezado común), y cada colección hija de una colección con pestañas lleva
     `collections: { <hija>: { item_tab: '<key>' } }`. `item_group: '<key>'` agrupa los campos de
     una pestaña (o del modal sin pestañas) bajo un subtítulo (el `bloque` de la POC; la hija, con
     `collections.<hija>.item_group`); el subtítulo solo aparece cuando lo visible abarca dos grupos.
     `item_title: true` marca los campos cuyo valor nombra al ítem en la lista (p. ej. nombre y
     apellido). Textos: `Form.collections.<colección>.tabs.<key>` (su orden es el de las pestañas)
     y `Form.collection.groups.<key>`.
   - Catálogo dependiente: `catalog.parent` es la clave del campo padre, o un mapa por país cuando
     los niveles difieren (`{ CR: 'canton_id', SV: 'municipality_id', PA: 'province_id' }`).
     `catalog.hide_when_empty: true` oculta el campo, y deja de exigirlo, mientras el padre elegido
     no tenga filas (el sector de RD). Las opciones territoriales salen siempre del país del banco.
   - Reglas que leen el catálogo: `{ not_prohibited: true }` (país marcado `prohibited` en el
     catálogo: error en el campo). Fechas de nacimiento: `{ max_years_ago: 120 }`.
   - Reglas entre campos (error en el campo que la declara; `message_key` da el texto propio):
     `{ lte_field: 'total_assets', message_key }`, `{ sum_lte: { sum, limit, factor? }, message_key }`
     (la suma de `sum` por `factor` no supera la suma de `limit`; se evalúa con el ítem, la sección
     y las demás secciones, así que puede leer un campo de otro overlay) y
     `{ any_true: [...], message_key }` (respondida la lista, al menos una en Sí). En `collections`,
     `min_items_when_any: { item, min, message_key }` exige `min` ítems cuando alguno cumple `item`
     (firma conjunta). `any_true` y `min_items_when_any` son respuestas faltantes: sus códigos van en
     `isMissingCode` (`src/contracts/issue-code.ts`).
   - Si la POC difiere del Sheet, gana la POC y la `note` lo explica: `countries` reemplaza los países
     del Sheet, `sort_row` reubica el campo (fila del Sheet, admite fracciones), `full_width: true` lo
     pone a todo el ancho y `help: { es, en }` agrega la ayuda de producto bajo el campo. En listas de
     personas, `identity: true` marca tipo y número de identificación y `person_field` el dato común
     (`first_name`).
   - Campo que la POC pide y el Sheet no tiene (bloques de ruta de partes relacionadas): `poc_only: true`
     con `countries`, `sort_row` y `note`; la etiqueta no se busca en el snapshot.
   - Las condiciones pueden leer `registration_route` (`A`, `B`, `C`), que no es un campo: lo deriva la API de la
     matriz de relacionados.
3. Registrarlo en `overlay/index.ts` y en `src/contracts/steps.ts`.
4. `pnpm contracts:generate [<name>]` (con nombre, solo ese overlay). Si falta mapear una fila o
   una referencia no existe, la validación lo lista y no escribe nada.

Las condiciones en un campo de colección pueden referenciar campos de la sección y campos
hermanos del mismo ítem, y en una colección hija también los del ítem padre (se evalúan ítem por
ítem en el formulario y en la validación de obligatorios); un campo de sección no
puede referenciar un campo de colección. Las
visibilidades entre secciones se evalúan pasando `context` (valores de otras secciones) a
`schemaFor(country, context)`.

## Hallazgos del inventario (piloto "Datos de la Empresa")

Reportar a negocio:

- Condición invertida en CICAC: el motivo de no autorización se muestra si autoriza == Si.
- Fila de género tipada `Booleano`, con una frase pegada de la estructura accionaria.
- La pregunta RTBF aparece también en "Actividad Economica" (tipo `Catalogo`) y en
  "Confirmación de datos" (precargada, solo lectura).
- Condiciones que dependen de matrices que no están en el inventario (holding, exención de
  impuesto sobre la renta en PA; rol de accionista en CR).
- La condición de zona franca cita una pregunta con otro texto ("ubicada en una zona libre") y
  usa `=!` (¿typo?). Tampoco está claro qué hace la condición del nombre de zona.
- Países aplicables sin visibilidad (13 casos) y visibilidad para países no aplicables
  (6 casos, p. ej. SV en Corregimiento, HN en dirección de casa matriz).
- Campos NURAE (emisión y vencimiento) sin visibilidad.
- Preguntas casi duplicadas en RD ("registrada" vs "inscrita en República Dominicana").
- Teléfonos tipados `Entero` (se modelan como string) y un enlace tipado `Texto` (url).
- Catálogo "Municipio" filtra por Provincia (DO) o Departamento (NI, HN, SV); "Distrito" filtra
  por Provincia pero SV no tiene Provincia; la nota de países regionales dice "filtra por
  Distrito".
- Cantidades como "valorar 250 caracteres" viven en comentarios de celda (se modelan como
  `max_length: 250`, por confirmar). Los comentarios de celda no entran al snapshot.
- Nombres de opciones inconsistentes entre países ("Sociedad Anónima", "Sociedades anónimas",
  "OSFL nacionales" vs "Asociaciones sin fines de lucro").
- La nota de la fila `[Inicio]` de Residencia Fiscal (guardado automático del país de
  constitución como TIN) no se puede modelar en el overlay.
- Hallazgos de otras pestañas: "Cuentas" abre la colección "Autorizados" sin `[Fin]`;
  "Punto de Contacto" tiene un espacio en blanco como valor de aplicabilidad (fila 11, BLSV);
  "siempre visible" aparece con 6 grafías y "Siempre visible, pero no obligatorio" no es
  equivalente.
