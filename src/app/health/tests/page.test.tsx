import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HealthPage from '@/app/health/page';

vi.mock('@lafise/lde-web-core', () => ({
  HealthCheck: () => <div data-testid='health-check' />,
}));

describe('HealthPage', () => {
  describe('Rendering', () => {
    it('should render the HealthCheck component', () => {
      render(<HealthPage />);

      expect(screen.getByTestId('health-check')).toBeInTheDocument();
    });

    it('should render without errors', () => {
      render(<HealthPage />);

      expect(document.body).toBeInTheDocument();
    });
  });
});
