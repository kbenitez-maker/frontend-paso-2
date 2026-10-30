'use client';

import { use, useEffect, useRef } from 'react';

import type { CollectionHandle } from '@/shared/form/collection-field';
import type { BlockCardProps } from '@/shared/step-form/block-card';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useMessages, useTranslations } from 'next-intl';
import { useFormContext, useWatch } from 'react-hook-form';

import { Add, CheckFilled, InfoCircle, Warning } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Card } from '@lafise/onyx-ui/data-display/card';
import { Notification } from '@lafise/onyx-ui/status/notification';
import { toast } from '@lafise/onyx-ui/status/toast';
import { Text } from '@lafise/onyx-ui/typography/text';

import { isRequired, itemsWithIssues } from '@/contracts';
import { queryKeys } from '@/lib/constants/query-keys';
import {
  confirmationIn,
  confirmIssue,
  gateIssue,
  isCurrent,
  labelsOf,
  openBranches,
  OWNERSHIP_CONFIRMATION,
  ownershipTotals,
  partiesOf,
  SHAREHOLDERS,
  shareholdersIn,
} from '@/lib/ownership';
import {
  confirmOwnershipMutation,
  reopenOwnershipMutation,
} from '@/server/api';
import { CollectionField } from '@/shared/form/collection-field';
import { FormField, iconOf } from '@/shared/form/form-field';
import { LocalCatalogsContext } from '@/shared/form/hooks';
import { SectionCard } from '@/shared/request/section-card';
import { visibleItems } from '@/shared/step-form/block-card';
import { draftValues } from '@/shared/step-form/block-validation';
import { normalizeValues } from '@/shared/step-form/block-values';
import { saveSection } from '@/shared/step-form/save-section';

import { BeneficiariesTable } from '../beneficiaries-table';
import { percent, useOwnershipCopy } from '../lib/ownership-copy';
import { OwnershipContext } from '../lib/route-context';
import { addShareholderTo, OwnershipTree } from '../ownership-tree';
import { copyAdministrator } from './lib/administrator-shortcut';
import { relink } from './lib/relink';
import { repeatedCompanies } from './lib/repeated-companies';
import { useCompanyOptions } from './lib/use-company-options';
import { SummaryActions } from './summary-actions';
import { shareholdersBlockTheme } from './themes';

type Item = Record<string, unknown>;

const {
  list: listSlot,
  gate: gateSlot,
  card,
  header,
  threshold: thresholdSlot,
  body,
  notice,
  openActions,
  rule,
} = shareholdersBlockTheme();

/** The gate shown under the tree: "not confirmed" is asked by the summary card instead. */
const shownGate = (gate: ReturnType<typeof gateIssue>) =>
  gate?.code === 'not_confirmed' ? undefined : gate;

/** Which summary notices apply: a seal older than the list, and the rule until it is sealed. */
const summaryNotices = ({
  hasItems,
  wasConfirmed,
  isCurrent: current,
}: {
  hasItems: boolean;
  wasConfirmed: boolean;
  isCurrent: boolean;
}) => ({
  stale: wasConfirmed && !current,
  rule: hasItems && !current,
});

/**
 * Shareholders of route A (POC accionistas.ts and resumen-estructura.tsx at
 * 43057bb9): the ownership tree, then the card that confirms the structure,
 * runs the calculation and lists the natural persons with their total
 * participation. Confirming seals the tree (ITDFCJ-46 says "without blocking
 * the edition": we follow the POC screen; PO decision pending).
 */
const ShareholdersBlock = ({
  title,
  items: blockItems,
  fields,
  context,
  country,
  bankId,
  labelOf,
  icons,
}: Readonly<BlockCardProps>) => {
  const t = useTranslations('RelatedParties.ownership');
  const format = useFormatter();
  const copy = useOwnershipCopy();
  const noun: string = useMessages().Form.collections.shareholders.noun;
  const ownership = use(OwnershipContext);
  const client = useQueryClient();
  const { getValues, trigger } = useFormContext();
  const values: Item = { ...context, ...useWatch() };
  const items = shareholdersIn(values);
  const parties = partiesOf(items);
  const labels = labelsOf(parties);
  const confirmation = confirmationIn(values);
  const current = isCurrent(confirmation, items);
  const threshold = confirmation?.threshold ?? ownership?.threshold ?? 0;
  const listRef = useRef<CollectionHandle>(null);

  // The seal changes what is asked (complementary data): the footer gate re-validates.
  useEffect(() => {
    void trigger();
  }, [confirmation, trigger]);

  const collection = blockItems.find(
    (entry) => entry.kind === 'collection' && entry.name === SHAREHOLDERS,
  );
  const itemFields = collection?.kind === 'collection' ? collection.fields : [];
  const { [OWNERSHIP_CONFIRMATION]: _seal, ...unsealed } = values;
  // Read as before any calculation, so a stale seal does not ask for complementary data first.
  const toConfirm = confirmIssue(
    items,
    itemsWithIssues(itemFields, SHAREHOLDERS, unsealed, country, unsealed),
  );
  const gate = gateIssue(
    items,
    confirmation,
    itemsWithIssues(itemFields, SHAREHOLDERS, values, country, values),
    threshold,
  );

  const companies = useCompanyOptions({ values, items, parties, labels });

  const refresh = async () => {
    await client.invalidateQueries({
      queryKey: queryKeys.accountRequests.ownershipStructure(
        ownership?.requestId ?? '',
      ),
    });
  };
  const confirm = useMutation(
    confirmOwnershipMutation(ownership?.requestId ?? ''),
  );
  const reopen = useMutation(
    reopenOwnershipMutation(ownership?.requestId ?? ''),
  );
  const failed = () => {
    toast.error({
      heading: t('failed.title'),
      description: t('failed.description'),
    });
  };

  const onConfirm = async () => {
    if (ownership === undefined) return;
    try {
      // The calculation runs on what the server holds: save the list as it is first.
      const fieldsOfBlock = fields.filter(
        ({ section }) => section === SHAREHOLDERS,
      );
      const normalized = normalizeValues(
        fieldsOfBlock,
        getValues(),
        context,
        country,
      );
      await saveSection(client, ownership.requestId, SHAREHOLDERS, 'draft', {
        [SHAREHOLDERS]: shareholdersIn(
          draftValues(fieldsOfBlock, normalized, context, country),
        ),
      });
      await confirm.mutateAsync(undefined);
      await refresh();
    } catch {
      failed();
    }
  };
  const onReopen = async () => {
    try {
      await reopen.mutateAsync(undefined);
      await refresh();
    } catch {
      failed();
    }
  };

  const totals = current ? ownershipTotals(parties, threshold) : [];
  const beneficial = totals.filter((total) => total.beneficial).length;
  const open = openBranches(parties);
  const repeated = repeatedCompanies(parties);
  const sealed = current ? t('sealed') : undefined;
  const required = itemFields.some((field) =>
    isRequired(field.required, country),
  );

  const visibleGate = shownGate(gate);
  const notices = summaryNotices({
    hasItems: items.length > 0,
    wasConfirmed: confirmation !== undefined,
    isCurrent: current,
  });
  // POC abrir-rama.ts: the form opens with the company decided.
  const openBranch = (companyId: string) => {
    if (listRef.current !== null) addShareholderTo(listRef.current, companyId);
  };

  const renderList = (list: CollectionHandle) => (
    <div className={listSlot()}>
      <OwnershipTree list={list} noun={noun} sealed={sealed} />
      {visibleGate === undefined ? null : (
        <Text size='sm' role='status' className={gateSlot()}>
          {copy.gate(visibleGate)}
        </Text>
      )}
    </div>
  );

  return (
    <LocalCatalogsContext value={companies}>
      <SectionCard title={title} required={required}>
        <CollectionField
          name={SHAREHOLDERS}
          fields={itemFields}
          scope={values}
          country={country}
          bankId={bankId}
          labelOf={labelOf}
          icons={icons}
          renderList={renderList}
          listRef={listRef}
          mapAnswer={copyAdministrator(values)}
          afterSave={relink}
        />
        {/* POC CONSTANCIA_BENEFICIARIO: the reason fields, under the list. */}
        {visibleItems(blockItems, values, country).flatMap((item) =>
          item.kind === 'field' ?
            [
              <FormField
                key={item.field.key}
                field={item.field}
                name={item.field.key}
                country={country}
                bankId={bankId}
                labelOf={labelOf}
                icon={iconOf(item.field, icons)}
              />,
            ]
          : [],
        )}
      </SectionCard>

      <Card className={card()}>
        <Card.Header className={header()}>
          <Card.Title level={2} size='sm'>
            {t('summary.title')}
          </Card.Title>
          <Text size='sm' className={thresholdSlot()}>
            {t('summary.threshold', { threshold: percent(threshold) })}
          </Text>
        </Card.Header>
        <Card.Body className={body()}>
          {items.length === 0 ?
            <Notification status='neutral'>
              <Notification.Icon>
                <InfoCircle />
              </Notification.Icon>
              <Notification.Content>{t('summary.empty')}</Notification.Content>
            </Notification>
          : null}

          {open.length > 0 ?
            <Notification status='warning'>
              <Notification.Icon>
                <Warning />
              </Notification.Icon>
              <Notification.Content className={notice()}>
                {t('summary.open', {
                  names: format.list(
                    open.map((party) => party.name),
                    { type: 'conjunction' },
                  ),
                })}
                <div className={openActions()}>
                  {open.map((party) => (
                    <Button
                      key={party.id}
                      variant='outline'
                      size='sm'
                      onPress={() => {
                        openBranch(party.id);
                      }}
                    >
                      <Add size='md' />
                      {t('summary.registerOf', { company: party.name })}
                    </Button>
                  ))}
                </div>
              </Notification.Content>
            </Notification>
          : null}

          {repeated.length > 0 ?
            <Notification status='info'>
              <Notification.Icon>
                <InfoCircle />
              </Notification.Icon>
              <Notification.Content>
                {t('summary.repeated', {
                  count: repeated.length,
                  names: format.list(repeated, { type: 'conjunction' }),
                })}
              </Notification.Content>
            </Notification>
          : null}

          {notices.stale ?
            <Notification status='warning'>
              <Notification.Icon>
                <Warning />
              </Notification.Icon>
              <Notification.Content>{t('summary.stale')}</Notification.Content>
            </Notification>
          : null}

          {notices.rule ?
            <Text size='sm' className={rule()}>
              {t('summary.rule')}
            </Text>
          : null}

          {current && confirmation !== undefined ?
            <Notification status='success'>
              <Notification.Icon>
                <CheckFilled />
              </Notification.Icon>
              <Notification.Content>
                {t('summary.calculated', {
                  date: format.dateTime(new Date(confirmation.confirmed_at), {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  }),
                  threshold: percent(confirmation.threshold),
                  count: beneficial,
                })}
              </Notification.Content>
            </Notification>
          : null}

          {items.length === 0 ? null : (
            <SummaryActions
              isCurrent={current}
              wasConfirmed={confirmation !== undefined}
              blocker={
                toConfirm === undefined ? undefined : copy.blocker(toConfirm)
              }
              isReopening={reopen.isPending}
              isConfirming={confirm.isPending}
              onReopen={() => {
                void onReopen();
              }}
              onConfirm={() => {
                void onConfirm();
              }}
            />
          )}

          {current ?
            <BeneficiariesTable
              parties={parties}
              totals={totals}
              threshold={threshold}
            />
          : null}
        </Card.Body>
      </Card>
    </LocalCatalogsContext>
  );
};

export { ShareholdersBlock };
