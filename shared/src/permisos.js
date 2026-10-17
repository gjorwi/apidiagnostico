export const ROLES = ['admin', 'digitador', 'analista', 'supervisor'];

export const PERMISOS = {
  RECORDS_CREATE: 'records.create',
  RECORDS_EDIT: 'records.edit',
  RECORDS_DELETE: 'records.delete',
  RECORDS_READ: 'records.read',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  USERS_MANAGE: 'users.manage',
  CATALOG_MANAGE: 'catalog.manage',
  AUDIT_VIEW: 'audit.view',
  SETTINGS_MANAGE: 'settings.manage',
  IMPORTS_RUN: 'imports.run',
};

export const PERMISOS_POR_ROL = {
  admin: Object.values(PERMISOS),
  digitador: [
    PERMISOS.RECORDS_CREATE,
    PERMISOS.RECORDS_EDIT,
    PERMISOS.RECORDS_READ,
    PERMISOS.IMPORTS_RUN,
  ],
  analista: [PERMISOS.REPORTS_VIEW, PERMISOS.REPORTS_EXPORT],
  supervisor: [
    PERMISOS.RECORDS_READ,
    PERMISOS.REPORTS_VIEW,
    PERMISOS.REPORTS_EXPORT,
    PERMISOS.AUDIT_VIEW,
    PERMISOS.IMPORTS_RUN,
  ],
};

export function tienePermiso(rol, permiso) {
  return (PERMISOS_POR_ROL[rol] || []).includes(permiso);
}

export function permisosDeRol(rol) {
  return PERMISOS_POR_ROL[rol] || [];
}
