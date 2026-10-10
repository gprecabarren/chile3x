export function XSignInButton({ enabled, intent, returnTo }: { enabled: boolean; intent: "login" | "register"; returnTo: string }) {
  return <form action="/api/auth/x/start" method="post" className={`x-signin${enabled ? "" : " is-disabled"}`}>
    <input name="intent" type="hidden" value={intent} /><input name="return_to" type="hidden" value={returnTo} />
    <button className="apple-signin-button x-signin-button" type="submit" disabled={!enabled} aria-disabled={!enabled} title={!enabled ? "El acceso con X todavía no está habilitado." : undefined}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-7.4L5.6 22H2.5l7.5-8.6L.8 2h6.4l4.4 6.7L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" /></svg>
      <span>{intent === "register" ? "Registrarse con X" : "Continuar con X"}</span>
    </button>
  </form>;
}
