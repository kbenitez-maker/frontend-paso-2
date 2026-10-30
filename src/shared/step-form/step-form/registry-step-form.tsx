'use client';

import type { ContractStep } from '@/contracts';
import type { Values } from '../block-values';
import type { StepFormProps } from './types';

import { useQuery } from '@tanstack/react-query';

import { isBlockOf } from '@/lib/constants/steps';
import { accountRequestQuery } from '@/server/api';
import { RequestScopeContext } from '@/shared/form/hooks';
import { useCurrentStep } from '@/shared/request/use-current-step';

import { useStepSections } from '../use-step-sections';
import { StepBlockForm } from './step-block-form';
import { useRequestCatalogs } from './use-request-catalogs';

/**
 * Loads the request, every section of the step and the request's people its
 * designations pick from, then renders the form of
 * the block named by `?block=`. Keyed by block, so each block starts from
 * what the server holds.
 */
const RegistryStepForm = <S extends ContractStep>({
  step,
  requestId,
  icons,
  blocks,
  context,
  rule,
}: Readonly<StepFormProps<S>>) => {
  const { block } = useCurrentStep();
  const { data: request } = useQuery(accountRequestQuery(requestId));
  const { bySection, isLoading } = useStepSections(step, requestId);
  const country = request?.profile?.country;
  const peopleRead = useRequestCatalogs(requestId, step);

  if (
    request === undefined ||
    country === undefined ||
    isLoading ||
    !peopleRead ||
    !isBlockOf(step, block)
  ) {
    return null;
  }

  return (
    <RequestScopeContext value={requestId}>
      <StepBlockForm
        key={block}
        step={step}
        requestId={requestId}
        bankId={request.bank_id}
        country={country}
        block={block}
        bySection={bySection}
        icons={icons}
        // eslint-disable-next-line security/detect-object-injection -- `block` is narrowed to a block of the step
        Card={blocks?.[block]}
        external={context}
        rule={
          rule === undefined ? undefined : (
            (values: Values) => rule(block, values)
          )
        }
      />
    </RequestScopeContext>
  );
};

export { RegistryStepForm };
