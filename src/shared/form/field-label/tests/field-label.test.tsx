import { describe, expect, it } from 'vitest';

import { TextField } from '@lafise/onyx-ui/forms/text-field';

import { es, render, screen } from '@/test/render';

import { FieldLabel } from '../field-label';

const triggerFor = (fieldLabel: string) =>
  es.Form.tooltipTrigger.replace('{label}', fieldLabel);

describe('FieldLabel', () => {
  it('renders only the label and optional marker when no tooltip is provided', () => {
    const fieldLabel = 'Correo electrónico';
    render(
      <TextField>
        <FieldLabel label={fieldLabel} isRequired={false} />
      </TextField>,
    );

    expect(screen.getByText(fieldLabel)).toBeDefined();
    expect(screen.getByText(es.Form.optional)).toBeDefined();
    expect(
      screen.queryByRole('button', { name: triggerFor(fieldLabel) }),
    ).toBeNull();
  });

  it('renders the help tooltip trigger when a tooltip string is provided', () => {
    const fieldLabel = 'Razón social de la empresa';
    render(
      <TextField>
        <FieldLabel label={fieldLabel} isRequired tooltip='Texto de ayuda' />
      </TextField>,
    );

    expect(screen.getByLabelText(triggerFor(fieldLabel))).toBeDefined();
  });
});
