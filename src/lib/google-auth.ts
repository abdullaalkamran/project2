import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
};

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}

export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Google authentication is not configured");
  }

  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!email || !name) {
    throw new Error("Google account information is incomplete");
  }

  return {
    sub: typeof payload.sub === "string" ? payload.sub : "",
    email,
    name,
    picture: typeof payload.picture === "string" ? payload.picture : null,
    emailVerified: payload.email_verified === true,
  };
}
