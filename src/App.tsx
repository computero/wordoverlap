import { useEffect, useRef, useState } from 'react'
import './App.css'

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const hasVisibleCharacter = (value: string) => /\S/.test(value)

function App() {
  const [firstSentence, setFirstSentence] = useState('stone garden')
  const [secondSentence, setSecondSentence] = useState('moon')
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startOffset: number
  } | null>(null)
  const charProbeRef = useRef<HTMLSpanElement | null>(null)
  const [charWidth, setCharWidth] = useState(12)

  const firstDisplay = firstSentence.length > 0 ? firstSentence : ' '
  const secondDisplay = secondSentence.length > 0 ? secondSentence : ' '
  const firstIsLonger = firstDisplay.length >= secondDisplay.length
  const topSentence = firstIsLonger ? firstDisplay : secondDisplay
  const bottomSentence = firstIsLonger ? secondDisplay : firstDisplay
  const topSource = firstIsLonger ? 'Input 1' : 'Input 2'
  const bottomSource = firstIsLonger ? 'Input 2' : 'Input 1'
  const minOffset = 0
  const maxOffset = Math.max(0, topSentence.length - bottomSentence.length)

  const countMatchesAtOffset = (candidateOffset: number) => {
    let total = 0

    for (let topIndex = 0; topIndex < topSentence.length; topIndex += 1) {
      const bottomIndex = topIndex - candidateOffset

      if (bottomIndex < 0 || bottomIndex >= bottomSentence.length) {
        continue
      }

      const topCharacter = topSentence[topIndex]
      const bottomCharacter = bottomSentence[bottomIndex]

      if (
        hasVisibleCharacter(topCharacter) &&
        hasVisibleCharacter(bottomCharacter) &&
        topCharacter.toLowerCase() === bottomCharacter.toLowerCase()
      ) {
        total += 1
      }
    }

    return total
  }

  useEffect(() => {
    setOffset((currentOffset) => clamp(currentOffset, minOffset, maxOffset))
  }, [maxOffset, minOffset])

  useEffect(() => {
    const measureCharacterWidth = () => {
      if (!charProbeRef.current) {
        return
      }

      const nextWidth = charProbeRef.current.getBoundingClientRect().width

      if (nextWidth > 0) {
        setCharWidth(nextWidth)
      }
    }

    measureCharacterWidth()
    window.addEventListener('resize', measureCharacterWidth)

    return () => {
      window.removeEventListener('resize', measureCharacterWidth)
    }
  }, [])

  useEffect(() => {
    if (!isDragging) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current

      if (!dragState || event.pointerId !== dragState.pointerId) {
        return
      }

      const steppedDelta = Math.round(
        (event.clientX - dragState.startX) / Math.max(charWidth, 1),
      )

      setOffset(clamp(dragState.startOffset + steppedDelta, minOffset, maxOffset))
    }

    const stopDragging = (event: PointerEvent) => {
      const dragState = dragStateRef.current

      if (!dragState || event.pointerId !== dragState.pointerId) {
        return
      }

      dragStateRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [charWidth, isDragging, maxOffset, minOffset])

  const canvasStart = Math.min(0, offset)
  const canvasEnd = Math.max(topSentence.length, offset + bottomSentence.length)
  const columns = []

  for (let column = canvasStart; column < canvasEnd; column += 1) {
    const topIndex = column
    const bottomIndex = column - offset
    const topCharacter =
      topIndex >= 0 && topIndex < topSentence.length ? topSentence[topIndex] : ''
    const bottomCharacter =
      bottomIndex >= 0 && bottomIndex < bottomSentence.length
        ? bottomSentence[bottomIndex]
        : ''

    const isMatch =
      topCharacter !== '' &&
      bottomCharacter !== '' &&
      hasVisibleCharacter(topCharacter) &&
      hasVisibleCharacter(bottomCharacter) &&
      topCharacter.toLowerCase() === bottomCharacter.toLowerCase()

    columns.push({
      bottomCharacter,
      isMatch,
      key: `${column}-${topCharacter}-${bottomCharacter}`,
      topCharacter,
    })
  }

  const matchCount = columns.filter((column) => column.isMatch).length
  const totalOffsets = maxOffset - minOffset + 1
  let combosWithMatches = 0

  for (
    let candidateOffset = minOffset;
    candidateOffset <= maxOffset;
    candidateOffset += 1
  ) {
    if (countMatchesAtOffset(candidateOffset) > 0) {
      combosWithMatches += 1
    }
  }

  const combosWithNoMatches = totalOffsets - combosWithMatches
  const noMatches = matchCount === 0

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startOffset: offset,
      startX: event.clientX,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setOffset((currentOffset) => clamp(currentOffset - 1, minOffset, maxOffset))
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setOffset((currentOffset) => clamp(currentOffset + 1, minOffset, maxOffset))
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setOffset(minOffset)
    }

    if (event.key === 'End') {
      event.preventDefault()
      setOffset(maxOffset)
    }
  }

  return (
    <main className="app-shell">
      <span className="char-probe" ref={charProbeRef} aria-hidden="true">
        M
      </span>

      <section className="controls-panel">
        <label className="field">
          <span>Sentence 1</span>
          <input
            type="text"
            value={firstSentence}
            onChange={(event) => setFirstSentence(event.target.value)}
            placeholder="Type the first sentence"
          />
        </label>

        <label className="field">
          <span>Sentence 2</span>
          <input
            type="text"
            value={secondSentence}
            onChange={(event) => setSecondSentence(event.target.value)}
            placeholder="Type the second sentence"
          />
        </label>
      </section>

      <section className={`board-panel ${noMatches ? 'is-clear' : 'has-match'}`}>
        <div className="board-header">
          <p className={`match-pill ${noMatches ? 'clear' : 'alert'}`}>
            {noMatches
              ? 'No aligned matches'
              : `${matchCount} aligned ${matchCount === 1 ? 'match' : 'matches'}`}
          </p>
        </div>

        <div className="board-notes">
          <span>Top row: longer sentence from {topSource}</span>
          <span>Total offsets: {totalOffsets}</span>
          <span>Offsets with at least 1 match: {combosWithMatches}</span>
          <span>Offsets with 0 matches: {combosWithNoMatches}</span>
          <span>Bottom row: draggable sentence from {bottomSource}</span>
          <span>
            Offset: {offset} ({minOffset} to {maxOffset})
          </span>
        </div>

        <div className="sentence-strip">
          <div className="sentence-label">Longer sentence</div>
          <div className="sentence-row" aria-label="Longer sentence preview">
            {columns.map((column) => (
              <span
                key={`top-${column.key}`}
                className={`cell ${column.isMatch ? 'is-match' : ''}`}
              >
                {column.topCharacter || '\u00A0'}
              </span>
            ))}
          </div>

          <div className="sentence-label">Drag the shorter sentence</div>
          <div
            className={`sentence-row draggable-row ${isDragging ? 'is-dragging' : ''}`}
            onPointerDown={handleDragStart}
            onKeyDown={handleKeyDown}
            role="slider"
            tabIndex={0}
            aria-label="Drag the shorter sentence left or right"
            aria-valuemin={minOffset}
            aria-valuemax={maxOffset}
            aria-valuenow={offset}
          >
            {columns.map((column) => (
              <span
                key={`bottom-${column.key}`}
                className={`cell ${column.isMatch ? 'is-match' : ''}`}
              >
                {column.bottomCharacter || '\u00A0'}
              </span>
            ))}
          </div>
        </div>

        <p className="board-help">
          Drag with the mouse, or focus the lower row and use the arrow keys.
        </p>
      </section>
    </main>
  )
}

export default App
