import { RailBlocks } from './rail-blocks';
import { RailHeader } from './rail-header';
import { RailStep } from './rail-step';
import { StepRailRoot } from './step-rail';

/**
 * Fixed left rail of the form: `<StepRail requestId />` renders the whole
 * rail; its parts read the rail state from context.
 */
const StepRail = Object.assign(StepRailRoot, {
  Header: RailHeader,
  Step: RailStep,
  Blocks: RailBlocks,
});

export { StepRail };
export type { StepRailProps } from './step-rail';
