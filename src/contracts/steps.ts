import type { StepSlug } from '@/lib/constants/steps';
import type { CountryCode } from '@/types/domain';
import type { BlockFieldCount, FieldDefinition } from './types';

import { STEPS } from '@/lib/constants/steps';

import { bancanetContract } from './generated/bancanet';
import { companyContract } from './generated/company';
import { economicActivityContract } from './generated/economic-activity';
import { referencesAccountsContract } from './generated/references-accounts';
import { relatedPartiesContract } from './generated/related-parties';

/** Steps whose fields come from an inventory overlay (one generated file each). */
const STEP_CONTRACTS = {
  company: companyContract,
  'economic-activity': economicActivityContract,
  'related-parties': relatedPartiesContract,
  'references-accounts': referencesAccountsContract,
  bancanet: bancanetContract,
} as const;

type ContractStep = keyof typeof STEP_CONTRACTS;

/** Every API section of every registry-driven step. */
type SectionKey = (typeof STEP_CONTRACTS)[ContractStep]['sectionKeys'][number];

/** Generated contract of one step, widened so step-agnostic code can walk it. */
interface StepContract {
  sectionKeys: readonly SectionKey[];
  fields: Readonly<Partial<Record<SectionKey, readonly FieldDefinition[]>>>;
  blocksByCountry: Readonly<Record<CountryCode, readonly BlockFieldCount[]>>;
}

/** A registry field with the API section its value is saved into. */
interface SectionField {
  section: SectionKey;
  field: FieldDefinition;
}

const isContractStep = (slug: StepSlug): slug is ContractStep =>
  Object.hasOwn(STEP_CONTRACTS, slug);

const contractOf = (step: ContractStep): StepContract => STEP_CONTRACTS[step];

/** Registry-driven steps in rail order. */
const CONTRACT_STEPS = STEPS.map((step) => step.slug).filter(isContractStep);

/** Every section key; a section belongs to exactly one step (the generator enforces it). */
const SECTION_KEYS: readonly SectionKey[] = CONTRACT_STEPS.flatMap(
  (step) => contractOf(step).sectionKeys,
);

/** Whether the step's overlay maps any field yet; steps without fields keep the placeholder UI. */
const hasFields = (step: StepSlug): boolean =>
  isContractStep(step) && contractOf(step).sectionKeys.length > 0;

/** Fields of a section in registry order. */
const sectionFields = (section: SectionKey): readonly FieldDefinition[] =>
  CONTRACT_STEPS.map((step) => contractOf(step).fields[section]).find(
    (fields) => fields !== undefined,
  ) ?? [];

/** Every field of a step with its section, in section then registry order. */
const stepFields = (step: ContractStep): SectionField[] =>
  contractOf(step).sectionKeys.flatMap((section) =>
    sectionFields(section).map((field) => ({ section, field })),
  );

export {
  CONTRACT_STEPS,
  contractOf,
  hasFields,
  isContractStep,
  SECTION_KEYS,
  sectionFields,
  stepFields,
  type ContractStep,
  type SectionField,
  type SectionKey,
  type StepContract,
};
