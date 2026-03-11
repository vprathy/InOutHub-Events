/**
 * DEV ONLY CONFIGURATION
 * This file contains hardcoded credentials for local development and testing.
 * It is stripped from production builds.
 */

// We use a simple consistent password for all local dev accounts to make testing easy
const DEV_PASSWORD = 'password123!';

export const DEV_USERS = {
    SUPER_ADMIN: {
        email: 'vinay.prathy@ziffyvolve.com',
        password: DEV_PASSWORD,
        roleId: 'super-admin',
    },
    ORG_OWNER: {
        email: 'owner@ziffyvolve.com',
        password: DEV_PASSWORD,
        roleId: 'org-owner',
    },
    EVENT_ADMIN: {
        email: 'eventadmin@ziffyvolve.com',
        password: DEV_PASSWORD,
        roleId: 'event-admin',
    },
    STAGE_MANAGER: {
        email: 'stagemanager@ziffyvolve.com',
        password: DEV_PASSWORD,
        roleId: 'stage-manager',
    },
    ACT_ADMIN: {
        email: 'actadmin@ziffyvolve.com',
        password: DEV_PASSWORD,
        roleId: 'act-admin',
    },
} as const;

// Helper to look up dev credentials by role ID
export const getDevUserByRole = (roleId: string) => {
    return Object.values(DEV_USERS).find((user) => user.roleId === roleId);
};
