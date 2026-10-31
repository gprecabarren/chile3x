import { ActionIcon } from "@/app/ActionIcon";
import {
  AGENCY_PROFILE_GUIDE,
  AGENCY_WORKFLOW_VERSION,
} from "@/lib/agency-policy";
import {
  MAX_IMAGES_PER_PROFILE,
  MAX_VIDEOS_PER_PROFILE,
  MAX_PROFILE_MEDIA_BYTES,
} from "@/lib/media";
import "./agency-management.css";

export function ListingTypeGuide() {
  return (
    <details className="listing-type-guide">
      <summary>
        <span>
          <strong>Tipos de anuncio: funciones y límites</strong>
          <small>
            Escort, Agencia, Arriendo y Venta de contenido · descubre cómo
            funciona cada opción.
          </small>
        </span>
      </summary>
      <div className="listing-guide-content">
        <p>
          Puedes combinar tipos de anuncio en una misma cuenta. Crear una
          agencia no convierte tu Escort personal en un perfil gestionado ni
          cambia su titularidad.
        </p>
        <div className="listing-guide-grid">
          {AGENCY_PROFILE_GUIDE.map((item) => (
            <article key={item.type}>
              <h3>{item.title}</h3>
              <ol
                className="listing-workflow"
                aria-label={`Pasos de ${item.title}`}
              >
                {item.steps.map((step, i) => (
                  <li key={step}>
                    <span className="listing-workflow-step">{i + 1}</span>
                    <span>{step}</span>
                    {i < item.steps.length - 1 && <ActionIcon name="next" />}
                  </li>
                ))}
              </ol>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <div className="listing-guide-common">
          <h3>Reglas que comparten los anuncios</h3>
          <ul>
            <li>
              Una foto principal, hasta {MAX_IMAGES_PER_PROFILE} fotos de
              galería y {MAX_VIDEOS_PER_PROFILE} videos. Los videos finales
              duran hasta 15 segundos. El conjunto admite hasta{" "}
              {MAX_PROFILE_MEDIA_BYTES / 1_000_000} MB.
            </li>
            <li>
              Elegir archivos o arrastrarlos no los publica: revisa sus opciones
              y confirma cada carga. Fotos, videos y datos se guardan por
              separado.
            </li>
            <li>
              La agencia y la titular usan el mismo editor. Recorte, marca de
              agua, privacidad facial y orden están disponibles según el tipo de
              archivo y los ajustes del sitio.
            </li>
            <li>
              Los anuncios y archivos nuevos requieren revisión. Cambiar
              información relevante puede devolver el anuncio a revisión; una
              agencia no concede verificaciones ni aprueba su propio material.
            </li>
            <li>
              Escort y Agencia pueden elegir VIP, Premium o Bronze. La categoría
              no implica verificación de identidad ni médica. Arriendo conserva
              su directorio propio.
            </li>
            <li>
              Los documentos son privados. Solo la titular, su agencia
              expresamente autorizada para documentos y administración
              autorizada pueden consultarlos.
            </li>
            <li>
              Ocultar un anuncio conserva sus datos. Al eliminarlo pasa a la
              papelera administrativa. Una agencia con perfiles aún sin cuenta
              personal no puede eliminarse dejando esos perfiles sin vínculo.
            </li>
            <li>
              La pausa de períodos y los futuros planes pagados solo estarán
              disponibles cuando se habiliten sus condiciones. No cambian los
              permisos de titularidad.
            </li>
            <li>
              La biblioteca privada y la bandeja de mensajes pertenecen a la
              cuenta: autorizar un anuncio no comparte contraseñas ni toda la
              actividad personal. Al vincular un perfil a otra cuenta, los
              mensajes anteriores de la agencia siguen en su cuenta.
            </li>
          </ul>
        </div>
        <small className="listing-guide-version">
          Guía {AGENCY_WORKFLOW_VERSION} · Límites vinculados a las reglas
          compartidas del sitio.
        </small>
      </div>
    </details>
  );
}
