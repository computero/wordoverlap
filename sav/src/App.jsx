import { useMemo, useRef, useState } from 'react'
import { applyUserMissing, readSav } from 'datareader-spss'

const PREVIEW_ROW_LIMIT = 25

function formatCell(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return String(value)
}

function escapeCsvValue(value) {
  const text = formatCell(value)
  const escaped = text.replace(/"/g, '""')
  return /[",\n\r]/.test(text) ? `"${escaped}"` : escaped
}

function toCsvRows(rows) {
  return rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
}

function buildCsvFromSheet(sheet, limitRows = null) {
  const columns = sheet.variables.map((variable, index) => variable.name || `var_${index + 1}`)
  const rows = limitRows === null ? sheet.rows : sheet.rows.slice(0, limitRows)
  const lines = [columns.map(escapeCsvValue).join(',')]

  for (const row of rows) {
    lines.push(columns.map((_, index) => escapeCsvValue(row[index])).join(','))
  }

  return lines.join('\n')
}

function describeMissing(missing) {
  if (!missing || missing.kind === 'none') return 'none'

  if (missing.kind === 'discrete') return `discrete: ${missing.values.join(', ')}`
  if (missing.kind === 'range') return `range: ${missing.lo} to ${missing.hi}`
  if (missing.kind === 'range+discrete') return `range: ${missing.lo} to ${missing.hi}; plus ${missing.value}`
  if (missing.kind === 'strings') return `strings: ${missing.values.join(', ')}`

  return 'unknown'
}

function summarizeValueLabels(variable) {
  if (!variable.valueLabels || variable.valueLabels.length === 0) return ''
  return variable.valueLabels
    .slice(0, 5)
    .map(({ value, label }) => `${formatCell(value)}=${label}`)
    .join('; ')
}

function buildMetadataCsv(sheet) {
  const summaryRows = [
    ['dataset_name', sheet.name],
    ['row_count', String(sheet.rows.length)],
    ['column_count', String(sheet.variables.length)],
    ['encoding', sheet.encoding || 'unknown'],
    ['converted_in_browser', 'true'],
    [],
    ['variable', 'type', 'label', 'missing', 'measure', 'value_labels'],
  ]

  const variableRows = sheet.variables.map((variable, index) => [
    variable.name || `var_${index + 1}`,
    variable.type,
    variable.label || '',
    describeMissing(variable.missing),
    variable.measure || 'unknown',
    summarizeValueLabels(variable),
  ])

  return toCsvRows([...summaryRows, ...variableRows]).join('\n')
}

function downloadText(filename, content, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function App() {
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [parsedSheet, setParsedSheet] = useState(null)
  const [status, setStatus] = useState('No file selected yet.')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('data')
  const [fileLoaded, setFileLoaded] = useState(false)

  const dataColumns = useMemo(() => {
    if (!parsedSheet) return []
    return parsedSheet.variables.map((variable, index) => variable.name || `var_${index + 1}`)
  }, [parsedSheet])

  const dataRows = useMemo(() => {
    if (!parsedSheet) return []

    return parsedSheet.rows.slice(0, PREVIEW_ROW_LIMIT).map((row, rowIndex) => {
      const record = {}
      parsedSheet.variables.forEach((variable, columnIndex) => {
        const key = variable.name || `var_${columnIndex + 1}`
        record[key] = formatCell(row[columnIndex])
      })
      return { ...record, __row: `row_${rowIndex + 1}` }
    })
  }, [parsedSheet])

  const metadataRows = useMemo(() => {
    if (!parsedSheet) return []

    return parsedSheet.variables.map((variable, index) => ({
      variable: variable.name || `var_${index + 1}`,
      type: variable.type,
      label: variable.label || '',
      missing: describeMissing(variable.missing),
      measure: variable.measure || 'unknown',
      value_labels: summarizeValueLabels(variable),
    }))
  }, [parsedSheet])

  const csvPreviewText = useMemo(() => {
    if (!parsedSheet) return ''
    return buildCsvFromSheet(parsedSheet, 50)
  }, [parsedSheet])

  const metadataPreviewText = useMemo(() => {
    if (!parsedSheet) return ''
    return buildMetadataCsv(parsedSheet)
  }, [parsedSheet])

  const renderTable = (columns, rows) => {
    if (!rows.length) {
      return (
        <div className="preview-empty">
          <strong>No data yet.</strong>
          <span>Upload a .sav file to generate a preview.</span>
        </div>
      )
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={`${column}-${rowIndex}`}>{row[column] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isSav = /\.(sav|zsav)$/i.test(file.name) || file.type === 'application/octet-stream'
    if (!isSav) {
      setError('This preview expects a .sav or .zsav file.')
      setStatus('Unsupported file type.')
      setFileLoaded(false)
      setParsedSheet(null)
      setFileName('')
      event.target.value = ''
      return
    }

    try {
      setError('')
      setStatus('Reading file and parsing SPSS metadata…')
      setFileName(file.name)
      setFileLoaded(false)
      setParsedSheet(null)

      const arrayBuffer = await file.arrayBuffer()
      const parsed = await readSav(arrayBuffer)
      const sheet = applyUserMissing(parsed.sheets[0])

      setParsedSheet(sheet)
      setFileLoaded(true)
      setStatus(`Parsed ${sheet.rows.length.toLocaleString()} rows × ${sheet.variables.length.toLocaleString()} columns from ${file.name}.`)
      setActiveTab('data')
    } catch (uploadError) {
      console.error(uploadError)
      setError(`Unable to read this file as SPSS data: ${uploadError.message || 'unknown parse error'}`)
      setStatus('File rejected during parsing.')
      setFileLoaded(false)
      setParsedSheet(null)
      setFileName('')
    } finally {
      event.target.value = ''
    }
  }

  const handleDownloadCsv = () => {
    if (!parsedSheet) return
    downloadText('converted-data.csv', buildCsvFromSheet(parsedSheet))
  }

  const handleDownloadMetadata = () => {
    if (!parsedSheet) return
    downloadText('sav-metadata.csv', buildMetadataCsv(parsedSheet))
  }

  return (
    <div className="sav-page-shell">
      <div className="sav-page">
        <header className="sav-header">
          <div>
            <p className="eyebrow">Data conversion</p>
            <h1>SAV to CSV + metadata</h1>
          </div>

          <button type="button" className="ghost-button" onClick={() => inputRef.current?.click()}>
            Upload .sav
          </button>
          <input ref={inputRef} type="file" accept=".sav,.zsav" hidden onChange={handleFileUpload} />
        </header>

        <section className="preview-card">
          <div className="preview-header-row">
            <div>
              <h2>Data preview</h2>
              <p>{fileName ? fileName : 'Nothing loaded yet'}</p>
            </div>

            {fileLoaded && (
              <div className="preview-actions">
                <button type="button" className="download-button" onClick={handleDownloadCsv}>
                  Download CSV
                </button>
                <button type="button" className="download-button secondary" onClick={handleDownloadMetadata}>
                  Download metadata
                </button>
              </div>
            )}
          </div>

          <div className="tab-row">
            <button type="button" className={activeTab === 'data' ? 'tab active' : 'tab'} onClick={() => setActiveTab('data')}>
              Data
            </button>
            <button type="button" className={activeTab === 'metadata' ? 'tab active' : 'tab'} onClick={() => setActiveTab('metadata')}>
              Metadata
            </button>
          </div>

          <div className="preview-surface">
            {!fileLoaded ? (
              <div className="preview-empty large">
                <strong>Upload a .sav file</strong>
                <span>The preview will appear here automatically.</span>
              </div>
            ) : activeTab === 'data' ? (
              renderTable(dataColumns, dataRows)
            ) : (
              renderTable(['variable', 'type', 'label', 'missing', 'measure', 'value_labels'], metadataRows)
            )}
          </div>
        </section>

        <section className="faq-box">
          <h3>SPSS .SAV to CSV Conversion FAQ</h3>

          <div className="faq-item">
            <h4>Why are there 2 files?</h4>
            <p>
              The CSV contains the raw rows and columns that most tools can read. The metadata export keeps the
              variable-level information that SPSS stores separately, such as labels, missing-value codes, and field
              descriptions. Without that second file, the spreadsheet is only raw numbers and text.
            </p>
          </div>

          <div className="faq-item">
            <h4>What is missing from the CSV?</h4>
            <p>
              The CSV usually drops value labels (for example, 1 = Male), custom missing-value rules, variable labels,
              original data types, and any dataset notes or analysis settings that are attached to the SPSS file. That
              is why a CSV is easy to share, but not always enough to reproduce a full statistical workflow.
            </p>
          </div>

          <div className="faq-item">
            <h4>How do I get that metadata into R Studio?</h4>
            <p>
              In R, you can import the CSV as the raw data table and then use a metadata file or codebook to map labels,
              recode values, and restore missing-value rules. Tools like R packages for labelled data or a custom import
              script are often the best way to reconstruct the original analysis structure without losing meaning.
            </p>
          </div>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <div className="status-row">
          <span>{status}</span>
        </div>

        {fileLoaded && (
          <div className="outputs-grid">
            <div className="output-card">
              <div className="output-header">
                <h4>CSV output</h4>
                <button className="download-button" type="button" onClick={handleDownloadCsv}>
                  Download
                </button>
              </div>
              <pre>{csvPreviewText}</pre>
            </div>

            <div className="output-card">
              <div className="output-header">
                <h4>Metadata output</h4>
                <button className="download-button secondary" type="button" onClick={handleDownloadMetadata}>
                  Download
                </button>
              </div>
              <pre>{metadataPreviewText}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
