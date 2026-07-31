"use client";

import { useState } from "react";
import type { FaqEntry } from "@/lib/faq";

const emptyEntry: FaqEntry = { question: "", answer: "" };

export function FaqSettingsEditor({ initialEntries }: { initialEntries: FaqEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);

  function update(index: number, key: keyof FaqEntry, value: string) {
    setEntries((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, [key]: value } : entry));
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= entries.length) return;
    setEntries((current) => {
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  return <section className="admin-settings-section faq-settings-section">
    <div><p>PREGUNTAS FRECUENTES</p><h2>Edita lo que verá el público</h2><span>Modifica las respuestas, cambia el orden o agrega nuevas preguntas. Se publican automáticamente en <code>/faq</code> y en sus datos estructurados para buscadores.</span></div>
    <input name="faq_entries" type="hidden" value={JSON.stringify(entries)} readOnly />
    <div className="faq-settings-list">
      {entries.map((entry, index) => <article key={`${index}-${entry.question}`}>
        <p>Pregunta {String(index + 1).padStart(2, "0")}</p>
        <div className="faq-settings-fields">
          <label>Pregunta<input value={entry.question} maxLength={140} required onChange={(event) => update(index, "question", event.target.value)} /></label>
          <label>Respuesta<textarea value={entry.answer} maxLength={700} rows={4} required onChange={(event) => update(index, "answer", event.target.value)} /></label>
        </div>
        <div className="faq-settings-actions">
          <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Subir</button>
          <button type="button" onClick={() => move(index, 1)} disabled={index === entries.length - 1}>Bajar</button>
          <button type="button" className="faq-remove" onClick={() => setEntries((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current)}>Quitar</button>
        </div>
      </article>)}
    </div>
    {entries.length < 16 && <button type="button" className="button button-outline faq-add" onClick={() => setEntries((current) => [...current, { ...emptyEntry }])}>Agregar pregunta</button>}
  </section>;
}
