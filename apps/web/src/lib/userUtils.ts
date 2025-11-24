/**
 * Formats a user's display name.
 * Returns firstName + lastName if available, otherwise returns email.
 */
export function getUserDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  return user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email;
}
