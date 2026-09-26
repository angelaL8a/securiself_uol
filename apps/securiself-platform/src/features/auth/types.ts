/** Root identity user as returned by the backend (password hash stripped). */
export interface User {
  id: string;
  email: string;
  legalFirstName: string | null;
  legalLastName: string | null;
  displayName: string | null;
  gender: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Successful auth response from /auth/login and /auth/register. */
export interface AuthResponse {
  status: "success";
  user: User;
  token: string;
}
