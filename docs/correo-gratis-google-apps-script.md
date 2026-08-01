# Correos gratis para Chile3X (beta)

Esta alternativa envia los correos de verificacion y recuperacion de clave con
`chile3x.site@gmail.com`, sin contratar Workers Paid. Es apropiada para la beta;
Gmail aplica cuotas diarias y no debe utilizarse para envios masivos.

## 1. Crear el relay de Google

1. Entra con `chile3x.site@gmail.com` a [script.google.com](https://script.google.com).
2. Crea un proyecto nuevo llamado **Chile3X correo**.
3. Borra el contenido y pega este codigo:

```javascript
const SECRET_PROPERTY = "CHILE3X_RELAY_SECRET";

function doPost(event) {
  try {
    const payload = JSON.parse(event && event.postData ? event.postData.contents : "{}");
    const secret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY);

    if (!secret || payload.secret !== secret) {
      return json({ ok: false, error: "unauthorized" });
    }

    if (!isEmail(payload.to) || typeof payload.subject !== "string" || typeof payload.text !== "string" || typeof payload.html !== "string") {
      return json({ ok: false, error: "invalid_payload" });
    }

    MailApp.sendEmail({
      to: payload.to,
      subject: payload.subject.slice(0, 180),
      body: payload.text,
      htmlBody: payload.html,
      name: "Chile3X",
      replyTo: isEmail(payload.replyTo) ? payload.replyTo : undefined,
    });

    return json({ ok: true, remainingQuota: MailApp.getRemainingDailyQuota() });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "send_failed" });
  }
}

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 2. Crear y guardar una clave secreta

En el editor de Apps Script abre **Project Settings** > **Script properties** y agrega:

- Propiedad: `CHILE3X_RELAY_SECRET`
- Valor: una contrasena aleatoria larga (minimo 32 caracteres). No la publiques ni la pegues en el codigo.

## 3. Publicar como aplicacion web

En **Deploy** > **New deployment** selecciona **Web app**:

- Execute as: **Me** (`chile3x.site@gmail.com`)
- Who has access: **Anyone**

Autoriza los permisos de `MailApp`, despliega y copia la URL que termina en `/exec`.

## 4. Conectar Chile3X sin exponer secretos

En Cloudflare abre **Workers & Pages** > **chile3x** > **Settings** > **Variables and Secrets** y agrega, como secretos de produccion:

- `GOOGLE_APPS_SCRIPT_URL`: URL `/exec` de Apps Script.
- `GOOGLE_APPS_SCRIPT_SECRET`: el mismo valor de `CHILE3X_RELAY_SECRET`.

Guarda ambos y vuelve a desplegar el Worker si Cloudflare lo solicita. No se debe
configurar ninguno en el navegador, D1 ni GitHub.

## 5. Prueba segura

Solicita recuperar la contrasena de una cuenta propia. El correo llegara desde
`chile3x.site@gmail.com` con nombre **Chile3X**. Si no aparece, revisa Spam y el panel
**Executions** del proyecto de Apps Script. Los enlaces continuan venciendo en una hora
para recuperacion y 24 horas para verificacion.

Cuando el volumen lo justifique, se puede migrar a Cloudflare Email Service o a un
proveedor transaccional con dominio propio. El Worker ya intentara Cloudflare primero y
usara este relay como respaldo.
