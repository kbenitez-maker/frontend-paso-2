'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@lafise/onyx-ui/data-display/card';
import { Select } from '@lafise/onyx-ui/forms/select';
import { Notification } from '@lafise/onyx-ui/status/notification';

import { useConfirmBlock } from './context';
import { confirmBlockTheme } from './themes';

const { card, header, headline, description, body } = confirmBlockTheme();

/** The signer of the request, chosen among the registered people. */
const SignerCard = () => {
  const ts = useTranslations('DocumentChecklist.signer');
  const { confirmation, choose } = useConfirmBlock();
  const hasSigners = confirmation.signer_options.length > 0;

  return (
    <Card className={card()}>
      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={2} size='md'>
            {ts('title')}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {ts('description')}
          </Card.Description>
        </Card.Headline>
      </Card.Header>

      <Card.Body className={body()}>
        <Select
          value={confirmation.signer_id}
          onChange={(key) => {
            choose({ signer_id: key === null ? null : String(key) });
          }}
          isRequired
          isDisabled={!hasSigners}
          placeholder={hasSigners ? ts('placeholder') : ts('none')}
        >
          {ts('label')}
          <Select.Trigger size='lg' />
          <Select.Popover>
            <Select.List>
              {confirmation.signer_options.map((option) => (
                <Select.Item
                  key={option.id}
                  id={option.id}
                  textValue={option.name}
                >
                  {option.name}
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popover>
        </Select>

        {confirmation.signer_id === null ?
          <Notification status='info'>
            <Notification.Icon />
            <Notification.Content>{ts('pending')}</Notification.Content>
          </Notification>
        : null}
      </Card.Body>
    </Card>
  );
};

export { SignerCard };
