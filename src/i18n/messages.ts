import authMessagesEn from '@lafise/lde-web-translations/i18n/en/modules/auth';
import coreMessagesEn from '@lafise/lde-web-translations/i18n/en/modules/core';
import usersAndPermissionsMessagesEn from '@lafise/lde-web-translations/i18n/en/modules/users-and-permissions';
import authMessagesEs from '@lafise/lde-web-translations/i18n/es/modules/auth';
import coreMessagesEs from '@lafise/lde-web-translations/i18n/es/modules/core';
import usersAndPermissionsMessagesEs from '@lafise/lde-web-translations/i18n/es/modules/users-and-permissions';

import { SupportedLocales } from '@/types/i18n';

import bancanetFieldsEn from '../../i18n/en/bancanet-fields.json';
import bancanetEn from '../../i18n/en/bancanet.json';
import baseDocumentsEn from '../../i18n/en/base-documents.json';
import commonEn from '../../i18n/en/common.json';
import companyFieldsEn from '../../i18n/en/company-fields.json';
import documentChecklistEn from '../../i18n/en/document-checklist.json';
import economicActivityFieldsEn from '../../i18n/en/economic-activity-fields.json';
import economicActivityEn from '../../i18n/en/economic-activity.json';
import formEn from '../../i18n/en/form.json';
import newRequestEn from '../../i18n/en/new-request.json';
import profileEn from '../../i18n/en/profile.json';
import referencesAccountsFieldsEn from '../../i18n/en/references-accounts-fields.json';
import referencesAccountsEn from '../../i18n/en/references-accounts.json';
import relatedPartiesFieldsEn from '../../i18n/en/related-parties-fields.json';
import relatedPartiesEn from '../../i18n/en/related-parties.json';
import requestEn from '../../i18n/en/request.json';
import signatureEn from '../../i18n/en/signature.json';
import stepsEn from '../../i18n/en/steps.json';
import submittedEn from '../../i18n/en/submitted.json';
import surveyEn from '../../i18n/en/survey.json';
import bancanetFieldsEs from '../../i18n/es/bancanet-fields.json';
import bancanetEs from '../../i18n/es/bancanet.json';
import baseDocumentsEs from '../../i18n/es/base-documents.json';
import commonEs from '../../i18n/es/common.json';
import companyFieldsEs from '../../i18n/es/company-fields.json';
import documentChecklistEs from '../../i18n/es/document-checklist.json';
import economicActivityFieldsEs from '../../i18n/es/economic-activity-fields.json';
import economicActivityEs from '../../i18n/es/economic-activity.json';
import formEs from '../../i18n/es/form.json';
import newRequestEs from '../../i18n/es/new-request.json';
import profileEs from '../../i18n/es/profile.json';
import referencesAccountsFieldsEs from '../../i18n/es/references-accounts-fields.json';
import referencesAccountsEs from '../../i18n/es/references-accounts.json';
import relatedPartiesFieldsEs from '../../i18n/es/related-parties-fields.json';
import relatedPartiesEs from '../../i18n/es/related-parties.json';
import requestEs from '../../i18n/es/request.json';
import signatureEs from '../../i18n/es/signature.json';
import stepsEs from '../../i18n/es/steps.json';
import submittedEs from '../../i18n/es/submitted.json';
import surveyEs from '../../i18n/es/survey.json';

/** Spanish is typed against the English shape so both locales keep parity. */
const appMessagesEn = {
  ...commonEn,
  ...requestEn,
  ...stepsEn,
  ...formEn,
  ...companyFieldsEn,
  ...economicActivityFieldsEn,
  ...referencesAccountsFieldsEn,
  ...relatedPartiesFieldsEn,
  ...bancanetFieldsEn,
  ...economicActivityEn,
  ...referencesAccountsEn,
  ...relatedPartiesEn,
  ...bancanetEn,
  ...newRequestEn,
  ...profileEn,
  ...baseDocumentsEn,
  ...documentChecklistEn,
  ...signatureEn,
  ...surveyEn,
  ...submittedEn,
};

const appMessagesEs: typeof appMessagesEn = {
  ...commonEs,
  ...requestEs,
  ...stepsEs,
  ...formEs,
  ...companyFieldsEs,
  ...economicActivityFieldsEs,
  ...referencesAccountsFieldsEs,
  ...relatedPartiesFieldsEs,
  ...bancanetFieldsEs,
  ...economicActivityEs,
  ...referencesAccountsEs,
  ...relatedPartiesEs,
  ...bancanetEs,
  ...newRequestEs,
  ...profileEs,
  ...baseDocumentsEs,
  ...documentChecklistEs,
  ...signatureEs,
  ...surveyEs,
  ...submittedEs,
};

/** Shared LDE bundles first; zone copy wins on key collisions. */
const mergedMessages = {
  [SupportedLocales.Es]: {
    ...coreMessagesEs,
    ...authMessagesEs,
    ...usersAndPermissionsMessagesEs,
    ...appMessagesEs,
  },
  [SupportedLocales.En]: {
    ...coreMessagesEn,
    ...authMessagesEn,
    ...usersAndPermissionsMessagesEn,
    ...appMessagesEn,
  },
} as const;

type AppMessages = typeof appMessagesEn;

const resolveMessages = (locale: SupportedLocales) =>
  locale === SupportedLocales.En ?
    mergedMessages[SupportedLocales.En]
  : mergedMessages[SupportedLocales.Es];

export { resolveMessages, type AppMessages };
