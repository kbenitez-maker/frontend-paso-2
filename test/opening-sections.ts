import type {
  AccountOpeningSections,
  AccountOpeningStepAnswer,
  OpeningCurrentSection,
  OpeningSectionSummary,
  UpsertAccountOpeningStepAnswerBody,
} from '@/server/api';
import type { Mock } from 'vitest';

import { vi } from 'vitest';

/** Section with no fields, served when a test asks for one it did not set. */
const EMPTY_SECTION: OpeningCurrentSection = {
  step_code: 'company',
  section_code: 'identification',
  display_name: 'Información requerida de la empresa',
  display_order: 1,
  fields: [],
  values: {},
};

/** What the mocked opening-request API serves. */
interface OpeningApiState {
  /** Company sections of the step overview; none means the overview lists no step. */
  sections: OpeningSectionSummary[];
  /** `current_section` per `section_code` query; the first one answers the overview. */
  details: OpeningCurrentSection[];
  /** Saved step answer payload. */
  payload: Record<string, unknown>;
  /** Rejects the sections queries with it when set. */
  sectionsError: Error | undefined;
  /** Step answer `GET`; by default it serves `payload`. */
  answer: Mock<(stepCode: string) => Promise<unknown>>;
  /** Keeps the sections queries pending. */
  sectionsPending: boolean;
  put: Mock<
    (
      body: UpsertAccountOpeningStepAnswerBody,
    ) => Promise<AccountOpeningStepAnswer>
  >;
  /** Last step-answer query the form asked for. */
  lastAnswerQuery: { step: string; bank: string | undefined } | undefined;
}

/** Tests mutate it and call `resetOpeningApi` in `beforeEach`. */
const openingApi: OpeningApiState = {
  sections: [],
  details: [],
  payload: {},
  sectionsError: undefined,
  answer: vi.fn(),
  sectionsPending: false,
  put: vi.fn(),
  lastAnswerQuery: undefined,
};

const answerOf = (
  stepCode: string,
  body: UpsertAccountOpeningStepAnswerBody,
): AccountOpeningStepAnswer => ({
  step_slug: stepCode,
  form_step_id: 1,
  form_version_id: 1,
  ...body,
});

const resetOpeningApi = (): void => {
  openingApi.sections = [];
  openingApi.details = [];
  openingApi.payload = {};
  openingApi.sectionsError = undefined;
  openingApi.answer.mockReset();
  openingApi.answer.mockImplementation((stepCode) =>
    Promise.resolve(
      answerOf(stepCode, { payload: openingApi.payload, completed_at: null }),
    ),
  );
  openingApi.sectionsPending = false;
  openingApi.lastAnswerQuery = undefined;
  openingApi.put.mockReset();
  openingApi.put.mockImplementation((body) =>
    Promise.resolve(answerOf('company', body)),
  );
};

/** Overview entry of a section, in its own display order. */
const summaryOf = ({
  section_code,
  display_name,
  display_order,
}: OpeningCurrentSection): OpeningSectionSummary => ({
  code: section_code,
  display_name,
  display_order,
});

const sectionsResponse = (
  stepCode: string,
  sectionCode: string | undefined,
): AccountOpeningSections => {
  const current =
    openingApi.details.find(
      (section) => section.section_code === sectionCode,
    ) ??
    openingApi.details[0] ??
    EMPTY_SECTION;
  return {
    form_version_id: 1,
    current_step_code: stepCode,
    current_section_code: current.section_code,
    steps:
      openingApi.sections.length === 0 ?
        []
      : [
          {
            code: stepCode,
            display_name: stepCode,
            display_order: 1,
            sections: openingApi.sections,
          },
        ],
    current_section: current,
  };
};

const sectionsResult = (stepCode: string, sectionCode: string | undefined) => {
  if (openingApi.sectionsPending) {
    return new Promise<AccountOpeningSections>(() => undefined);
  }
  if (openingApi.sectionsError !== undefined) {
    return Promise.reject(openingApi.sectionsError);
  }
  return Promise.resolve(sectionsResponse(stepCode, sectionCode));
};

/** `@/server/api` opening-request queries backed by `openingApi`. */
const openingQueries = () => ({
  accountOpeningSectionsQuery: (
    id: string,
    step: string,
    section?: string,
  ) => ({
    queryKey: ['opening-sections', id, step, section ?? 'overview'],
    queryFn: () => sectionsResult(step, section),
  }),
  accountOpeningStepAnswerQuery: (id: string, step: string, bank?: string) => {
    openingApi.lastAnswerQuery = { step, bank };
    return {
      queryKey: ['opening-answer', id, step, ...(bank ? [bank] : [])],
      queryFn: () => openingApi.answer(step),
    };
  },
  upsertAccountOpeningStepAnswerMutation: () => ({
    mutationFn: openingApi.put,
  }),
});

export { openingApi, openingQueries, resetOpeningApi, summaryOf };
