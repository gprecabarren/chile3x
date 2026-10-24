"use client";
import { ActionButton } from "@/app/ActionButton";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "@/app/NavigationLink";
import { helpAnswer, helpTopicLink, HELP_QUERY_LIMIT, searchHelpTopics, sensitiveHelpQuery } from "@/lib/help-search";
import { HELP_BETA_NOTICE, type HelpAudience, type HelpProfile, type HelpTopic } from "@/lib/help-types";
import type { PublicWhatsappContact } from "@/lib/portal-whatsapp";
import "./help-center.css";

type Turn = { id: number; question: string; answer: ReturnType<typeof helpAnswer>; feedback?: "yes" | "no" };
type Props = { audience: HelpAudience; topics: HelpTopic[]; contacts: PublicWhatsappContact[]; profiles?: HelpProfile[] };
const NO_PROFILES: HelpProfile[] = [];

export function HelpCenter({ audience, topics, contacts, profiles = NO_PROFILES }: Props) {
  const [mode, setMode] = useState<"chat" | "guides">("chat");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [profileId, setProfileId] = useState(() => profiles.length === 1 ? profiles[0].id : "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [warning, setWarning] = useState("");
  const counter = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const revealAnswer = useRef(false);
  const selectedProfile = profiles.find(profile => profile.id === profileId);
  const categories = [...new Set(topics.map(topic => topic.category))];
  const visibleTopics = mode === "guides" && category ? topics.filter(topic => topic.category === category) : topics;
  const results = question.trim() ? searchHelpTopics(visibleTopics, question, mode === "guides" ? 20 : 4).map(result => result.topic) : visibleTopics;
  const examples = audience === "account" ? ["¿Cómo cambio una foto?", "No puedo subir un video", "¿Dónde veo mis comentarios?"] : ["¿Cómo edito un anuncio?", "¿Cómo apruebo todas las fotos?", "¿Cómo publico una historia?"];

  useEffect(() => {
    const container = log.current;
    const last = container?.querySelector<HTMLElement>(".help-chat-turn:last-child");
    if (container && last) container.scrollTop += last.getBoundingClientRect().top - container.getBoundingClientRect().top;
    if (revealAnswer.current) { container?.scrollIntoView({ block: "start", behavior: "instant" }); revealAnswer.current = false; }
  }, [turns.length]);

  function ask(value: string, topic?: HelpTopic) {
    const text = value.trim().slice(0, HELP_QUERY_LIMIT);
    if (!text) return;
    if (sensitiveHelpQuery(text)) {
      setWarning("No necesito tu correo, teléfono, clave ni códigos. Reformula la pregunta sin datos personales; no se agregó al historial del chat.");
      return;
    }
    const answer = topic ? { kind: "answer" as const, topics: [topic] } : helpAnswer(topics, text);
    const turn = { id: ++counter.current, question: text, answer };
    if (topic) input.current?.blur();
    revealAnswer.current = mode === "guides";
    setTurns(current => [...current, turn].slice(-8));
    setMode("chat");
    setQuestion("");
    setWarning("");
    // Guide/example taps must not open the mobile keyboard or jump to the input.
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(question); }
  function feedback(id: number, value: "yes" | "no") { setTurns(current => current.map(turn => turn.id === id ? { ...turn, feedback: value } : turn)); }

  const supportLinks = <div className="help-support-links">{contacts.map(contact => <a key={contact.id} href={contact.href} target="_blank" rel="noopener noreferrer">WhatsApp · {contact.label}</a>)}<Link href="/contacto">Otros canales de contacto</Link></div>;

  return <section className="help-center" aria-label="Johnny Sins, centro de ayuda beta">
    <header className="help-header"><span className="help-avatar">
      {/* Licensed local portrait: no external image request or actor account connection. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/help/johnny-sins.jpg" width="342" height="459" alt="Retrato de Johnny Sins utilizado para el bot de ayuda" />
    </span><div><p>BOT DE AYUDA DE CHILE3X <span className="help-beta">BETA</span></p><h2>Johnny Sins</h2><span>Hoy mi especialidad es ayudarte con tu anuncio.</span></div></header>
    <p className="help-beta-notice">{HELP_BETA_NOTICE}</p>
    <div className="help-toolbar"><nav aria-label="Modo del centro de ayuda"><ActionButton type="button" aria-pressed={mode === "chat"} onClick={() => setMode("chat")}>Preguntar</ActionButton><ActionButton type="button" aria-pressed={mode === "guides"} onClick={() => setMode("guides")}>Explorar guías <small>{topics.length}</small></ActionButton></nav><ActionButton className="help-reset" type="button" disabled={!turns.length} onClick={() => { setTurns([]); setQuestion(""); setWarning(""); input.current?.blur(); }}>Nueva conversación</ActionButton></div>
    {profiles.length > 0 && <label className="help-profile-selector">¿Sobre qué anuncio necesitas ayuda?<select value={profileId} onChange={event => setProfileId(event.target.value)}><option value="">Mis anuncios (elegir después)</option>{profiles.map(profile => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select><small>Los enlaces de las guías abrirán la sección de este anuncio. Solo aparecen tus publicaciones.</small></label>}
    {mode === "chat" && <>
      <div className="help-chat-log" ref={log} role="log" aria-label="Conversación de ayuda" aria-live="polite" aria-relevant="additions">
        <article className="help-answer help-welcome"><strong>Johnny Sins · Bot de ayuda beta</strong><p>Soy el bot de ayuda de Chile3X. Te muestro los pasos y enlaces del panel {audience === "admin" ? "administrativo" : "de tu cuenta"}. Esta versión no es IA generativa: utiliza guías revisadas. No soy una persona y no realizo cambios por ti.</p><p>No envíes contraseñas, códigos, documentos ni información de otras personas.</p><small>Las respuestas pueden contener errores. Si necesitas atención humana, tienes los WhatsApp oficiales al final.</small></article>
        {turns.map(turn => <div className="help-chat-turn" key={turn.id}>
          <div className="help-question"><span>Tú</span><p>{turn.question}</p></div>
          <article className="help-answer"><strong>Johnny Sins · Bot de ayuda beta</strong>
            {turn.answer.kind === "answer" ? turn.answer.topics.map(topic => <div key={topic.id}>
              <h3>{topic.title}</h3><p>{topic.summary}</p><ol>{topic.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
              <Link className="help-action-link" href={helpTopicLink(topic, selectedProfile)}>{topic.link.label} <span aria-hidden="true">→</span></Link>
              <p className="help-source">Fuente: guía revisada de {topic.category.toLowerCase()}{selectedProfile && topic.audience === "account" && topic.link.target ? ` · ${selectedProfile.name}` : ""}.</p>
            </div>) : turn.answer.kind === "choices" ? <><h3>Encontré varias posibilidades</h3><p>Elige la guía que se parezca a tu caso para no darte pasos equivocados.</p><div className="help-choices">{turn.answer.topics.map(topic => <ActionButton type="button" key={topic.id} onClick={() => ask(`Guía: ${topic.title}`, topic)}>{topic.title}<span aria-hidden="true">→</span></ActionButton>)}</div></> : <><h3>No encontré una guía clara para esa pregunta</h3><p>Prueba con la tarea concreta, por ejemplo “cambiar una foto”. Si tu caso sigue sin resolverse, contacta al equipo:</p>{supportLinks}</>}
            <small className="help-answer-warning">{HELP_BETA_NOTICE}</small>
            <div className="help-feedback"><span>¿Te sirvió?</span><ActionButton type="button" aria-pressed={turn.feedback === "yes"} onClick={() => feedback(turn.id, "yes")}>Sí</ActionButton><ActionButton type="button" aria-pressed={turn.feedback === "no"} onClick={() => feedback(turn.id, "no")}>No, necesito ayuda</ActionButton></div>
            {turn.feedback === "yes" && <p className="help-feedback-note" role="status">¡Bien! Puedes preguntar por otro paso. Tu valoración queda solo en esta visita.</p>}
            {turn.feedback === "no" && <div className="help-feedback-note" role="status"><p>El asistente no abrió un ticket ni envió tu conversación. Puedes explicar tu caso directamente al equipo:</p>{supportLinks}</div>}
          </article>
        </div>)}
      </div>
      {!turns.length && <div className="help-examples" aria-label="Preguntas de ejemplo">{examples.map(example => <ActionButton type="button" key={example} onClick={() => ask(example)}>{example}</ActionButton>)}</div>}
    </>}
    <form className="help-search-form" onSubmit={submit} role="search"><label htmlFor="help-question">{mode === "chat" ? "Pregunta o busca una tarea" : "Buscar en las guías"}</label><div><input id="help-question" ref={input} value={question} onChange={event => { setQuestion(event.target.value); setWarning(""); }} maxLength={HELP_QUERY_LIMIT} autoComplete="off" placeholder="Ej. ¿Cómo cambio una foto?" aria-describedby="help-query-privacy" /><ActionButton type="submit" disabled={!question.trim()}>Preguntar <span aria-hidden="true">→</span></ActionButton></div><small id="help-query-privacy">Tu consulta no se envía a una IA externa ni se guarda en nuestra base de datos. La conversación se borra al salir o recargar.</small></form>
    {warning && <p className="help-input-warning" role="alert">{warning}</p>}
    {mode === "guides" && <nav className="help-categories" aria-label="Categorías de ayuda"><ActionButton type="button" aria-pressed={!category} onClick={() => setCategory("")}>Todas</ActionButton>{categories.map(item => <ActionButton type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</ActionButton>)}</nav>}
    {(mode === "guides" || question.trim()) && <section className="help-guide-results" aria-label="Guías encontradas"><h3>{mode === "guides" ? "Guías disponibles para tu panel" : "Guías relacionadas con tu búsqueda"}</h3>{results.length ? <div>{results.slice(0, mode === "guides" ? 40 : 4).map(topic => <ActionButton type="button" key={topic.id} onClick={() => ask(`Guía: ${topic.title}`, topic)}><small>{topic.category}</small><strong>{topic.title}</strong><span>{topic.summary}</span><b>Abrir guía →</b></ActionButton>)}</div> : <p>No hay coincidencias. Prueba otra palabra o utiliza los canales de soporte.</p>}</section>}
    <aside className="help-human-support" aria-label="Soporte humano"><h3>¿No se resolvió?</h3><p>Habla con el equipo de Chile3X. La ayuda del sitio no coordina citas ni acuerdos de los anuncios.</p>{supportLinks}</aside>
    <footer className="help-footer"><span>Guías del centro de ayuda de Chile3X</span><span>Solo orientación: no cambia datos ni permisos.</span><details><summary>Créditos de imagen</summary><span>Foto de Johnny Sins: <a href="https://commons.wikimedia.org/wiki/File:Guy,_Ava_Lauren_at_XRCO_Awards_2007_1_(cropped).jpg" target="_blank" rel="noopener noreferrer">Luke Ford, recorte de Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/2.5/" target="_blank" rel="noopener noreferrer">CC BY-SA 2.5</a>.</span></details></footer>
  </section>;
}
