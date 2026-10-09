"use client";

import { useState } from "react";
import { MAX_WHATSAPP_CONTACTS, type WhatsappContact } from "@/lib/portal-whatsapp";

export function WhatsappSettingsEditor({ initialContacts }: { initialContacts: WhatsappContact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const update = (id: string, patch: Partial<WhatsappContact>) => setContacts(current => current.map(contact => contact.id === id ? { ...contact, ...patch } : contact));
  function move(index: number, direction: -1 | 1) {
    setContacts(current => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  return <section className="admin-settings-section whatsapp-settings-section">
    <div><p>CONTACTOS DEL BOTÓN FLOTANTE</p><h2>Más WhatsApp del equipo</h2><span>Soporte técnico siempre usa el número principal de arriba. Los contactos adicionales solo aparecen en el panel flotante; puedes cambiar su orden o desactivarlos sin perder su configuración ni sus estadísticas.</span></div>
    <input type="hidden" name="whatsapp_extra_contacts" value={JSON.stringify(contacts)} readOnly />
    <div className="whatsapp-settings-list">{contacts.map((contact, index) => <article key={contact.id}>
      <header><strong>Contacto {index + 1}</strong><span>{contact.enabled ? "Visible en el panel" : "Oculto al público"}</span></header>
      <div className="admin-settings-grid">
        <label>Nombre del área<input value={contact.label} maxLength={60} required placeholder="Marketing digital" onChange={event => update(contact.id, { label: event.target.value })} /></label>
        <label>Número de WhatsApp<input value={contact.phone} inputMode="tel" maxLength={22} required={contact.enabled} placeholder="+56 9 1234 5678" onChange={event => update(contact.id, { phone: event.target.value })} /><small>Incluye el código del país. Un móvil chileno de 9 dígitos se completa con +56.</small></label>
        <label className="admin-field-full">Explicación para visitantes<textarea rows={2} value={contact.description} maxLength={240} required onChange={event => update(contact.id, { description: event.target.value })} /></label>
        <label className="admin-field-full">Mensaje inicial en WhatsApp<textarea rows={2} value={contact.message} maxLength={400} required onChange={event => update(contact.id, { message: event.target.value })} /></label>
        <label>Visibilidad<select value={contact.enabled ? "enabled" : "disabled"} onChange={event => update(contact.id, { enabled: event.target.value === "enabled" })}><option value="enabled">Mostrar contacto</option><option value="disabled">Ocultar contacto</option></select></label>
      </div>
      <div className="whatsapp-settings-actions">
        <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Subir</button>
        <button type="button" disabled={index === contacts.length - 1} onClick={() => move(index, 1)}>Bajar</button>
        <button type="button" className="whatsapp-settings-remove" onClick={() => { if (window.confirm(`¿Quitar “${contact.label || "este contacto"}” del panel? Las estadísticas anteriores se conservan.`)) setContacts(current => current.filter(item => item.id !== contact.id)); }}>Quitar contacto</button>
      </div>
    </article>)}</div>
    {contacts.length < MAX_WHATSAPP_CONTACTS && <button type="button" className="button button-outline" onClick={() => setContacts(current => [...current, {
      id: `wa_${crypto.randomUUID()}`, label: "Nuevo contacto", description: "Ayuda del equipo de Chile3X con publicaciones y el sitio.", phone: "", message: "Hola, quiero consultar al equipo de Chile3X sobre una publicación.", enabled: false,
    }])}>+ Agregar WhatsApp</button>}
    <small className="whatsapp-settings-help">Puedes configurar hasta {MAX_WHATSAPP_CONTACTS} contactos adicionales. Al terminar, pulsa “Guardar cambios”. Quitar un contacto no borra los registros anteriores.</small>
  </section>;
}
