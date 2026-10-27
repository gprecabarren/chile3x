export const MIN_PASSWORD_LENGTH = 8;

// Public login checks perform the same PBKDF2 work for unknown accounts and
// accounts without a password. This is a dummy verifier, never a credential.
export const LOGIN_DUMMY_PASSWORD_HASH = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const passwordRequirementText = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
