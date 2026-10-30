import type {
  Overlay,
  OverlayEntry,
  OverlayField,
  OverlayIgnore,
} from '../schema';

const TAB = 'Bancanet';

type Field = Omit<OverlayField, 'tab'>;
type Entry = Field | Omit<OverlayIgnore, 'tab'>;

const SUPERUSER_QUESTION =
  '¿Desea asignar como superusuario de Bancanet a un representante legal o firmante previamente registrado?';

/** Sheet: the manual personal data shows when no registered signatory is picked. */
const MANUAL = { field: 'assign_registered_signatory', eq: false } as const;

/** Optional by nature (second names, second nationality), inside the manual branch. */
const OPTIONAL = {
  NI: false,
  PA: false,
  CR: false,
  HN: false,
  DO: false,
} as const;

/** POC bancanet.ts `SIN_NI_NI_SV`: residence, nationality and address are not asked in NI. */
const WITHOUT_NI = ['PA', 'CR', 'HN', 'DO'] as const;
const WITHOUT_NI_NOTE =
  'POC bancanet.ts hides this field in NI (SIN_NI_NI_SV); the sheet applies it to NI too. POC wins.';

const TRANSFER_ABROAD_TEXT =
  'Transferir - al exterior Permite realizar transferencias de fondos a bancos en otros países';

const superusers: Field[] = [
  {
    label: SUPERUSER_QUESTION,
    label_en:
      'Do you want to assign a previously registered legal representative or signatory as a Bancanet superuser?',
    key: 'assign_registered_signatory',
    section: 'superusers',
    block: 'superusers',
    type: 'boolean',
    required: 'when_visible',
    collection: 'superusers',
    note: 'Sheet: the same person cannot be added twice. POC limits the collection to 1-2 superusers; the sheet states no limits. POC asks this only when some legal representative or signatory is registered in related parties (cross-step, not modeled).',
  },
  {
    label: 'Nombre completo',
    label_en: 'Full name',
    key: 'registered_signatory_id',
    full_width: true,
    section: 'superusers',
    block: 'superusers',
    type: 'catalog',
    required: 'when_visible',
    collection: 'superusers',
    catalog: {
      name: 'related-persons',
      source: 'request',
      roles: ['legal-representative', 'signatory'],
      person_type: 'natural',
      unlisted_key: 'superuser_unlisted',
    },
    visible_when: { field: 'assign_registered_signatory', eq: true },
    note: 'POC bancanet.ts (representantesYFirmantesDe): the natural persons registered in related parties as legal representative or signatory, stored by identity; one that loses the person or both roles flags the superuser (POC avisoDeSuperusuarios). Choosing one maps the personal data below (not modeled).',
  },
  {
    label: 'Primer nombre',
    label_en: 'First name',
    key: 'first_name',
    section: 'superusers',
    block: 'superusers',
    type: 'string',
    required: 'when_visible',
    visible_when: MANUAL,
    collection: 'superusers',
  },
  {
    label: 'Segundo nombre',
    label_en: 'Middle name',
    key: 'second_name',
    section: 'superusers',
    block: 'superusers',
    type: 'string',
    required: OPTIONAL,
    visible_when: MANUAL,
    collection: 'superusers',
  },
  {
    label: 'Primer apellido',
    label_en: 'First surname',
    key: 'first_last_name',
    section: 'superusers',
    block: 'superusers',
    type: 'string',
    required: 'when_visible',
    visible_when: MANUAL,
    collection: 'superusers',
  },
  {
    label: 'Segundo apellido',
    label_en: 'Second surname',
    key: 'second_last_name',
    section: 'superusers',
    block: 'superusers',
    type: 'string',
    required: OPTIONAL,
    visible_when: MANUAL,
    collection: 'superusers',
  },
  {
    label: 'Tipo de identificación',
    label_en: 'Identification type',
    key: 'identification_type_id',
    section: 'superusers',
    block: 'superusers',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL,
    collection: 'superusers',
    catalog: { name: 'identification-types', source: 'unknown' },
  },
  {
    label: 'No. de identificación',
    label_en: 'Identification number',
    key: 'identification_number',
    section: 'superusers',
    block: 'superusers',
    type: 'string',
    required: 'when_visible',
    visible_when: MANUAL,
    collection: 'superusers',
  },
  {
    label: 'Correo electrónico',
    label_en: 'Email',
    key: 'email',
    section: 'superusers',
    block: 'superusers',
    type: 'email',
    required: 'when_visible',
    visible_when: MANUAL,
    collection: 'superusers',
    note: 'Sheet: must be a valid email address.',
  },
  {
    label: 'Número celular',
    label_en: 'Mobile number',
    key: 'mobile_phone',
    section: 'superusers',
    block: 'superusers',
    type: 'phone',
    required: 'when_visible',
    visible_when: MANUAL,
    collection: 'superusers',
    note: 'Sheet types it Entero; modeled as a phone (dial code + number) like the POC.',
  },
  {
    label: 'Segundo factor de autenticación',
    label_en: 'Second authentication factor',
    key: 'second_factor',
    section: 'superusers',
    block: 'superusers',
    type: 'boolean',
    required: 'when_visible',
    visible_when: MANUAL,
    countries: ['NI', 'CR', 'HN', 'DO'],
    collection: 'superusers',
    note: 'POC bancanet.ts: a yes/no question of the manual branch, hidden in PA. The sheet applies it to PA too, shows it always (CR, DO) or leaves visibility empty (NI, PA, HN) and says the BLPA/BLNI default is "SMS Token", which implies an option list; POC wins (boolean, no default).',
  },
  {
    label: 'País de nacimiento',
    label_en: 'Country of birth',
    key: 'birth_country_id',
    section: 'superusers',
    block: 'superusers',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL,
    countries: WITHOUT_NI,
    collection: 'superusers',
    catalog: { name: 'countries', source: 'unknown' },
    note: WITHOUT_NI_NOTE,
  },
  {
    label: 'País de residencia',
    label_en: 'Country of residence',
    key: 'residence_country_id',
    section: 'superusers',
    block: 'superusers',
    type: 'catalog',
    required: 'when_visible',
    visible_when: MANUAL,
    countries: WITHOUT_NI,
    collection: 'superusers',
    catalog: { name: 'countries', source: 'unknown' },
    note: WITHOUT_NI_NOTE,
  },
  {
    label: 'Indique si posee segunda nacionalidad',
    label_es: 'Indique si posee una segunda nacionalidad',
    label_en: 'Second nationality, if any',
    key: 'second_nationality_id',
    section: 'superusers',
    block: 'superusers',
    type: 'catalog',
    required: { PA: false, CR: false, HN: false, DO: false },
    collection: 'superusers',
    catalog: { name: 'countries', source: 'unknown' },
    visible_when: MANUAL,
    countries: WITHOUT_NI,
    note: `${WITHOUT_NI_NOTE} Optional by nature (not everyone has a second nationality; the POC leaves the option list undefined); nationalities are modeled with the countries catalog.`,
  },
  {
    label: 'Dirección detallada',
    label_en: 'Detailed address',
    key: 'address_detail',
    section: 'superusers',
    block: 'superusers',
    type: 'string',
    multiline: true,
    required: 'when_visible',
    visible_when: MANUAL,
    countries: WITHOUT_NI,
    collection: 'superusers',
    note: WITHOUT_NI_NOTE,
  },
  {
    label: 'Indique el tipo de aprobación transaccional',
    label_en: 'Select the transactional approval type',
    key: 'approval_type_id',
    section: 'approvals',
    block: 'approvals',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'bancanet-approval-types', source: 'unknown' },
    // POC resolverAnchos: its pair has a long label (> 44 chars), so both take the whole row.
    full_width: true,
    note: 'Option values are not in the inventory (the POC marks them as missing); provisional options. Full width as on the POC screen (its pair is full width).',
  },
  {
    label: 'Seleccione al superusuario que aprobará las transacciones',
    label_en: 'Select the superuser who will approve transactions',
    key: 'approver_superuser_id',
    section: 'approvals',
    block: 'approvals',
    type: 'catalog',
    required: 'when_visible',
    catalog: { name: 'bancanet-approvers', source: 'unknown' },
    full_width: true,
    note: 'Sheet and POC: lists the people registered above as superusers. The step UI builds the options from the saved superusers (features/bancanet/approvals-block/approver-field.tsx); the catalog name only types the field. Full width as on the POC screen (label longer than 44 characters, POC resolverAnchos).',
  },
];

const feature = (
  entry: Pick<Field, 'label' | 'key' | 'label_es' | 'label_en'> &
    Partial<Field>,
): Field => ({
  section: 'features',
  block: 'features',
  type: 'boolean',
  required: 'when_visible',
  ...entry,
});

const features: Entry[] = [
  feature({
    label:
      'Tranferir - Terceros LAFISE mismo país Permite transferir fondos a otras cuentas de terceros en BANCO LAFISE {BANK-ID}',
    label_es:
      'Transferir - Terceros LAFISE mismo país: permite transferir fondos a otras cuentas de terceros en Banco LAFISE.',
    label_en:
      'Transfer - LAFISE third parties, same country: lets you transfer funds to third-party accounts at Banco LAFISE.',
    key: 'transfer_third_party_same_country',
    note: 'Sheet label has a typo ("Tranferir") and a {BANK-ID} placeholder the UI cannot fill; the copy drops it. Marked Sí when mark_all_features is Sí.',
  }),
  feature({
    label:
      'Transferir - Terceros LAFISE regional Permite transferir fondos a otras cuentas de terceros en el resto de Bancos pertenecientes a Grupo Financiero LAFISE.',
    label_es:
      'Transferir - Terceros LAFISE regional: permite transferir fondos a otras cuentas de terceros en el resto de bancos del Grupo Financiero LAFISE.',
    label_en:
      'Transfer - LAFISE third parties, regional: lets you transfer funds to third-party accounts at the other banks of Grupo Financiero LAFISE.',
    key: 'transfer_third_party_regional',
    note: 'Row 45 repeats this feature for NI without the final period; ignored as a duplicate.',
  }),
  feature({
    label:
      'Transferir - al exterior Permite realizar transferencias de fondos a bancos en otros países.',
    label_es:
      'Transferir - al exterior: permite realizar transferencias de fondos a bancos en otros países.',
    label_en:
      'Transfer - abroad: lets you transfer funds to banks in other countries.',
    key: 'transfer_abroad',
    note: 'Rows 40 and 41 repeat this feature for NI without the final period; ignored as duplicates.',
  }),
  feature({
    label:
      'Administrar - Permisos Permite al Superusuario otorgar permisos a los usuarios previamente designados por él, para consultar, preparar y aprobar transacciones monetarias o no monetarias.',
    label_es:
      'Administrar - Permisos: permite al superusuario otorgar permisos a los usuarios previamente designados por él, para consultar, preparar y aprobar transacciones monetarias o no monetarias.',
    label_en:
      'Manage - Permissions: lets the superuser grant the users they designated permission to view, prepare and approve monetary or non-monetary transactions.',
    key: 'manage_permissions',
  }),
  feature({
    label:
      'Administrar - Límites diarios de transacció Permite al Superusuario establecer límites máximos en las transacciones de los usuarios previamente designados por él.',
    label_es:
      'Administrar - Límites diarios de transacción: permite al superusuario establecer límites máximos en las transacciones de los usuarios previamente designados por él.',
    label_en:
      'Manage - Daily transaction limits: lets the superuser set maximum transaction limits for the users they designated.',
    key: 'manage_daily_limits',
    note: 'Sheet label is cut off ("transacció"); the copy completes it.',
  }),
  feature({
    label:
      'Administrar - Auditorías Permite al Superusuario verificar los permisos y transferencias que han realizado los usuarios previamente designados por él.',
    label_es:
      'Administrar - Auditorías: permite al superusuario verificar los permisos y transferencias que han realizado los usuarios previamente designados por él.',
    label_en:
      'Manage - Audits: lets the superuser review the permissions and transfers made by the users they designated.',
    key: 'manage_audits',
  }),
  feature({
    label:
      'Administrar - Suscripciones para LAFISERVICIOS Permite modificar y eliminar los servicios a pagar que previamente fueron registrados por el Cliente.',
    label_es:
      'Administrar - Suscripciones para LAFISERVICIOS: permite modificar y eliminar los servicios a pagar que el cliente registró previamente.',
    label_en:
      'Manage - LAFISERVICIOS subscriptions: lets you edit and remove the services to pay that the client registered earlier.',
    key: 'manage_lafiservicios_subscriptions',
  }),
  feature({
    label:
      'Gestionar - Cambio de PIN tarjeta de débito Permite generar un nuevo PIN para la Tarjeta de Débito.',
    label_es:
      'Gestionar - Cambio de PIN de tarjeta de débito: permite generar un nuevo PIN para la tarjeta de débito.',
    label_en:
      'Manage - Debit card PIN change: lets you generate a new PIN for the debit card.',
    key: 'manage_debit_card_pin_change',
  }),
  feature({
    row: 32,
    label:
      'Configuración - Mi configuración personal Permite seleccionar las vías por las cuales desea recibir las notificaciones de las transacciones realizadas.',
    label_es:
      'Configuración - Mi configuración personal: permite seleccionar las vías por las cuales desea recibir las notificaciones de las transacciones realizadas.',
    label_en:
      'Settings - My personal settings: lets you choose how you want to be notified about the transactions made.',
    key: 'personal_settings',
    variant: 'ni',
    note: 'Row 46 is the same question for CR, with identical text; both rows share the key through country variants.',
  }),
  feature({
    row: 46,
    label:
      'Configuración - Mi configuración personal Permite seleccionar las vías por las cuales desea recibir las notificaciones de las transacciones realizadas.',
    label_es:
      'Configuración - Mi configuración personal: permite seleccionar las vías por las cuales desea recibir las notificaciones de las transacciones realizadas.',
    label_en:
      'Settings - My personal settings: lets you choose how you want to be notified about the transactions made.',
    key: 'personal_settings',
    variant: 'cr',
  }),
  feature({
    label:
      'Pagar - LAFISERVICIOS Permite realizar pagos a terceros, sean estos entidades públicas o privadas, prestadoras de servicios que hayan contratado con Banco LAFISE esta opción de pago',
    label_es:
      'Pagar - LAFISERVICIOS: permite realizar pagos a terceros, sean entidades públicas o privadas, prestadoras de servicios que hayan contratado con Banco LAFISE esta opción de pago.',
    label_en:
      'Pay - LAFISERVICIOS: lets you pay third parties, public or private service providers that contracted this payment option with Banco LAFISE.',
    key: 'pay_lafiservicios',
  }),
  feature({
    label:
      'Pagar - Tarjeta de crédito a terceros Permite pagar Tarjeta de Crédito de terceros en Banco LAFISE',
    label_es:
      'Pagar - Tarjeta de crédito a terceros: permite pagar la tarjeta de crédito de terceros en Banco LAFISE.',
    label_en:
      'Pay - Third-party credit card: lets you pay third-party credit cards at Banco LAFISE.',
    key: 'pay_third_party_credit_card',
  }),
  feature({
    label:
      'Tarjetas de Crédito - Pago de Tarjeta Propia Permite realizar el pago al saldo de la Tarjeta de Crédito propia en Banco LAFISE.',
    label_es:
      'Tarjetas de crédito - Pago de tarjeta propia: permite pagar el saldo de la tarjeta de crédito propia en Banco LAFISE.',
    label_en:
      'Credit cards - Own card payment: lets you pay the balance of your own credit card at Banco LAFISE.',
    key: 'pay_own_credit_card',
  }),
  feature({
    label:
      'Pagar - Préstamos a terceros Permite pagar préstamo de terceros en Banco LAFISE',
    label_es:
      'Pagar - Préstamos a terceros: permite pagar préstamos de terceros en Banco LAFISE.',
    label_en:
      'Pay - Third-party loans: lets you pay third-party loans at Banco LAFISE.',
    key: 'pay_third_party_loans',
  }),
  feature({
    label:
      'Pagar - Proveedores Permite realizar pagos a proveedores a beneficiarios en Banco LAFISE {BANK-ID} o vía ACH a Bancos locales',
    label_es:
      'Pagar - Proveedores: permite realizar pagos a proveedores, con beneficiarios en Banco LAFISE o vía ACH a bancos locales.',
    label_en:
      'Pay - Suppliers: lets you pay suppliers with beneficiaries at Banco LAFISE or via ACH to local banks.',
    key: 'pay_suppliers',
    note: 'Sheet has a {BANK-ID} placeholder the UI cannot fill; the copy drops it.',
  }),
  feature({
    label:
      'Pagar - Nómina Permite realizar pagos nómina a uno o varios beneficiarios en Banco LAFISE {BANK-ID} o vía ACH a Bancos locales.',
    label_es:
      'Pagar - Nómina: permite realizar pagos de nómina a uno o varios beneficiarios en Banco LAFISE o vía ACH a bancos locales.',
    label_en:
      'Pay - Payroll: lets you pay payroll to one or more beneficiaries at Banco LAFISE or via ACH to local banks.',
    key: 'pay_payroll',
    note: 'Sheet has a {BANK-ID} placeholder the UI cannot fill; the copy drops it.',
  }),
  feature({
    label:
      'Transferir - otros Bancos vía ECCAPPS Permite enviar fondos a otros bancos en Centroamérica y el Caribe',
    label_es:
      'Transferir - Otros bancos vía ECCAPPS: permite enviar fondos a otros bancos en Centroamérica y el Caribe.',
    label_en:
      'Transfer - Other banks via ECCAPPS: lets you send funds to other banks in Central America and the Caribbean.',
    key: 'transfer_other_banks_eccapps',
  }),
  {
    row: 40,
    label: TRANSFER_ABROAD_TEXT,
    ignore: true,
    reason:
      'Duplicate of "Transferir - al exterior" (row 26, same text with a final period); NI would show the same question three times.',
  },
  {
    row: 41,
    label: TRANSFER_ABROAD_TEXT,
    ignore: true,
    reason:
      'Exact duplicate of row 40 and a near-duplicate of row 26 "Transferir - al exterior".',
  },
  feature({
    label:
      'Transferir - Envío Veloz Permite realizar transferencias de dinero a otras personas en {BANK-ID} por medio de un código de retiro, que le permitirá al receptor retirar el dinero en canales alternos de Banco LAFISE.',
    label_es:
      'Transferir - Envío Veloz: permite transferir dinero a otras personas por medio de un código de retiro, que le permitirá al receptor retirar el dinero en canales alternos de Banco LAFISE.',
    label_en:
      'Transfer - Quick Send: lets you send money to other people with a withdrawal code that the receiver can use to withdraw the money at alternative Banco LAFISE channels.',
    key: 'transfer_quick_send',
    note: 'Sheet has a {BANK-ID} placeholder the UI cannot fill; the copy drops it.',
  }),
  feature({
    label:
      'Transferir - a Banco Local Permite enviar fondos a otros Bancos en el País por vía ACH o vía TEF',
    label_es:
      'Transferir - A banco local: permite enviar fondos a otros bancos del país por vía ACH o TEF.',
    label_en:
      'Transfer - To a local bank: lets you send funds to other banks in the country via ACH or TEF.',
    key: 'transfer_local_bank',
  }),
  feature({
    label:
      'Transferir - Recarga tarjeta prepago de terceros Permite recargar Tarjeta Prepago de terceros en Banco LAFISE',
    label_es:
      'Transferir - Recarga de tarjeta prepago de terceros: permite recargar tarjetas prepago de terceros en Banco LAFISE.',
    label_en:
      'Transfer - Third-party prepaid card top-up: lets you top up third-party prepaid cards at Banco LAFISE.',
    key: 'transfer_prepaid_card_top_up',
  }),
  {
    label:
      'Transferir - Terceros LAFISE regional Permite transferir fondos a otras cuentas de terceros en el resto de Bancos pertenecientes a Grupo Financiero LAFISE',
    ignore: true,
    reason:
      'Duplicate of "Transferir - Terceros LAFISE regional" (row 25, same text with a final period).',
  },
];

/** Defined after the features it checks. */
const markAllFeatures: Entry = feature({
  label: '¿Desea marcar todas las funcionalidades en SI?',
  label_es: '¿Desea marcar todas las funcionalidades en Sí?',
  label_en: 'Do you want to enable all features?',
  key: 'mark_all_features',
  help: {
    es: 'Al responder que sí, se marcan en Sí todas las funcionalidades vigentes para el país.',
    en: 'Answering yes turns on every feature available in the country.',
  },
  countries: ['NI', 'CR'],
  validation: [
    {
      any_true: [
        ...new Set(
          features.flatMap((entry) => ('ignore' in entry ? [] : [entry.key])),
        ),
      ],
      message_key: 'no_feature_enabled',
    },
  ],
  note: 'POC bancanet.ts offers the shortcut in NI and CR; the sheet applies it to NI only. POC wins. Answering Sí turns on the features listed for the country (handled by the step UI). POC bancanet.ts (funcionalidadesBancanet, ITDFCJ-29): at least one feature must be Sí. The POC shows it under its feature checklist; here the features are separate yes/no fields, so once all are answered No it shows on this question, which heads them.',
});

const entries: OverlayEntry[] = [
  ...superusers,
  markAllFeatures,
  ...features,
].map((entry): OverlayEntry => ({ tab: TAB, ...entry }));

const bancanetOverlay: Overlay = {
  tabs: [TAB],
  name: 'bancanet',
  entries,
  // POC: bancanet.ts (superusuarios, minimo 1 and maximo 2, ITDFCJ-28 CA-03).
  collections: { superusers: { min_items: 1, max_items: 2 } },
};

export { bancanetOverlay };
