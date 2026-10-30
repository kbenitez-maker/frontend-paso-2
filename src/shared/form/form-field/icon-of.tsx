import type { FieldDefinition } from '@/contracts/types';
import type { ReactNode } from 'react';

import { Link, Mail } from '@lafise/onyx-icons';

/** Leading icon of a text input: by type (email, link), else from the step's icons by field key. */
const iconOf = (
  field: FieldDefinition,
  icons: ReadonlyMap<string, ReactNode> | undefined,
): ReactNode => {
  if (field.type === 'email') return <Mail size='sm' />;
  if (field.type === 'url') return <Link size='sm' />;
  return icons?.get(field.key);
};

export { iconOf };
