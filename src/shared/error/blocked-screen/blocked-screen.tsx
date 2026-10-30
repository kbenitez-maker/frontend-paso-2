'use client';

import Image from 'next/image';

import type { ReactNode } from 'react';

import { buttonTheme } from '@lafise/onyx-ui/base/button';
import { Link } from '@lafise/onyx-ui/base/link';
import { Heading } from '@lafise/onyx-ui/typography/heading';
import { Text } from '@lafise/onyx-ui/typography/text';

import { ASSETS } from '@/lib/constants/assets';

import { ErrorPageLayout } from '../error-page-layout';
import { blockedScreenTheme } from './themes';

const { root, copy, heading, text } = blockedScreenTheme();

interface BlockedScreenProps {
  title: string;
  description: string;
  /** The only way out: a link to another zone, so a full page load. */
  action: { label: string; href: string; icon: ReactNode };
}

/**
 * Full-screen dead end of the digital channel: brand on top, an illustration,
 * the reason and a single exit. It is not a card on the page because there is
 * no form left to return to.
 */
const BlockedScreen = ({
  title,
  description,
  action,
}: Readonly<BlockedScreenProps>) => (
  <ErrorPageLayout>
    <div className={root()}>
      <Image
        src={ASSETS.laptopOutOfService}
        alt=''
        width={312}
        height={220}
        priority
      />

      <div className={copy()}>
        <Heading level={1} size='lg' className={heading()}>
          {title}
        </Heading>
        <Text size='md' className={text()}>
          {description}
        </Text>
      </div>

      <Link
        href={action.href}
        className={buttonTheme({ variant: 'primary', size: 'lg' })}
      >
        {action.icon}
        {action.label}
      </Link>
    </div>
  </ErrorPageLayout>
);

export { BlockedScreen, type BlockedScreenProps };
