import { describe, expect, it } from 'vitest';

import { Text } from '@lafise/onyx-ui/typography/text';

import { render, screen } from '@/test/render';

import {
  OpeningLiveValuesProvider,
  useOpeningLiveValues,
  useRegisterOpeningLiveValues,
} from '..';

interface PublisherProps {
  sectionCode: string;
  values: Record<string, unknown>;
}

const Publisher = ({ sectionCode, values }: Readonly<PublisherProps>) => {
  useRegisterOpeningLiveValues(sectionCode, values);
  return null;
};

const Reader = () => (
  <Text data-testid='live'>
    {JSON.stringify(useOpeningLiveValues() ?? null)}
  </Text>
);

const IDENTIFICATION = { has_branches: true };
const CONTACT = { email: 'ops@example.com' };

const live = () => JSON.parse(screen.getByTestId('live').textContent);

describe('opening live values', () => {
  it('shares the values of the section on screen', () => {
    render(
      <OpeningLiveValuesProvider>
        <Reader />
        <Publisher sectionCode='identification' values={IDENTIFICATION} />
      </OpeningLiveValuesProvider>,
    );

    expect(live()).toEqual({
      sectionCode: 'identification',
      values: IDENTIFICATION,
    });
  });

  it('replaces the values when the section changes', () => {
    const { rerender } = render(
      <OpeningLiveValuesProvider>
        <Reader />
        <Publisher sectionCode='identification' values={IDENTIFICATION} />
      </OpeningLiveValuesProvider>,
    );

    rerender(
      <OpeningLiveValuesProvider>
        <Reader />
        <Publisher sectionCode='contact' values={CONTACT} />
      </OpeningLiveValuesProvider>,
    );

    expect(live()).toEqual({ sectionCode: 'contact', values: CONTACT });
  });

  it('clears the values when the section unmounts', () => {
    const { rerender } = render(
      <OpeningLiveValuesProvider>
        <Reader />
        <Publisher sectionCode='identification' values={IDENTIFICATION} />
      </OpeningLiveValuesProvider>,
    );

    rerender(
      <OpeningLiveValuesProvider>
        <Reader />
      </OpeningLiveValuesProvider>,
    );

    expect(live()).toBeNull();
  });

  it('does nothing outside the provider', () => {
    render(
      <>
        <Reader />
        <Publisher sectionCode='identification' values={IDENTIFICATION} />
      </>,
    );

    expect(live()).toBeNull();
  });
});
