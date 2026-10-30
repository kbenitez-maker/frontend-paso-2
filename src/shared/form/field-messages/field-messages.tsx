import { Text } from '@lafise/onyx-ui/typography/text';

import { fieldMessagesTheme } from './themes';

const { error: errorStyle, hint: hintStyle } = fieldMessagesTheme();

interface FieldMessagesProps {
  hint?: string | undefined;
  error?: string | undefined;
}

/** Hint and error under a control; the error wins the hint's place when both exist. */
const FieldMessages = ({ hint, error }: Readonly<FieldMessagesProps>) => (
  <>
    {error === undefined ? null : (
      <Text size='sm' role='alert' className={errorStyle()}>
        {error}
      </Text>
    )}
    {hint === undefined || error !== undefined ? null : (
      <Text size='sm' className={hintStyle()}>
        {hint}
      </Text>
    )}
  </>
);

export { FieldMessages, type FieldMessagesProps };
