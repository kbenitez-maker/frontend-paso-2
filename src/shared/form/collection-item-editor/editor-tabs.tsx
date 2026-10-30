'use client';

import type { Entry } from './lib/entries';

import { useTranslations } from 'next-intl';

import { InfoCircle } from '@lafise/onyx-icons';
import { Tabs } from '@lafise/onyx-ui/layout/tabs';
import { Notification } from '@lafise/onyx-ui/status/notification';

import { useCollectionItemEditor } from './context';
import { EditorGroups } from './editor-groups';
import { tabOf } from './lib/entries';
import { collectionItemEditorTheme } from './themes';

const { tab: tabStyle, tabPanel } = collectionItemEditorTheme();

interface EditorTabsProps {
  /** Tabs of the item, in display order. */
  tabs: readonly string[];
  /** Every entry of the item; each tab shows its visible ones. */
  entries: readonly Entry[];
}

/** The draft's entries split into tabs; an empty tab explains itself. */
const EditorTabs = ({ tabs, entries }: Readonly<EditorTabsProps>) => {
  const t = useTranslations('Form.collection');
  const { fields, tabLabels, isShown } = useCollectionItemEditor();

  return (
    <Tabs>
      <Tabs.List aria-label={t('tabs')}>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab} id={tab} className={tabStyle()}>
            {/* eslint-disable-next-line security/detect-object-injection -- `tab` comes from the registry */}
            {tabLabels[tab] ?? tab}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panels>
        {tabs.map((tab) => {
          const shown = entries.filter(
            (entry) => tabOf(fields, entry) === tab && isShown(entry),
          );
          return (
            <Tabs.Panel key={tab} id={tab} className={tabPanel()}>
              {/* POC: an empty tab explains itself instead of a blank panel. */}
              {shown.length === 0 ?
                <Notification status='neutral'>
                  <Notification.Icon>
                    <InfoCircle />
                  </Notification.Icon>
                  <Notification.Content>{t('tabEmpty')}</Notification.Content>
                </Notification>
              : <EditorGroups entries={shown} />}
            </Tabs.Panel>
          );
        })}
      </Tabs.Panels>
    </Tabs>
  );
};

export { EditorTabs, type EditorTabsProps };
