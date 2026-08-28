import { useEffect, useMemo, useRef, useState } from 'react'
import { toCanvas } from 'html-to-image'
import { jsPDF } from 'jspdf'
import './App.css'

const GOOGLE_FONT_IMPORT =
  'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;500;700&family=Permanent+Marker&family=Roboto+Mono:wght@400;700&family=Righteous&family=Rock+Salt&family=Shadows+Into+Light&display=swap'

const STORAGE_KEY = 'shirt-design-config-v1'

const DEFAULT_FONT_OPTIONS = [
  { label: 'Impact', value: '"Impact", "Arial Black", sans-serif' },
  { label: 'Arial Black', value: '"Arial Black", "Arial", sans-serif' },
  { label: 'Montserrat', value: '"Montserrat", sans-serif' },
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Oswald', value: '"Oswald", sans-serif' },
  { label: 'Roboto Mono', value: '"Roboto Mono", monospace' },
  { label: 'Righteous', value: '"Righteous", cursive' },
  { label: 'Anton', value: '"Anton", sans-serif' },
  { label: 'Permanent Marker', value: '"Permanent Marker", cursive' },
  { label: 'Rock Salt', value: '"Rock Salt", cursive' },
  { label: 'Shadows Into Light', value: '"Shadows Into Light", cursive' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Trebuchet', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
]

const makeRow = (overrides = {}) => ({
  id: crypto.randomUUID(),
  text: 'YOUR TEXT',
  fontFamily: DEFAULT_FONT_OPTIONS[0].value,
  fontSize: 54,
  x: 0,
  y: 180,
  color: '#111111',
  rotation: 0,
  weight: 700,
  sizeUnit: 'pt',
  ...overrides,
})

const defaultRows = () => [
  makeRow({
    text: 'type about julia here',
    y: 220,
    fontSize: 56,
  }),
]

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const isFontAvailable = (fontFamily, fonts = []) => {
  if (!fontFamily) return false
  return [...DEFAULT_FONT_OPTIONS, ...fonts].some((font) => {
    const value = typeof font === 'string' ? font : font.value
    return value === fontFamily || fontFamily.includes(value.replace(/['"]+/g, ''))
  })
}

const normalizeRowFont = (fontFamily, fonts = []) => {
  if (isFontAvailable(fontFamily, fonts)) {
    return { fontFamily, missingFontFamily: null }
  }
  return { fontFamily, missingFontFamily: fontFamily }
}

const readStoredConfig = () => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.rows)) return null
    return parsed
  } catch {
    return null
  }
}

function App() {
  const stageRef = useRef(null)
  const dragRef = useRef(null)
  const colorDragRef = useRef(null)
  const initialConfig = readStoredConfig()
  const [rows, setRows] = useState(() => {
    const saved = readStoredConfig()
    if (saved && Array.isArray(saved.rows) && saved.rows.length) {
      return saved.rows.map((row) => {
        const normalized = normalizeRowFont(row.fontFamily, saved.customFonts || [])
        return {
          ...makeRow(),
          ...row,
          id: row.id || crypto.randomUUID(),
          fontFamily: normalized.fontFamily,
          missingFontFamily: normalized.missingFontFamily,
        }
      })
    }
    return defaultRows()
  })
  const [selectedRowId, setSelectedRowId] = useState(() => {
    const saved = readStoredConfig()
    if (saved && Array.isArray(saved.rows) && saved.rows.length) {
      return saved.selectedRowId || saved.rows[saved.rows.length - 1].id || null
    }
    return defaultRows()[0].id
  })
  const [customFonts, setCustomFonts] = useState(() => (initialConfig?.customFonts ?? []))
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [downloadType, setDownloadType] = useState('png')
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [editingRowId, setEditingRowId] = useState(null)

  const selectedRow =
    rows.find((row) => row.id === selectedRowId) ?? rows[rows.length - 1] ?? null

  useEffect(() => {
    if (!selectedRowId && rows.length) {
      setSelectedRowId(rows[rows.length - 1].id)
    }
  }, [rows, selectedRowId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rows: rows.map((row) => ({
          ...row,
          fontFamily: row.missingFontFamily && isFontAvailable(row.missingFontFamily, customFonts)
            ? row.missingFontFamily
            : row.fontFamily,
          missingFontFamily: row.missingFontFamily && isFontAvailable(row.missingFontFamily, customFonts)
            ? null
            : row.missingFontFamily,
        })),
        selectedRowId,
        customFonts,
      }),
    )
  }, [rows, customFonts, selectedRowId])

  useEffect(() => {
    setRows((current) =>
      current.map((row) => {
        if (!row.missingFontFamily) return row
        if (isFontAvailable(row.missingFontFamily, customFonts)) {
          return { ...row, fontFamily: row.missingFontFamily, missingFontFamily: null }
        }
        return row
      }),
    )
  }, [customFonts])

  useEffect(() => {
    const preconnect1 = document.createElement('link')
    preconnect1.rel = 'preconnect'
    preconnect1.href = 'https://fonts.googleapis.com'
    document.head.appendChild(preconnect1)

    const preconnect2 = document.createElement('link')
    preconnect2.rel = 'preconnect'
    preconnect2.href = 'https://fonts.gstatic.com'
    preconnect2.crossOrigin = 'anonymous'
    document.head.appendChild(preconnect2)

    const fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href = GOOGLE_FONT_IMPORT
    document.head.appendChild(fontLink)

    return () => {
      document.head.removeChild(preconnect1)
      document.head.removeChild(preconnect2)
      document.head.removeChild(fontLink)
    }
  }, [])

  useEffect(() => {
    const handleMove = (event) => {
      const drag = dragRef.current
      if (!drag) return

      const deltaX = event.clientX - drag.startClientX
      const deltaY = event.clientY - drag.startClientY

      setRows((current) =>
        current.map((row) => {
          if (row.id !== drag.rowId) return row

          if (drag.mode === 'move') {
            return {
              ...row,
              x: clamp(drag.initialRow.x + deltaX, -220, 220),
              y: clamp(drag.initialRow.y + deltaY, 36, 760),
            }
          }

          if (drag.mode === 'resize') {
            return {
              ...row,
              fontSize: clamp(drag.initialRow.fontSize + deltaY * 0.9, 18, 180),
            }
          }

          return row
        }),
      )
    }

    const handleColorMove = (event) => {
      const drag = colorDragRef.current
      if (!drag || !selectedRow) return

      const target = drag.element
      const rect = target.getBoundingClientRect()

      if (drag.type === 'square') {
        const x = clamp((event.clientX - rect.left) / rect.width, 0, 1)
        const y = clamp((event.clientY - rect.top) / rect.height, 0, 1)
        const hue = x * 360
        const saturation = 100 - y * 100
        const { l } = getColorState(selectedRow.color)
        updateRow(selectedRow.id, { color: hslToHex(hue, saturation, l) })
        return
      }

      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1)
      const lightness = 100 - y * 100
      const { h, s } = getColorState(selectedRow.color)
      updateRow(selectedRow.id, { color: hslToHex(h, s, lightness) })
    }

    const handleUp = () => {
      dragRef.current = null
      colorDragRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointermove', handleColorMove)
    window.addEventListener('pointerup', handleUp)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointermove', handleColorMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [selectedRow])

  const fontOptions = useMemo(
    () => [...DEFAULT_FONT_OPTIONS, ...customFonts],
    [customFonts],
  )

  const getSelectOptionsForRow = (row) => {
    const missingOption = row.missingFontFamily && !fontOptions.some((font) => font.value === row.missingFontFamily)
      ? [{ label: row.missingFontFamily, value: row.missingFontFamily, missing: true }]
      : []
    return [...fontOptions, ...missingOption]
  }

  const updateRow = (id, patch) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  const toggleSizeUnit = (id) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, sizeUnit: row.sizeUnit === 'pt' ? 'px' : 'pt' }
          : row,
      ),
    )
  }

  const stepField = (id, key, amount, min, max) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row
        const nextValue = clamp((Number(row[key]) || 0) + amount, min, max)
        return { ...row, [key]: nextValue }
      }),
    )
  }

  const addRow = () => {
    const stageHeight = stageRef.current?.clientHeight ?? 620
    const defaultY = rows.length
      ? Math.max(...rows.map((row) => row.y + row.fontSize + 42), 180)
      : 180
    const maxCanvasY = Math.max(180, stageHeight - 110)
    const nextY = Math.min(defaultY, maxCanvasY)

    const nextRow = makeRow({
      text: 'NEW ROW',
      x: 0,
      y: nextY,
      fontSize: 48,
      fontFamily: DEFAULT_FONT_OPTIONS[0].value,
      color: '#111111',
    })

    setRows((current) => [...current, nextRow])
    setSelectedRowId(nextRow.id)
    setAdvancedOpen(false)
  }

  const deleteRow = (id) => {
    setRows((current) => {
      const next = current.filter((row) => row.id !== id)
      if (!next.length) {
        setSelectedRowId(null)
        setAdvancedOpen(false)
        return current
      }

      const nextSelected = next[next.length - 1].id
      setSelectedRowId(nextSelected)
      return next
    })
  }

  const handleFontUpload = (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    files.forEach((file) => {
      const fontName = file.name.replace(/\.[^/.]+$/, '')
      const fontUrl = URL.createObjectURL(file)
      const fontFace = new FontFace(fontName, `url(${fontUrl})`)

      fontFace
        .load()
        .then(() => {
          document.fonts.add(fontFace)
          setCustomFonts((current) => {
            const exists = current.some((entry) => entry.label === fontName)
            if (exists) return current
            return [
              ...current,
              { label: fontName, value: `"${fontName}", sans-serif` },
            ]
          })
        })
        .catch(() => {
          console.warn(`Could not load font: ${file.name}`)
        })
    })

    event.target.value = ''
  }

  const saveConfig = async () => {
    const payload = {
      version: 1,
      rows: rows.map((row) => ({
        ...row,
        fontFamily: row.missingFontFamily && isFontAvailable(row.missingFontFamily, customFonts)
          ? row.missingFontFamily
          : row.fontFamily,
        missingFontFamily: row.missingFontFamily && isFontAvailable(row.missingFontFamily, customFonts)
          ? null
          : row.missingFontFamily,
      })),
      selectedRowId,
    }

    const serialized = JSON.stringify(payload, null, 2)

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'design.fun',
          types: [{
            description: 'Fun config',
            accept: { 'application/json': ['.fun', '.json'] },
          }],
        })

        const writable = await fileHandle.createWritable()
        await writable.write(serialized)
        await writable.close()
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }

    const blob = new Blob([serialized], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'design.fun'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const loadConfig = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
            const nextRows = Array.isArray(parsed.rows)
          ? parsed.rows.map((row) => {
              const normalized = normalizeRowFont(row.fontFamily, customFonts)
              return {
                ...makeRow(),
                ...row,
                id: row.id || crypto.randomUUID(),
                fontFamily: normalized.fontFamily,
                missingFontFamily: normalized.missingFontFamily,
              }
            })
          : defaultRows()

        setRows(nextRows)
        setSelectedRowId(
          parsed.selectedRowId || nextRows[nextRows.length - 1].id || null,
        )
      } catch {
        console.warn('Could not load config file.')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const beginDrag = (event, row, mode) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedRowId(row.id)
    dragRef.current = {
      rowId: row.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialRow: { ...row },
    }
  }

  const exportImage = async (type = downloadType) => {
    const stage = stageRef.current
    if (!stage) return

    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    const stageBackground = window.getComputedStyle(stage).backgroundColor || '#f4efe9'
    const exportWidth = Math.max(1, Math.round(stage.clientWidth))
    const exportHeight = Math.max(1, Math.round(stage.clientHeight))
    const scale = Math.max(window.devicePixelRatio || 1, 2)

    let canvas
    try {
      canvas = await toCanvas(stage, {
        backgroundColor: stageBackground,
        cacheBust: true,
        height: exportHeight,
        pixelRatio: scale,
        skipAutoScale: false,
        width: exportWidth,
      })
    } catch (error) {
      console.error('Export failed:', error)
      return
    }

    if (type === 'pdf') {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [exportWidth, exportHeight],
      })
      const image = canvas.toDataURL('image/png')
      pdf.addImage(image, 'PNG', 0, 0, exportWidth, exportHeight)
      pdf.save('shirt-design.pdf')
      setDownloadMenuOpen(false)
      return
    }

    const mimeType = type === 'jpg' ? 'image/jpeg' : 'image/png'
    const link = document.createElement('a')
    link.href = canvas.toDataURL(mimeType, 0.92)
    link.download = `shirt-design.${type === 'jpg' ? 'jpg' : 'png'}`
    link.click()
    setDownloadMenuOpen(false)
  }

  const selectDownloadType = (type) => {
    setDownloadType(type)
    setDownloadMenuOpen(false)
  }

  const rgbToHex = (r, g, b) => {
    const toHex = (value) => value.toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const hexToRgb = (hex) => {
    const normalized = hex.replace('#', '')
    const full = normalized.length === 3
      ? normalized.split('').map((part) => part + part).join('')
      : normalized
    const value = Number.parseInt(full, 16)
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    }
  }

  const rgbToHsl = (r, g, b) => {
    const rr = r / 255
    const gg = g / 255
    const bb = b / 255
    const max = Math.max(rr, gg, bb)
    const min = Math.min(rr, gg, bb)
    const delta = max - min

    let h = 0
    const l = (max + min) / 2
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

    if (delta !== 0) {
      if (max === rr) h = ((gg - bb) / delta) % 6
      else if (max === gg) h = (bb - rr) / delta + 2
      else h = (rr - gg) / delta + 4
      h *= 60
      if (h < 0) h += 360
    }

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    }
  }

  const hslToRgb = (h, s, l) => {
    const normalizedHue = ((h % 360) + 360) % 360
    const hh = normalizedHue / 360
    const ss = s / 100
    const ll = l / 100

    if (ss === 0) {
      const value = Math.round(ll * 255)
      return { r: value, g: value, b: value }
    }

    const hueToRgb = (p, q, t) => {
      let tt = t
      if (tt < 0) tt += 1
      if (tt > 1) tt -= 1
      if (tt < 1 / 6) return p + (q - p) * 6 * tt
      if (tt < 1 / 2) return q
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
      return p
    }

    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
    const p = 2 * ll - q

    return {
      r: Math.round(hueToRgb(p, q, hh + 1 / 3) * 255),
      g: Math.round(hueToRgb(p, q, hh) * 255),
      b: Math.round(hueToRgb(p, q, hh - 1 / 3) * 255),
    }
  }

  const hslToHex = (h, s, l) => {
    const { r, g, b } = hslToRgb(h, s, l)
    return rgbToHex(r, g, b)
  }

  const getColorState = (hex) => {
    const { r, g, b } = hexToRgb(hex)
    const { h, s, l } = rgbToHsl(r, g, b)
    return { h, s, l }
  }

  const beginColorDrag = (event, type) => {
    if (!selectedRow) return
    event.preventDefault()
    colorDragRef.current = {
      type,
      element: event.currentTarget,
    }
  }

  const colorState = selectedRow ? getColorState(selectedRow.color) : { h: 0, s: 100, l: 50 }

  const getTextMetrics = (row) => {
    const measure = document.createElement('span')
    measure.style.position = 'absolute'
    measure.style.visibility = 'hidden'
    measure.style.pointerEvents = 'none'
    measure.style.whiteSpace = 'nowrap'
    measure.style.fontFamily = row.fontFamily
    measure.style.fontSize = `${row.fontSize}px`
    measure.style.fontWeight = row.weight
    measure.style.lineHeight = '1'
    measure.style.letterSpacing = '0px'
    measure.textContent = row.text || ' '
    document.body.appendChild(measure)
    const width = measure.getBoundingClientRect().width
    const height = measure.getBoundingClientRect().height
    document.body.removeChild(measure)
    return {
      width: Math.max(width + 12, 86),
      height: Math.max(height + 8, row.fontSize + 8),
    }
  }

  return (
    <div className="editor-page">
      <div className="editor-shell-wrap">
        <div className="editor-shell">
          <div className="controls-panel">
            <div className="rows-list">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className={`row-item ${row.id === selectedRowId ? 'active' : ''}`}
                  onClick={() => setSelectedRowId(row.id)}
                >
                  <input
                    type="text"
                    value={row.text}
                    onChange={(event) => updateRow(row.id, { text: event.target.value })}
                  />

                  <select
                    className={row.missingFontFamily ? 'missing-font-select' : ''}
                    value={row.fontFamily}
                    style={{
                      color: row.missingFontFamily ? '#b22323' : undefined,
                      borderColor: row.missingFontFamily ? '#b22323' : undefined,
                    }}
                    onChange={(event) => {
                      const fontValue = event.target.value
                      const fontMissing = !!row.missingFontFamily && fontValue === row.missingFontFamily
                      updateRow(row.id, {
                        fontFamily: fontValue,
                        missingFontFamily: fontMissing ? row.missingFontFamily : null,
                      })
                    }}
                  >
                    {getSelectOptionsForRow(row).map((font) => (
                      <option
                        key={`${font.label}-${font.value}`}
                        value={font.value}
                        style={{ color: font.missing ? '#b22323' : '#111' }}
                      >
                        {font.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="row-action gear"
                    aria-label="Open advanced settings"
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedRowId(row.id)
                      setAdvancedOpen(true)
                    }}
                  >
                    ⚙
                  </button>

                  <button
                    type="button"
                    className={`row-action delete ${rows.length === 1 ? 'disabled' : ''}`}
                    aria-label="Remove row"
                    disabled={rows.length === 1}
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteRow(row.id)
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="plus-button-wrap">
              <button type="button" className="add-row-button" onClick={addRow} aria-label="Add row">
                +
              </button>
            </div>
          </div>

          <div className="preview-panel">
          <div className="stage" ref={stageRef}>
            {rows.map((row) => (
              <div
                key={row.id}
                className={`text-layer ${row.id === selectedRowId ? 'selected' : ''} ${editingRowId === row.id ? 'is-editing' : ''}`}
                style={{
                  left: '50%',
                  top: `${row.y}px`,
                  color: row.color,
                  fontFamily: row.missingFontFamily ? DEFAULT_FONT_OPTIONS[0].value : row.fontFamily,
                  fontSize: `${row.fontSize}px`,
                  fontWeight: row.weight,
                  transform: `translate(-50%, 0) translateX(${row.x}px) rotate(${row.rotation}deg)`,
                  pointerEvents: editingRowId === row.id ? 'none' : 'auto',
                }}
                onPointerDown={(event) => {
                  if (editingRowId === row.id) return
                  beginDrag(event, row, 'move')
                }}
                onDoubleClick={() => {
                  setSelectedRowId(row.id)
                  setEditingRowId(row.id)
                }}
              >
                <span className="text-layer-text">{row.text}</span>
                <span
                  className="resize-handle"
                  onPointerDown={(event) => beginDrag(event, row, 'resize')}
                />
              </div>
            ))}

            {rows.map((row) => {
              if (editingRowId !== row.id) return null

              const metrics = getTextMetrics(row)

              return (
                <div
                  key={`${row.id}-editor`}
                  className="inline-text-editor-wrap"
                  style={{
                    left: '50%',
                    top: `${row.y}px`,
                    transform: `translate(-50%, 0) translateX(${row.x}px) rotate(${row.rotation}deg)`,
                  }}
                >
                  <input
                    className="inline-text-editor"
                    autoFocus
                    value={row.text}
                    onChange={(event) => updateRow(row.id, { text: event.target.value })}
                    onBlur={() => setEditingRowId(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    style={{
                      color: row.color,
                      fontFamily: row.missingFontFamily ? DEFAULT_FONT_OPTIONS[0].value : row.fontFamily,
                      fontSize: `${row.fontSize}px`,
                      fontWeight: row.weight,
                      width: `${metrics.width}px`,
                      minWidth: '86px',
                      height: `${metrics.height}px`,
                      caretColor: row.color,
                      borderColor: 'rgba(12, 132, 174, 0.95)',
                      background: 'transparent',
                      boxShadow: 'none',
                      borderRadius: '10px',
                      padding: '0',
                      margin: '0',
                      boxSizing: 'border-box',
                      lineHeight: '1',
                      verticalAlign: 'top',
                      whiteSpace: 'nowrap',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {advancedOpen && selectedRow && (
            <div className="advanced-popover">
              <button
                type="button"
                className="popover-close"
                aria-label="Close advanced settings"
                onClick={() => setAdvancedOpen(false)}
              >
                ×
              </button>

              <div className="popover-grid">
                <div className="field-box field-with-label">
                  <div className="field-input-wrap field-with-arrows field-with-prefix">
                    <span className="field-prefix">x:</span>
                    <input
                      type="number"
                      value={selectedRow.x}
                      onChange={(event) =>
                        updateRow(selectedRow.id, { x: Number(event.target.value) || 0 })
                      }
                    />
                    <div className="field-stepper">
                      <button type="button" onClick={() => stepField(selectedRow.id, 'x', 1, -220, 220)}>▲</button>
                      <button type="button" onClick={() => stepField(selectedRow.id, 'x', -1, -220, 220)}>▼</button>
                    </div>
                  </div>
                </div>

                <div className="field-box field-with-label">
                  <div className="field-input-wrap field-with-arrows field-with-prefix">
                    <span className="field-prefix">y:</span>
                    <input
                      type="number"
                      value={selectedRow.y}
                      onChange={(event) =>
                        updateRow(selectedRow.id, { y: Number(event.target.value) || 0 })
                      }
                    />
                    <div className="field-stepper">
                      <button type="button" onClick={() => stepField(selectedRow.id, 'y', 1, 0, 760)}>▲</button>
                      <button type="button" onClick={() => stepField(selectedRow.id, 'y', -1, 0, 760)}>▼</button>
                    </div>
                  </div>
                </div>

                <div className="field-box field-with-label">
                  <div className="field-input-wrap field-with-arrows field-with-unit">
                    <input
                      type="number"
                      min={18}
                      max={180}
                      value={selectedRow.fontSize}
                      onChange={(event) =>
                        updateRow(selectedRow.id, {
                          fontSize: clamp(Number(event.target.value) || 24, 18, 180),
                        })
                      }
                    />
                    <div className="field-stepper">
                      <button type="button" onClick={() => stepField(selectedRow.id, 'fontSize', 1, 18, 180)}>▲</button>
                      <button type="button" onClick={() => stepField(selectedRow.id, 'fontSize', -1, 18, 180)}>▼</button>
                    </div>
                    <button type="button" className="field-unit" onClick={() => toggleSizeUnit(selectedRow.id)}>
                      {selectedRow.sizeUnit || 'pt'}
                    </button>
                  </div>
                </div>

                <div className="field-box field-with-label">
                  <div className="field-input-wrap field-with-arrows field-with-degree">
                    <input
                      type="number"
                      value={selectedRow.rotation}
                      onChange={(event) =>
                        updateRow(selectedRow.id, {
                          rotation: Number(event.target.value) || 0,
                        })
                      }
                    />
                    <span className="field-degree-suffix">°</span>
                    <div className="field-stepper">
                      <button type="button" onClick={() => stepField(selectedRow.id, 'rotation', 1, -180, 180)}>▲</button>
                      <button type="button" onClick={() => stepField(selectedRow.id, 'rotation', -1, -180, 180)}>▼</button>
                    </div>
                  </div>
                </div>

                <div className="field-box color-field">
                  <div className="color-panel">
                    <div
                      className="color-square"
                      onPointerDown={(event) => beginColorDrag(event, 'square')}
                      style={{
                        background: `linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0) 100%), linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)`,
                      }}
                    >
                      <span
                        className="color-dot"
                        style={{
                          left: `${(colorState.h / 360) * 100}%`,
                          top: `${100 - Math.min(Math.max(colorState.s, 0), 100)}%`,
                        }}
                      />
                    </div>
                    <div
                      className="brightness-slider"
                      onPointerDown={(event) => beginColorDrag(event, 'brightness')}
                      style={{
                        background: `linear-gradient(to top, #000000 0%, hsl(${colorState.h} 100% 50%) 50%, #ffffff 100%)`,
                      }}
                    >
                      <span
                        className="brightness-thumb"
                        style={{ top: `${100 - Math.min(Math.max(colorState.l, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="editor-footer">
          <div className="footer-actions-left">
            <label className="upload-button">
              Upload fonts
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                multiple
                onChange={handleFontUpload}
              />
            </label>

            <button type="button" className="config-button" onClick={saveConfig}>
              Save config
            </button>

            <label className="config-button load-config-button">
              Load config
              <input type="file" accept=".fun" onChange={loadConfig} />
            </label>
          </div>

          <div className="download-split" aria-expanded={downloadMenuOpen}>
            <button
              type="button"
              className="download-primary"
              onClick={() => exportImage(downloadType)}
            >
              <span>Download</span>
            </button>

            <button
              type="button"
              className="download-trigger"
              onClick={() => setDownloadMenuOpen((open) => !open)}
              aria-label="Change export format"
            >
              <span>{downloadType}</span>
              <span className="download-caret">▾</span>
            </button>

            {downloadMenuOpen && (
              <div className="download-menu" role="menu">
                <button type="button" onClick={() => selectDownloadType('png')}>PNG</button>
                <button type="button" onClick={() => selectDownloadType('jpg')}>JPG</button>
                <button type="button" onClick={() => selectDownloadType('pdf')}>PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
