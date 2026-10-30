import type { NpsCategory } from '@/lib/constants/nps';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/**
 * Either a score (integer 1–10) with an optional comment, or `skipped: true`
 * alone when the applicant chose "Skip" (CA-4).
 */
type CreateNpsResponseBody =
  { score: number; comment?: string } | { skipped: true };

/** One recorded answer; `score`, `comment` and `category` are `null` when skipped. */
interface NpsResponse {
  response_id: string;
  score: number | null;
  comment: string | null;
  category: NpsCategory | null;
  skipped: boolean;
  created_at: string;
}

/** Records the survey answer (201); 409 before submission or once answered. */
const createNpsResponseMutation = (requestId: string) =>
  queryAdapter.mutation<NpsResponse, CreateNpsResponseBody>({
    url: endpoints.accountRequests.npsResponses(requestId),
    method: 'post',
    options: { apiVersion: APIVersion.V1 },
  });

export {
  createNpsResponseMutation,
  type CreateNpsResponseBody,
  type NpsResponse,
};
