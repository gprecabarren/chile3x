"use client";

import { useState } from "react";
import type { PublicationRule } from "@/lib/publication-rules";

const emptyRule: PublicationRule = { title: "", body: "" };

export function PublicationRulesEditor({ initialRules }: { initialRules: PublicationRule[] }) {
  const [rules, setRules] = useState(initialRules);

  function update(index: number, key: keyof PublicationRule, value: string) {
    setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [key]: value } : rule));
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rules.length) return;
    setRules((current) => {
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  return <section className="admin-settings-section faq-settings-section">
    <div><p>REGLAS DE PUBLICACIÓN</p><h2>Define los criterios de moderación</h2><span>Modifica, ordena, elimina o agrega puntos. Los cambios se publican automáticamente en <code>/reglas-de-publicacion</code>.</span></div>
    <input name="publication_rules" type="hidden" value={JSON.stringify(rules)} readOnly />
    <div className="faq-settings-list">
      {rules.map((rule, index) => <article key={`${index}-${rule.title}`}>
        <p>Regla {String(index + 1).padStart(2, "0")}</p>
        <div className="faq-settings-fields">
          <label>Título<input value={rule.title} maxLength={120} required onChange={(event) => update(index, "title", event.target.value)} /></label>
          <label>Contenido<textarea value={rule.body} maxLength={1400} rows={5} required onChange={(event) => update(index, "body", event.target.value)} /></label>
        </div>
        <div className="faq-settings-actions">
          <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Subir</button>
          <button type="button" onClick={() => move(index, 1)} disabled={index === rules.length - 1}>Bajar</button>
          <button type="button" className="faq-remove" onClick={() => setRules((current) => current.length > 1 ? current.filter((_, ruleIndex) => ruleIndex !== index) : current)}>Quitar</button>
        </div>
      </article>)}
    </div>
    {rules.length < 20 && <button type="button" className="button button-outline faq-add" onClick={() => setRules((current) => [...current, { ...emptyRule }])}>Agregar regla</button>}
  </section>;
}
