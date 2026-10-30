import Link from 'next/link';

import type { ReactNode } from 'react';

import { Button, buttonTheme } from '@lafise/onyx-ui/base/button';
import { Link as OnyxLink } from '@lafise/onyx-ui/base/link';

import { stepFooterTheme } from './themes';

const { externalLink } = stepFooterTheme();

interface NavButtonProps {
  href: string | undefined;
  /** The href leaves this zone, so it is a plain anchor. */
  isExternal?: boolean;
  variant: 'outline' | 'primary';
  isDisabled?: boolean;
  onPress?: (() => void) | undefined;
  isPending?: boolean;
  children: ReactNode;
}

/** Navigation styled as a button; a real disabled button when it cannot go. */
const NavButton = ({
  href,
  isExternal = false,
  variant,
  isDisabled = false,
  onPress,
  isPending = false,
  children,
}: Readonly<NavButtonProps>) => {
  if (isDisabled) {
    return (
      <Button variant={variant} isDisabled>
        {children}
      </Button>
    );
  }
  if (onPress) {
    return (
      <Button variant={variant} onPress={onPress} isPending={isPending}>
        {children}
      </Button>
    );
  }
  if (href === undefined) {
    return (
      <Button variant={variant} isDisabled>
        {children}
      </Button>
    );
  }
  return isExternal ?
      <OnyxLink
        href={href}
        className={buttonTheme({
          variant,
          className: externalLink({ variant }),
        })}
      >
        {children}
      </OnyxLink>
    : <Link href={href} className={buttonTheme({ variant })}>
        {children}
      </Link>;
};

export { NavButton, type NavButtonProps };
