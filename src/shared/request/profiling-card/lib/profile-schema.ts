import type { CreateAccountRequestBody } from '@/server/api';
import type { Moment } from '../context';

import { z } from 'zod';

/** Messages are the shared validation codes; the form turns them into copy. */
const REQUIRED = { error: 'required' } as const;

const identificationSchema = z.object({
  identification_type_id: z.string(REQUIRED).min(1, REQUIRED),
  identification_number: z.string(REQUIRED).trim().min(1, REQUIRED),
});

const profileSchema = identificationSchema.extend({
  legal_name: z.string(REQUIRED).trim().min(1, REQUIRED),
  legal_entity_type_id: z.string(REQUIRED).min(1, REQUIRED),
  annual_sales_usd: z.number(REQUIRED).positive({ error: 'min' }),
  branch_id: z.string(REQUIRED).min(1, REQUIRED),
});

/** What the form holds; the keys are the API's, so server field errors land on the right control. */
type ProfileValues = z.infer<typeof profileSchema>;

type IdentificationValues = z.infer<typeof identificationSchema>;

/** The fields each moment asks for. */
const schemaOf = (moment: Moment) =>
  moment === 'identify' ? identificationSchema : profileSchema;

/** The request body when every field is valid; `undefined` otherwise. */
const bodyOf = (values: unknown): CreateAccountRequestBody | undefined => {
  const parsed = profileSchema.safeParse(values);
  return parsed.success ? parsed.data : undefined;
};

/** The lookup body when the identification is valid; `undefined` otherwise. */
const identificationOf = (
  values: unknown,
): IdentificationValues | undefined => {
  const parsed = identificationSchema.safeParse(values);
  return parsed.success ? parsed.data : undefined;
};

export {
  bodyOf,
  identificationOf,
  profileSchema,
  schemaOf,
  type IdentificationValues,
  type ProfileValues,
};
