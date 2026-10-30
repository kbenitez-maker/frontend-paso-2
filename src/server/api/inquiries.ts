import type { StepSlug } from '@/lib/constants/steps';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/** One question the applicant sent to the officer, or the officer's answer. */
interface Inquiry {
  inquiry_id: string;
  /** Form step the applicant was in; `null` outside the seven form steps. */
  step: StepSlug | null;
  text: string;
  author: 'applicant' | 'officer';
  created_at: string;
}

interface CreateInquiryBody {
  step: StepSlug | null;
  /** Not blank, at most `INQUIRY_MAX_LENGTH` characters. */
  text: string;
}

/** Every inquiry of the request, oldest first. */
const inquiriesQuery = (requestId: string) =>
  queryAdapter.query<Inquiry[]>({
    queryKey: queryKeys.accountRequests.inquiries(requestId),
    url: endpoints.accountRequests.inquiries(requestId),
    options: { apiVersion: APIVersion.V1 },
  });

/** Sends an inquiry; the server answers with the stored one (201). */
const createInquiryMutation = (requestId: string) =>
  queryAdapter.mutation<Inquiry, CreateInquiryBody>({
    url: endpoints.accountRequests.inquiries(requestId),
    method: 'post',
    options: { apiVersion: APIVersion.V1 },
  });

export {
  createInquiryMutation,
  inquiriesQuery,
  type CreateInquiryBody,
  type Inquiry,
};
