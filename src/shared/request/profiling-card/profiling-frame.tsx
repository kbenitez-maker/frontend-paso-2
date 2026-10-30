'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { Briefcase } from '@lafise/onyx-icons';
import { Card } from '@lafise/onyx-ui/data-display/card';

import { CountryBadge } from '@/shared/request/country-badge';

import { useProfilingCard } from './context';
import { profilingCardTheme } from './themes';

const { card, header, headline, description, body } = profilingCardTheme();

interface ProfilingFrameProps {
  children: ReactNode;
}

/** The card around the profiling fields (POC perfil): icon, title and why it is asked. */
const ProfilingFrame = ({ children }: Readonly<ProfilingFrameProps>) => {
  const { country, bankId } = useProfilingCard();
  const t = useTranslations('NewRequest');

  return (
    <Card className={card()}>
      <Card.Indicator>
        <Briefcase size='md' />
      </Card.Indicator>

      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={1} size='md'>
            {t('card.title')}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {t('card.description')}
          </Card.Description>
        </Card.Headline>
        <CountryBadge country={country} bankId={bankId} />
      </Card.Header>

      <Card.Body className={body()}>{children}</Card.Body>
    </Card>
  );
};

export { ProfilingFrame, type ProfilingFrameProps };
