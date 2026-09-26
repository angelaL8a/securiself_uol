/** A registered third-party application client (secret hash stripped). */
export interface ApplicationClient {
  id: string;
  userId: string;
  name: string;
  clientId: string;
  redirectUri: string;
  createdAt: string;
  updatedAt: string;
}

/** Response from creating or rotating a client (one-time secret included). */
export interface CreatedClientResponse {
  application: ApplicationClient;
  clientSecret: string;
}
