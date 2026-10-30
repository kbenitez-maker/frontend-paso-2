'use client';

import type { ContractStep } from '@/contracts';
import type { StepFormProps } from './types';

import { hasFields } from '@/contracts';
import { StepSection } from '@/shared/request/step-section';

import { RegistryStepForm } from './registry-step-form';

/**
 * Form of a registry-driven step (fields generated from its inventory
 * overlay). Until the overlay maps any field, the step keeps the placeholder
 * card of the current block.
 */
const StepForm = <S extends ContractStep>(props: Readonly<StepFormProps<S>>) =>
  hasFields(props.step) ? <RegistryStepForm {...props} /> : <StepSection />;

export { StepForm };
