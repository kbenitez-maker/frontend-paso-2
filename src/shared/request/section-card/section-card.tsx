import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { Card } from '@lafise/onyx-ui/data-display/card';
import { Text } from '@lafise/onyx-ui/typography/text';

import { sectionCardTheme } from './themes';

const { card, header, headline, marker, body } = sectionCardTheme();

interface SectionCardProps {
  title: string;
  /** Whether the block asks for anything mandatory; defaults to "(Required)". */
  required?: boolean;
  /** Fields of the block; the card is only a header without them. */
  children?: ReactNode;
}

/** Card of one form block: title on the left, requirement marker on the right. */
const SectionCard = ({
  title,
  required = true,
  children,
}: Readonly<SectionCardProps>) => {
  const t = useTranslations('Steps');

  return (
    <Card className={card()}>
      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={2} size='sm'>
            {title}
          </Card.Title>
        </Card.Headline>
        <Text size='sm' className={marker()}>
          {required ? t('required') : t('optional')}
        </Text>
      </Card.Header>
      {children === undefined ? null : (
        <Card.Body className={body()}>{children}</Card.Body>
      )}
    </Card>
  );
};

export { SectionCard, type SectionCardProps };
