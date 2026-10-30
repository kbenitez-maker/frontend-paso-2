import { useState } from 'react';

import type { StepSlug } from '@/lib/constants/steps';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { WhatsApp } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Field } from '@lafise/onyx-ui/forms/field';
import { TextArea } from '@lafise/onyx-ui/forms/text-area';
import { TextField } from '@lafise/onyx-ui/forms/text-field';
import { Notification } from '@lafise/onyx-ui/status/notification';
import { toast } from '@lafise/onyx-ui/status/toast';

import { INQUIRY_MAX_LENGTH } from '@/lib/constants/inquiries';
import { queryKeys } from '@/lib/constants/query-keys';
import { findStep } from '@/lib/constants/steps';
import { createInquiryMutation } from '@/server/api';

interface InquiryFormProps {
  requestId: string;
  step: StepSlug | null;
  /** Whether the request already has inquiries: changes the label. */
  hasHistory: boolean;
  /** The draft lives in the trigger, so it survives closing the popover. */
  draft: string;
  onDraftChange: (draft: string) => void;
}

/** Writes and sends an inquiry. The error shows on the first attempt to send, not while typing. */
const InquiryForm = ({
  requestId,
  step,
  hasHistory,
  draft,
  onDraftChange,
}: Readonly<InquiryFormProps>) => {
  const t = useTranslations('Steps');
  const client = useQueryClient();
  const [attempted, setAttempted] = useState(false);
  const [sent, setSent] = useState(false);
  const send = useMutation({
    ...createInquiryMutation(requestId),
    onSuccess: () => {
      onDraftChange('');
      setAttempted(false);
      setSent(true);
      void client.invalidateQueries({
        queryKey: queryKeys.accountRequests.inquiries(requestId),
      });
    },
    onError: () => {
      toast.error({
        heading: t('help.failed.title'),
        description: t('help.failed.description'),
      });
    },
  });

  const isEmpty = draft.trim() === '';

  return (
    <>
      {sent ?
        <Notification status='success'>
          <Notification.Icon />
          <Notification.Content>
            {step === null ?
              t('help.sent')
            : t('help.sentFrom', {
                step: t(`${findStep(step).titleKey}.title`),
              })
            }
          </Notification.Content>
        </Notification>
      : null}

      <TextField
        value={draft}
        onChange={(value) => {
          onDraftChange(value);
          setSent(false);
        }}
        isInvalid={attempted && isEmpty}
        maxLength={INQUIRY_MAX_LENGTH}
      >
        {hasHistory ? t('help.another') : t('help.ask')}
        <TextArea rows={3} placeholder={t('help.placeholder')} />
        {attempted && isEmpty ?
          <Field.ValidationMessage>{t('help.empty')}</Field.ValidationMessage>
        : null}
      </TextField>

      <Button
        variant='primary'
        isPending={send.isPending}
        onPress={() => {
          setAttempted(true);
          if (!isEmpty) send.mutate({ step, text: draft.trim() });
        }}
      >
        {t('help.send')}
      </Button>

      <Button variant='outline'>
        <WhatsApp size='md' />
        {t('help.whatsapp')}
      </Button>
    </>
  );
};

export { InquiryForm };
