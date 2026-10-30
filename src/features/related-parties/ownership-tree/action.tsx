import type { ReactNode } from 'react';

import { Button } from '@lafise/onyx-ui/base/button';
import { Tooltip } from '@lafise/onyx-ui/overlays/tooltip';

import { actionTheme } from './themes';

const { tooltip } = actionTheme();

interface ActionProps {
  label: string;
  isDisabled: boolean;
  onPress: () => void;
  children: ReactNode;
}

/** A round row button with its explanation on hover. */
const Action = ({
  label,
  isDisabled,
  onPress,
  children,
}: Readonly<ActionProps>) => (
  <Tooltip.Root delay={300}>
    <Button
      icon
      variant='white'
      size='md'
      aria-label={label}
      isDisabled={isDisabled}
      onPress={onPress}
    >
      {children}
    </Button>
    <Tooltip>
      <Tooltip.Arrow />
      <Tooltip.Content className={tooltip()}>{label}</Tooltip.Content>
    </Tooltip>
  </Tooltip.Root>
);

export { Action, type ActionProps };
