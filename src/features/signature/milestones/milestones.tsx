import { useTranslations } from 'next-intl';

import { ListBox } from '@lafise/onyx-ui/collections/list-box';
import { Text } from '@lafise/onyx-ui/typography/text';

import { milestonesTheme } from './themes';

const { badge, number } = milestonesTheme();

const MILESTONES = ['received', 'review', 'sign'] as const;

/**
 * How the process goes on once the documents are sent: informative, not a
 * tracker. The card above already says where it stands (POC
 * `HitosDelTramite`).
 */
const Milestones = () => {
  const t = useTranslations('Signature');

  return (
    <ListBox
      aria-label={t('milestonesLabel')}
      dense={false}
      layout='stack'
      variant='alpha'
      selectionMode='none'
    >
      {MILESTONES.map((key, index) => {
        const title = t(`milestones.${key}.title`);

        return (
          <ListBox.Item key={key} id={key} textValue={title}>
            <ListBox.Prefix>
              <div className={badge()}>
                <Text size='md' className={number()}>
                  {index + 1}
                </Text>
              </div>
            </ListBox.Prefix>
            <ListBox.Content>
              <ListBox.Label>{title}</ListBox.Label>
              <ListBox.Description>
                {t(`milestones.${key}.detail`)}
              </ListBox.Description>
            </ListBox.Content>
          </ListBox.Item>
        );
      })}
    </ListBox>
  );
};

export { Milestones };
