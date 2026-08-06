"use client";

import { useRef, useState } from "react";

type DocumentKind = "identity" | "medical";
type DocumentRecord = { kind: DocumentKind; byteSize: number; contentType: string };

const labels: Record<DocumentKind, { title: string; description: string }> = {
  identity: { title: "Carnet o documento de identidad", description: "Opcional y privado. Solo tú y administradores autorizados pueden revisarlo." },
  medical: { title: "Examen o certificado médico", description: "Opcional y privado. Nunca aparece en tu perfil público." },
};

function fileSize(bytes: number) {
  return `${(bytes / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB`;
}

export function ProfileVerificationDocuments({ profileId, initialDocuments }: { profileId: string; initialDocuments: DocumentRecord[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selected, setSelected] = useState<Partial<Record<DocumentKind, File>>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const inputs = { identity: useRef<HTMLInputElement>(null), medical: useRef<HTMLInputElement>(null) };

  async function upload(kind: DocumentKind) {
    const file = selected[kind];
    if (!file) return setMessage("Selecciona un archivo antes de subirlo.");
    if (file.size > 15_000_000) return setMessage("Cada documento puede pesar como máximo 15 MB.");
    setBusy(kind);
    setMessage("");
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch(`/api/perfiles/${profileId}/documentos/${kind}`, { method: "POST", body });
      const payload = await response.json() as { error?: string; document?: DocumentRecord };
      if (!response.ok || !payload.document) throw new Error(payload.error ?? "No se pudo subir el documento.");
      setDocuments((current) => [...current.filter((item) => item.kind !== kind), payload.document!]);
      setSelected((current) => ({ ...current, [kind]: undefined }));
      if (inputs[kind].current) inputs[kind].current.value = "";
      setMessage(`${labels[kind].title} guardado de forma privada.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir el documento.");
    } finally {
      setBusy(null);
    }
  }

  async function removeSaved(kind: DocumentKind) {
    setBusy(kind);
    setMessage("");
    try {
      const response = await fetch(`/api/perfiles/${profileId}/documentos/${kind}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo eliminar el documento.");
      setDocuments((current) => current.filter((item) => item.kind !== kind));
      setMessage(`${labels[kind].title} eliminado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar el documento.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="private-documents-status" aria-labelledby="private-documents-title">
    <p className="eyebrow">VERIFICACIÓN OPCIONAL</p>
    <h2 id="private-documents-title">Documentos privados</h2>
    <p>Sube cada documento por separado para que un archivo opcional no interfiera con tu aviso. Se aceptan JPG, PNG, WebP y PDF de hasta 15 MB.</p>
    {message && <p className="form-alert" role="status">{message}</p>}
    <div className="form-grid form-grid-two">
      {(["identity", "medical"] as const).map((kind) => {
        const document = documents.find((item) => item.kind === kind);
        const file = selected[kind];
        return <div className="private-document-card" key={kind}><strong>{labels[kind].title}</strong><small>{labels[kind].description}</small>
          {document && <p><a href={`/api/perfiles/${profileId}/documentos/${kind}`}>Descargar archivo privado</a> · {fileSize(document.byteSize)}</p>}
          <input ref={inputs[kind]} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(event) => { const next = event.currentTarget.files?.[0]; setSelected((current) => ({ ...current, [kind]: next })); setMessage(""); }} />
          {file && <div className="private-document-actions"><small>Seleccionado: {file.name} · {fileSize(file.size)}</small><button className="button button-outline" type="button" onClick={() => { setSelected((current) => ({ ...current, [kind]: undefined })); if (inputs[kind].current) inputs[kind].current.value = ""; }}>Quitar seleccionado</button><button className="button button-primary" type="button" disabled={busy === kind} onClick={() => void upload(kind)}>{busy === kind ? "Subiendo…" : document ? "Reemplazar archivo" : "Subir archivo"}</button></div>}
          {document && <button className="button button-outline" type="button" disabled={busy === kind} onClick={() => void removeSaved(kind)}>Eliminar archivo guardado</button>}
        </div>;
      })}
    </div>
  </section>;
}
