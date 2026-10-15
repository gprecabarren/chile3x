// Presentation only. Never use this alias for authentication, permissions,
// database identities, provenance or audit snapshots.
const PRIVATE_DISPLAY_ADMIN_ID="usr_admin_b8d25f66-47b4-4fbb-8a74-39b863d12513";
export function adminDisplayLogin(admin:{id:string;githubLogin:string}){
  return admin.id===PRIVATE_DISPLAY_ADMIN_ID?"b":admin.githubLogin;
}
