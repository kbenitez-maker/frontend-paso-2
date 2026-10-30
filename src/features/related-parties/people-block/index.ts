import { MissingRolesNotice } from './missing-roles-notice';
import { PeopleBlockRoot } from './people-block';

/** Block of a list of people; `MissingRolesNotice` names the roles the matrix still requires. */
const PeopleBlock = Object.assign(PeopleBlockRoot, { MissingRolesNotice });

export { PeopleBlock };
