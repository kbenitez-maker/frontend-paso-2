import type { ContractStep } from '@/contracts';
import type { BlockOf } from '@/lib/constants/steps';
import type { ComponentType, ReactNode } from 'react';
import type { BlockCardProps } from '../block-card';
import type { BlockRule } from '../block-validation';
import type { Values } from '../block-values';

interface StepFormProps<S extends ContractStep> {
  step: S;
  requestId: string;
  /** Leading icons of text inputs by field key (email and url fields get theirs by type). */
  icons?: ReadonlyMap<string, ReactNode>;
  /**
   * Custom UI per block, in place of the default card. It renders inside the
   * block's form (use `useFormContext`), so autosave, validation and the
   * footer gate keep working; reuse `FormField` / `CollectionField` for fields.
   */
  blocks?: Partial<Record<BlockOf<S>, ComponentType<BlockCardProps>>>;
  /**
   * Values field conditions read that no section of the request holds (the
   * API derives them, e.g. the related-parties registration route).
   */
  context?: Values;
  /** Validation the registry cannot express, per block; a broken rule keeps the block from continuing. */
  rule?: (block: BlockOf<S>, values: Values) => ReturnType<BlockRule>;
}

export type { StepFormProps };
