// cspell:ignore peldanos
import type { Route } from '@/lib/ownership';
import type { Step } from '../types';

/** A route as rows with the accumulated product (POC modal-de-desglose.tsx `peldanosDe`). */
const stepsOf = (route: Route): Step[] => {
  let accumulated = 100;
  return route.links.map((link, index) => {
    accumulated = (accumulated * link.percentage) / 100;
    return {
      key: `${link.name}-${String(index)}`,
      level: index + 1,
      who: link.name,
      of: route.links[index - 1]?.name,
      part: link.percentage,
      accumulated: Math.round(accumulated * 100) / 100,
      last: index === route.links.length - 1,
    };
  });
};

export { stepsOf };
