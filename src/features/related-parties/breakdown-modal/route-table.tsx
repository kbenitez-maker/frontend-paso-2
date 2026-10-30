import type { Route } from '@/lib/ownership';

import { useTranslations } from 'next-intl';

import { Table } from '@lafise/onyx-ui/data-display/table';
import { Text } from '@lafise/onyx-ui/typography/text';

import { percent } from '../lib/ownership-copy';
import { stepsOf } from './lib/steps-of';
import { routeTableTheme } from './themes';

const { root, level, who, name, of, part, accumulated, sum, sumText } =
  routeTableTheme();

/** One route: who owns what part of which company, and the multiplication written out. */
const RouteTable = ({ route }: Readonly<{ route: Route }>) => {
  const t = useTranslations('RelatedParties.ownership.breakdown');
  const holder = useTranslations('RelatedParties.ownership')('holder');
  const steps = stepsOf(route);

  return (
    <div className={root()}>
      <Table.Root variant='striped'>
        <Table aria-label={t('routeLabel')}>
          <Table.Thead>
            <Table.Th id='level' fill={false}>
              {t('level')}
            </Table.Th>
            <Table.Th id='who' isRowHeader>
              {t('who')}
            </Table.Th>
            <Table.Th id='part' fill={false}>
              {t('part')}
            </Table.Th>
            <Table.Th id='accumulated' fill={false}>
              {t('accumulated')}
            </Table.Th>
          </Table.Thead>
          <Table.Tbody>
            {steps.map((step) => (
              <Table.Tr key={step.key}>
                <Table.Td fill={false}>
                  <Text size='sm' className={level()}>
                    {step.level}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <div className={who()}>
                    <Text size='sm' className={name({ last: step.last })}>
                      {step.who}
                    </Text>
                    <Text size='xs' className={of()}>
                      {t('of', { company: step.of ?? holder })}
                    </Text>
                  </div>
                </Table.Td>
                <Table.Td fill={false}>
                  <Text size='sm' className={part()}>
                    {percent(step.part)} %
                  </Text>
                </Table.Td>
                <Table.Td fill={false}>
                  <Text size='sm' className={accumulated({ last: step.last })}>
                    {percent(step.accumulated)} %
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.Root>
      <div className={sum()}>
        <Text size='sm' className={sumText()}>
          {t('sum', {
            factors: steps.map((step) => `${percent(step.part)} %`).join(' × '),
            result: `${percent(steps.at(-1)?.accumulated ?? 0)} %`,
          })}
        </Text>
      </div>
    </div>
  );
};

export { RouteTable };
