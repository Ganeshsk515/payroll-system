export const isAdminUser = (user) => user?.role === 'admin';

export const isEmployeeUser = (user) => user?.role === 'employee';

export const canManageEmployees = (user) => isAdminUser(user);

export const canRunPayroll = (user) => isAdminUser(user);

export const canViewEmployeeProfile = (user, employeeId) => (
  isAdminUser(user) || String(user?.employee_profile) === String(employeeId)
);
