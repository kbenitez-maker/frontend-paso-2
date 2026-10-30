import { createQueryAdapter } from '@lafise/lde-web-lib';

import { HttpInternal } from '@/lib/http-internal';

const queryAdapter = createQueryAdapter({ httpAdapter: HttpInternal });

export { queryAdapter };
