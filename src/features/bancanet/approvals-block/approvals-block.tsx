'use client';

import type { BlockCardProps } from '@/shared/step-form/block-card';

import { isRequired } from '@/contracts';
import { FormField } from '@/shared/form/form-field';
import { SectionCard } from '@/shared/request/section-card';

import { ApproverField } from './approver-field';

const APPROVER_KEY = 'approver_superuser_id';

/** Approvals card: the approval type as registered, the approver from the saved superusers. */
const ApprovalsBlockRoot = ({
  title,
  items,
  country,
  bankId,
  labelOf,
  context,
  icons,
}: Readonly<BlockCardProps>) => {
  const fields = items.flatMap((item) =>
    item.kind === 'field' ? [item.field] : [],
  );

  return (
    <SectionCard
      title={title}
      required={fields.some((field) => isRequired(field.required, country))}
    >
      {fields.map((field) =>
        field.key === APPROVER_KEY ?
          <ApproverField
            key={field.key}
            field={field}
            country={country}
            bankId={bankId}
            labelOf={labelOf}
            context={context}
          />
        : <FormField
            key={field.key}
            field={field}
            name={field.key}
            country={country}
            bankId={bankId}
            labelOf={labelOf}
            icon={icons?.get(field.key)}
          />,
      )}
    </SectionCard>
  );
};

export { ApprovalsBlockRoot };
