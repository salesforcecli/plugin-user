/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Lifecycle, Logger, Messages, SfError, StateAggregator } from '@salesforce/core';
import { Ux } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permsetlicense.assign');

type SuccessMsg = {
  name: string;
  value: string;
};

type FailureMsg = {
  name: string;
  message: string;
};

export type PSLResult = {
  successes: SuccessMsg[];
  failures: FailureMsg[];
};

interface PermissionSetLicense {
  Id: string;
}

export const assignPSL = async ({
  conn,
  pslName,
  usernamesOrAliases,
}: {
  conn: Connection;
  pslName: string;
  usernamesOrAliases: string[];
}): Promise<PSLResult> => {
  const logger = await Logger.child('assignPSL');

  logger.debug(`will assign perm set license "${pslName}" to users: ${usernamesOrAliases.join(', ')}`);
  const pslId = await queryPsl(conn, pslName);

  return (
    await Promise.all(
      usernamesOrAliases.map((usernameOrAlias) =>
        usernameToPSLAssignment({
          pslName,
          usernameOrAlias,
          pslId,
          conn,
        })
      )
    )
  ).reduce<PSLResult>(
    (acc, result) =>
      isSuccess(result)
        ? { ...acc, successes: [...acc.successes, result] }
        : { ...acc, failures: [...acc.failures, result] },
    {
      successes: [],
      failures: [],
    }
  );
};

export const resultsToExitCode = (results: PSLResult): number => {
  if (results.failures.length && results.successes.length) {
    return 68;
  } else if (results.failures.length) {
    return 1;
  } else if (results.successes.length) {
    return 0;
  }
  throw new SfError('Invalid results');
};

export const print = (results: PSLResult): void => {
  const ux = new Ux();
  if (results.failures.length > 0 && results.successes.length > 0) {
    ux.styledHeader('Partial Success');
  }
  if (results.successes.length > 0) {
    ux.styledHeader('Permset Licenses Assigned');
    ux.table(results.successes, {
      name: { header: 'Username' },
      value: { header: 'Permission Set License Assignment' },
    });
  }

  if (results.failures.length > 0) {
    if (results.successes.length > 0) {
      ux.log('');
    }

    ux.styledHeader('Failures');
    ux.table(results.failures, { name: { header: 'Username' } }, { message: { header: 'Error Message' } });
  }
};

// handles one username/psl combo so these can run in parallel
const usernameToPSLAssignment = async ({
  pslName,
  usernameOrAlias,
  pslId,
  conn,
}: {
  pslName: string;
  usernameOrAlias: string;
  pslId: string;
  conn: Connection;
}): Promise<SuccessMsg | FailureMsg> => {
  // Convert any aliases to usernames
  const resolvedUsername = (await StateAggregator.getInstance()).aliases.resolveUsername(usernameOrAlias);

  try {
    const AssigneeId = (
      await conn.singleRecordQuery<{ Id: string }>(`select Id from User where Username = '${resolvedUsername}'`)
    ).Id;

    await conn.sobject('PermissionSetLicenseAssign').create({
      AssigneeId,
      PermissionSetLicenseId: pslId,
    });
    return {
      name: resolvedUsername,
      value: pslName,
    };
  } catch (e) {
    // idempotency.  If user(s) already have PSL, the API will throw an error about duplicate value.
    // but we're going to call that a success
    if (e instanceof Error && e.message.startsWith('duplicate value found')) {
      await Lifecycle.getInstance().emitWarning(messages.getMessage('duplicateValue', [resolvedUsername, pslName]));
      return {
        name: resolvedUsername,
        value: pslName,
      };
    } else {
      return {
        name: resolvedUsername,
        message: e instanceof Error ? e.message : 'error contained no message',
      };
    }
  }
};

const isSuccess = (input: SuccessMsg | FailureMsg): input is SuccessMsg => (input as SuccessMsg).value !== undefined;

const queryPsl = async (conn: Connection, pslName: string): Promise<string> => {
  try {
    return (
      await conn.singleRecordQuery<PermissionSetLicense>(
        `select Id from PermissionSetLicense where DeveloperName = '${pslName}' or MasterLabel = '${pslName}'`
      )
    ).Id;
  } catch (e) {
    throw new SfError('PermissionSetLicense not found');
  }
};
