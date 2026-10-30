'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { CreateNpsResponseBody } from '@/server/api';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Star } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Card } from '@lafise/onyx-ui/data-display/card';
import { Field } from '@lafise/onyx-ui/forms/field';
import { TextArea } from '@lafise/onyx-ui/forms/text-area';
import { TextField } from '@lafise/onyx-ui/forms/text-field';
import { toast } from '@lafise/onyx-ui/status/toast';
import { Text } from '@lafise/onyx-ui/typography/text';

import { NPS_COMMENT_MAX_LENGTH, npsCategoryOf } from '@/lib/constants/nps';
import { routes } from '@/lib/routes';
import { createNpsResponseMutation } from '@/server/api';
import { useRegisterStepGate } from '@/shared/request/step-gate';

import { ScoreScale } from '../score-scale';
import { surveyStepTheme } from './themes';

const { card, header, headline, description, body, closing, hint } =
  surveyStepTheme();

/** Up to 7 the open question asks how to improve; from 8 what was liked best (CA-2, CA-3). */
const IMPROVE_UP_TO = 7;

interface SurveyStepProps {
  requestId: string;
}

/**
 * Satisfaction survey right after "Finalizar" (POC encuesta, ITDFCJ-37).
 * Answering is optional: "Skip" records the event and goes on (CA-4). A
 * failed send keeps the score and comment so the applicant can retry (CA-7).
 * "Send" is the flow footer's: it goes on to the submitted screen.
 */
const SurveyStep = ({ requestId }: Readonly<SurveyStepProps>) => {
  const t = useTranslations('Survey');
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const send = useMutation(createNpsResponseMutation(requestId));

  /** Resolves `true` once the answer is recorded. */
  const answer = async (body: CreateNpsResponseBody): Promise<boolean> => {
    try {
      await send.mutateAsync(body);
      return true;
    } catch {
      toast.error({
        heading: t('failed.title'),
        description: t('failed.description'),
      });
      return false;
    }
  };

  useRegisterStepGate({
    canContinue: score !== null && !send.isPending,
    isPending: send.isPending,
    nextLabel: t('send'),
    onContinue: () => {
      if (score === null) return Promise.resolve(false);
      const text = comment.trim();
      return answer(text === '' ? { score } : { score, comment: text });
    },
  });

  return (
    <Card className={card()}>
      <Card.Indicator>
        <Star size='md' />
      </Card.Indicator>

      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={1} size='md'>
            {t('question')}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {t('scale')}
          </Card.Description>
        </Card.Headline>
      </Card.Header>

      <Card.Body className={body()}>
        <ScoreScale value={score} onChange={setScore} />

        {/* The open question only shows with a score, worded by its band. */}
        {score === null ? null : (
          <TextField
            value={comment}
            onChange={setComment}
            maxLength={NPS_COMMENT_MAX_LENGTH}
          >
            <Field.Label>
              {t(score <= IMPROVE_UP_TO ? 'improve' : 'liked')}
            </Field.Label>
            <TextArea rows={4} placeholder={t('placeholder')} />
          </TextField>
        )}

        <div className={closing()}>
          <Text size='sm' className={hint()}>
            {score === null ?
              t('optional')
            : t('category', { category: npsCategoryOf(score) })}
          </Text>

          <Button
            variant='plain'
            isDisabled={send.isPending}
            onPress={() => {
              void answer({ skipped: true }).then((sent) => {
                if (sent) router.push(routes.submitted(requestId));
              });
            }}
          >
            {t('skip')}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export { SurveyStep, type SurveyStepProps };
