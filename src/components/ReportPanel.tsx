import { useMemo, useState } from 'react'
import { useCourseStore } from '../store/courseStore'
import { buildReport, conformanceLabel, generateA11yStatementHtml, generateReportHtml, generateReportMarkdown } from '../report/report'
import { IssueItem } from './IssueList'
import { Icon } from './Icon'

export function ReportPanel() {
  const course = useCourseStore((s) => s.course)
  const goToScreen = useCourseStore((s) => s.goToScreen)
  const setActiveTab = useCourseStore((s) => s.setActiveTab)
  const data = useMemo(() => buildReport(course), [course])
  // Campos de la declaración de accesibilidad: se rellenan antes de generarla y
  // no se guardan en el proyecto (no son parte de course.json).
  const publishedVersions = (course.scorm.layouts || []).length
  const [a11yEntity, setA11yEntity] = useState(course.course.authoring_entity || '')
  const [a11yContact, setA11yContact] = useState('')
  const [a11yVersion, setA11yVersion] = useState(publishedVersions ? `Versión publicada n.º ${publishedVersions}` : 'Borrador (sin publicar)')

  function download(text: string, name: string, type: string) {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  function printPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(generateReportHtml(course))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  /** Enlace a la superficie de edición de una fila del informe. */
  const screenLink = (screenId: string | undefined, text: string) =>
    screenId ? (
      <button className="ed-link" onClick={() => goToScreen(screenId)} title="Abrir en el editor">
        {text}
      </button>
    ) : (
      text
    )

  const c = data.counts
  const meta = course.course

  return (
    <div className="ed-report">
      <div className="ed-report-actions">
        <button onClick={() => download(generateReportMarkdown(course), 'informe.md', 'text/markdown')}>
          Descargar Markdown
        </button>
        <button onClick={() => download(generateReportHtml(course), 'informe.html', 'text/html')}>
          Descargar HTML
        </button>
        <button className="ed-primary" onClick={printPdf}>Imprimir / PDF</button>
      </div>

      <div className="ed-report-body">
        <h1>Informe de revisión — {meta.title || 'Curso'}</h1>
        <blockquote>
          Documento de apoyo a la revisión interna. <strong>No constituye homologación ni
          acreditación oficial</strong>; queda pendiente de validación por la entidad y la
          administración competente.
        </blockquote>

        <h2>1. Datos generales</h2>
        <ul>
          <li><strong>Título:</strong> {meta.title}</li>
          <li><strong>Entidad:</strong> {meta.authoring_entity || '—'}</li>
          <li><strong>Fuente documental:</strong> {meta.source_document || '—'}</li>
          <li><strong>Idioma:</strong> {meta.language}</li>
          <li><strong>Duración estimada:</strong> {meta.estimated_hours || '—'} h</li>
          <li>
            <strong>SCORM:</strong> {course.scorm.version} · id <code>{course.scorm.identifier}</code> ·
            nota mínima {course.scorm.rules.min_score}%
          </li>
        </ul>

        <h2>2. Estructura</h2>
        <table>
          <thead>
            <tr><th>Módulos</th><th>Unidades</th><th>Pantallas</th><th>Interacciones</th><th>Preguntas</th></tr>
          </thead>
          <tbody>
            <tr><td>{c.modules}</td><td>{c.units}</td><td>{c.screens}</td><td>{c.interactions}</td><td>{c.questions}</td></tr>
          </tbody>
        </table>

        <h2>3. Matriz de trazabilidad (objetivo ↔ pantalla ↔ interacción ↔ evaluación)</h2>
        <table>
          <thead>
            <tr><th>Objetivo</th><th>Ubicación</th><th>Pantalla</th><th>Interacción</th><th>Evaluado</th></tr>
          </thead>
          <tbody>
            {data.matrix.map((r, i) => (
              <tr key={i}>
                <td>{r.objective}</td>
                <td>{r.path}</td>
                <td>{screenLink(r.screenId, r.screen)}</td>
                <td>{r.interaction}</td>
                <td>{r.evaluation}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>4. Preguntas y respuestas correctas</h2>
        <table>
          <thead>
            <tr><th>Pregunta</th><th>Origen</th><th>Respuesta correcta</th><th>Objetivo</th></tr>
          </thead>
          <tbody>
            {data.qa.map((r, i) => (
              <tr key={i}>
                <td>{screenLink(r.screenId, r.question)}</td>
                <td>{r.origin}</td>
                <td>{r.correct}</td>
                <td>{r.objective}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>5. Checklists</h2>
        {data.checklists.map((list) => (
          <div key={list.label}>
            <h3>{list.label}</h3>
            <table>
              <thead><tr><th>Estado</th><th>Criterio</th></tr></thead>
              <tbody>
                {list.items.map((it) => (
                  <tr key={it.code}>
                    <td>
                      <span className={it.failed ? 'ed-check-ko' : 'ed-check-ok'}>
                        <Icon name={it.failed ? 'circle-x' : 'circle-check'} size={15} />
                      </span>
                    </td>
                    <td>
                      {it.label}
                      {it.failed && (
                        <button className="ed-link" onClick={() => setActiveTab('validation')}>
                          ver en Validación
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <h2>6. Accesibilidad (UNE-EN 301 549 / WCAG 2.1 nivel AA)</h2>
        <p>
          <strong>Situación (autoevaluación):</strong>{' '}
          <span className={data.conformance.status === 'full' ? 'ed-check-ok' : 'ed-check-ko'}>
            {conformanceLabel(data.conformance)}
          </span>{' '}
          · {data.conformance.errors} error{data.conformance.errors === 1 ? '' : 'es'} y{' '}
          {data.conformance.warnings} aviso{data.conformance.warnings === 1 ? '' : 's'} de accesibilidad.
          «Plenamente conforme» exige 0 errores y 0 avisos; los avisos piden una comprobación
          manual (p. ej. subtítulos de YouTube) que el validador no puede hacer por sí solo.
        </p>
        {data.accessibility.length === 0 ? (
          <p><em>Sin hallazgos de accesibilidad.</em></p>
        ) : (
          data.accessibility.map((g) => (
            <div key={g.criterion.id}>
              <h3>{g.criterion.id} {g.criterion.name} (nivel {g.criterion.level})</h3>
              <ul className="ed-issues">
                {g.issues.map((i, idx) => <IssueItem key={idx} issue={i} />)}
              </ul>
            </div>
          ))
        )}
        <fieldset className="ed-group">
          <legend>Declaración de accesibilidad</legend>
          <p className="ed-hint">
            Genera la declaración de accesibilidad del curso (HTML imprimible: ábrelo y usa
            Imprimir → Guardar como PDF). La situación de cumplimiento se calcula con el
            validador; es una autoevaluación y no equivale a homologación ni acreditación.
          </p>
          <div className="ed-row">
            <label className="ed-field">
              <span>Entidad responsable</span>
              <input value={a11yEntity} placeholder="p. ej. Mecohisa Formación" onChange={(e) => setA11yEntity(e.target.value)} />
            </label>
            <label className="ed-field">
              <span>Contacto para comunicaciones de accesibilidad</span>
              <input value={a11yContact} placeholder="correo, teléfono o formulario" onChange={(e) => setA11yContact(e.target.value)} />
            </label>
            <label className="ed-field ed-field-narrow">
              <span>Versión del curso</span>
              <input value={a11yVersion} onChange={(e) => setA11yVersion(e.target.value)} />
            </label>
          </div>
          <button className="ed-primary" disabled={!a11yEntity.trim() || !a11yContact.trim()}
            title={!a11yEntity.trim() || !a11yContact.trim() ? 'Rellena la entidad y el contacto' : undefined}
            onClick={() => download(
              generateA11yStatementHtml(course, { entity: a11yEntity, contact: a11yContact, version: a11yVersion }),
              'declaracion-accesibilidad.html', 'text/html')}>
            Generar declaración de accesibilidad
          </button>
        </fieldset>

        <h2>7. Riesgos detectados (errores)</h2>
        {data.risks.length === 0 ? (
          <p><em>Sin errores bloqueantes.</em></p>
        ) : (
          <ul className="ed-issues">
            {data.risks.map((i, idx) => <IssueItem key={idx} issue={i} />)}
          </ul>
        )}

        <h2>8. Pendientes de validación normativa / por la entidad</h2>
        {data.pending.length === 0 ? (
          <p><em>Sin avisos.</em></p>
        ) : (
          <ul className="ed-issues">
            {data.pending.map((i, idx) => <IssueItem key={idx} issue={i} />)}
          </ul>
        )}
        <blockquote>
          <strong>Pendiente de revisión por la entidad</strong> y, en su caso, de alineación con
          criterios del SEPE o administración competente.
        </blockquote>
      </div>
    </div>
  )
}
