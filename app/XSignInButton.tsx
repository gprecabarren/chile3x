export function XSignInButton({ enabled, intent, returnTo }: { enabled: boolean; intent: "login" | "register"; returnTo: string }) {
  return <form action="/api/auth/x/start" method="post" className={`x-signin${enabled ? "" : " is-disabled"}`}>
    <input name="intent" type="hidden" value={intent} /><input name="return_to" type="hidden" value={returnTo} />
    <button className="apple-signin-button x-signin-button" type="submit" disabled={!enabled} title={!enabled ? "El acceso con X estará disponible cuando finalice su configuración." : undefined}><span aria-hidden="true">𝕏</span><span>{intent === "register" ? "Registrarse con X" : "Continuar con X"}</span></button>
  </form>;
}
