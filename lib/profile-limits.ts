// A narrowly scoped, server-controlled exception. Reusing the email on a
// different account must not inherit this permission, nor may a submitted form
// grant it. Keep the database triggers in 0039 aligned with this identity.
const unlimitedEscortAccount = {
  id: "usr_b876b728-e6e9-48cd-9d78-db0124556362",
  email: "hiragasaito4@hotmail.com",
} as const;

export function hasUnlimitedEscortListings(account: { id: string; email: string }): boolean {
  return account.id === unlimitedEscortAccount.id
    && account.email.trim().toLowerCase() === unlimitedEscortAccount.email;
}
