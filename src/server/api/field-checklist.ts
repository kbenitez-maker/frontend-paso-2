import type { StepSlug } from '@/lib/constants/steps';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

type FieldStatus = 'empty' | 'partial' | 'complete';

interface FieldChecklistBase {
  key: string;
  /** Label in the request's language. */
  label: string;
  /** Plain-language kind of answer, e.g. "Texto libre". */
  description: string;
  /** `STEPS` block the row belongs to. */
  block: string;
  status: FieldStatus;
  /** 0-100. */
  progress: number;
}

/** One field a step asks for in the request's country. */
interface FieldChecklistField extends FieldChecklistBase {
  kind: 'field';
}

/** A list filled item by item, shown as one row like in the progress count. */
interface FieldChecklistCollection extends FieldChecklistBase {
  kind: 'collection';
  /** Items saved so far. */
  items: number;
  /** Items the step asks for at least. */
  min_items: number;
}

type FieldChecklistItem = FieldChecklistField | FieldChecklistCollection;

/**
 * Visible fields and required collections of a step, in block and registry
 * order. Empty for the document steps (POC: they list no fields).
 */
interface FieldChecklist {
  step: StepSlug;
  fields: FieldChecklistItem[];
}

const fieldChecklistQuery = (requestId: string, step: StepSlug) =>
  queryAdapter.query<FieldChecklist>({
    queryKey: queryKeys.accountRequests.fieldChecklist(requestId, step),
    url: endpoints.accountRequests.fieldChecklist(requestId),
    options: { apiVersion: APIVersion.V1, params: { step } },
  });

export {
  fieldChecklistQuery,
  type FieldChecklist,
  type FieldChecklistItem,
  type FieldStatus,
};
