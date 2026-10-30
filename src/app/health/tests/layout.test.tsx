import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lafise/lde-web-core', () => ({
  Background: {
    Home: () => <div aria-hidden='true' data-testid='background-home' />,
  },
}));

vi.mock('@lafise/onyx-ui/layout/app-shell/body', () => ({
  Body: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

const { default: HealthLayout } = await import('../layout');

describe('HealthLayout', () => {
  describe('Rendering', () => {
    it('should render its children', () => {
      render(
        <HealthLayout>
          <div>Child Content</div>
        </HealthLayout>,
      );
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should render the decorative ambient glow element', () => {
      const { container } = render(
        <HealthLayout>
          <span />
        </HealthLayout>,
      );
      const decoration = container.querySelector('[aria-hidden="true"]');
      expect(decoration).toBeInTheDocument();
    });

    it('should render children inside a centered wrapper', () => {
      render(
        <HealthLayout>
          <span data-testid='child' />
        </HealthLayout>,
      );
      const child = screen.getByTestId('child');
      expect(child.parentElement).toHaveClass(
        'flex',
        'items-center',
        'justify-center',
      );
    });
  });
});
