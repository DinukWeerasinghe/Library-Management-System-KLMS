export const ROLES = {
    ADMIN: 'ADMIN',
    LIBRARIAN: 'LIBRARIAN',
    TEACHER: 'TEACHER',
};

export const PermissionService = {
    canAccessSettings: (role) => {
        return role === ROLES.ADMIN;
    },

    canAccessReports: (role) => {
        return role === ROLES.ADMIN || role === ROLES.LIBRARIAN;
    },

    canManageUsers: (role) => {
        return role === ROLES.ADMIN;
    },

    canUploadLogo: (role) => {
        return role === ROLES.ADMIN;
    },

    canManageBooks: (role) => {
        return [ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.TEACHER].includes(role);
    },

    canManageMembers: (role) => {
        return [ROLES.ADMIN, ROLES.LIBRARIAN].includes(role);
    },

    canManageTeachers: (role) => {
        return role === ROLES.LIBRARIAN || role === ROLES.ADMIN;
    },
};
