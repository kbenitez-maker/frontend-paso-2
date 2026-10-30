'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import type { Values } from '@/shared/step-form/block-values';
import type { CountryCode } from '@/types/domain';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Text } from '@lafise/onyx-ui/typography/text';

import { itemsWithIssues, sectionFields } from '@/contracts';
import {
  confirmationIn,
  gateIssue,
  OWNERSHIP_CONFIRMATION,
  OWNERSHIP_THRESHOLD,
  SHAREHOLDERS,
  shareholdersIn,
} from '@/lib/ownership';
import {
  routeBlockTitle,
  routeContext,
  routeIssues,
  waitingCopyOf,
} from '@/lib/related-parties';
import { routes } from '@/lib/routes';
import { accountRequestQuery, ownershipStructureQuery } from '@/server/api';
import { SectionCard } from '@/shared/request/section-card';
import { useCurrentStep } from '@/shared/request/use-current-step';
import { useRelatedPartiesRoute } from '@/shared/request/use-related-parties-route';
import { StepForm } from '@/shared/step-form/step-form';

import { OwnershipContext, RouteContext } from '../lib/route-context';
import { ListingBlock } from '../listing-block';
import { PeopleBlock } from '../people-block';
import { ReclassificationNotice } from '../reclassification-notice';
import { ShareholdersBlock } from '../shareholders-block';
import { relatedPartiesStepTheme } from './themes';

const { waiting } = relatedPartiesStepTheme();

const BLOCKS = {
  'holder-listing': ListingBlock,
  administrators: PeopleBlock,
  'trust-administrators': PeopleBlock,
  'trust-parties': PeopleBlock,
  shareholders: ShareholdersBlock,
} as const;

/** The closing gate of the shareholders block as a rule error of the collection. */
const ownershipIssues = (
  block: string,
  values: Values,
  context: Values,
  country: CountryCode | undefined,
) => {
  if (block !== 'shareholders' || country === undefined) return [];
  const scope = { ...context, ...values };
  const issue = gateIssue(
    shareholdersIn(values),
    confirmationIn(context),
    itemsWithIssues(
      sectionFields('shareholders'),
      SHAREHOLDERS,
      values,
      country,
      scope,
    ),
  );
  return issue === undefined ? [] : [{ path: SHAREHOLDERS, code: issue.code }];
};

interface RelatedPartiesStepProps {
  requestId: string;
}

/**
 * Step 3, "Related parties": the registry-driven form of the blocks the
 * company's route has (POC socios-relacionados.ts). Route A asks the listing
 * question, administrators and (unless listed) shareholders; route B its
 * governing body; route C (trusts) administration, parties and closing. A
 * block that waits for an earlier one says what it waits for.
 */
const RelatedPartiesStep = ({
  requestId,
}: Readonly<RelatedPartiesStepProps>) => {
  const t = useTranslations('Steps');
  const router = useRouter();
  const { block } = useCurrentStep();
  const { matrix, blocks } = useRelatedPartiesRoute(requestId);
  const current = blocks?.find((entry) => entry.key === block);
  const first = blocks?.[0]?.key;
  const { data: request } = useQuery(accountRequestQuery(requestId));
  const country = request?.profile?.country;
  const { data: ownership } = useQuery({
    ...ownershipStructureQuery(requestId),
    enabled: matrix?.route === 'A',
  });
  const confirmation = ownership?.confirmation ?? undefined;
  // Conditions read the route and, once the structure is confirmed, the seal (complementary data).
  const context = useMemo(
    (): Values => ({
      ...routeContext(matrix),
      ...(confirmation === undefined ?
        {}
      : { [OWNERSHIP_CONFIRMATION]: confirmation }),
    }),
    [matrix, confirmation],
  );
  const ownershipContext = useMemo(
    () => ({
      requestId,
      threshold: ownership?.threshold ?? OWNERSHIP_THRESHOLD,
    }),
    [requestId, ownership?.threshold],
  );

  // A block the route does not have (e.g. the registry's first) opens the route's first one.
  useEffect(() => {
    if (blocks !== undefined && current === undefined && first !== undefined) {
      router.replace(
        routes.step(requestId, 'related-parties', { block: first }),
      );
    }
  }, [blocks, current, first, requestId, router]);

  if (matrix === undefined || current === undefined) return null;

  // POC CA 14 of ITDFCJ-45: the step says what the last reclassification took.
  const notice =
    request?.reclassification ?
      <ReclassificationNotice
        requestId={requestId}
        bankId={request.bank_id}
        trace={request.reclassification}
        block={current.key}
      />
    : null;

  if (current.waiting) {
    return (
      <>
        {notice}
        <SectionCard
          title={t(`blocks.${routeBlockTitle(current.key, matrix)}`)}
        >
          <Text size='sm' className={waiting()}>
            {t(`rail.waiting.${waitingCopyOf(current.key)}`)}
          </Text>
        </SectionCard>
      </>
    );
  }

  return (
    <RouteContext value={matrix}>
      {notice}
      <OwnershipContext value={ownershipContext}>
        <StepForm
          step='related-parties'
          requestId={requestId}
          blocks={BLOCKS}
          context={context}
          rule={(key, values) => [
            ...routeIssues(matrix, key, values),
            // POC accionistas.ts `validar`: the shareholders close squared, calculated and complete.
            ...ownershipIssues(key, values, context, country),
          ]}
        />
      </OwnershipContext>
    </RouteContext>
  );
};

export { RelatedPartiesStep, type RelatedPartiesStepProps };
