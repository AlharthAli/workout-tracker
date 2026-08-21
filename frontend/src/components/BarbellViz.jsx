// Greedy plate calculator + SVG barbell visualization

const PLATE_ORDER = [45, 35, 25, 10, 5, 2.5]

const PLATE_STYLE = {
  45:  { h: 74, w: 13, color: '#C1442D', stroke: '#8B2E1E' },
  35:  { h: 62, w: 11, color: '#B08D57', stroke: '#7A5E2F' },
  25:  { h: 52, w: 9,  color: '#4A7A3F', stroke: '#2E5228' },
  10:  { h: 42, w: 8,  color: '#3A6B8A', stroke: '#244560' },
  5:   { h: 33, w: 6,  color: '#7C766A', stroke: '#4A4540' },
  2.5: { h: 26, w: 5,  color: '#4A4540', stroke: '#2C2A27' },
}

function calcSidePlates(targetWeight) {
  const BAR = 45
  let rem = Math.max(0, (targetWeight - BAR) / 2)
  const plates = []
  for (const p of PLATE_ORDER) {
    const n = Math.floor(rem / p + 1e-6)
    for (let i = 0; i < n; i++) plates.push(p)
    rem = Math.round((rem - n * p) * 100) / 100
  }
  return plates
}

function makeCaption(plates) {
  if (!plates.length) return 'Just the bar — 45 lb'
  const groups = {}
  for (const p of plates) groups[p] = (groups[p] || 0) + 1
  const parts = Object.entries(groups).map(([w, c]) => `${c}×${w}`)
  return `Load each side: ${parts.join(', ')}`
}

export default function BarbellViz({ targetWeight }) {
  const W = 480
  const H = 96
  const CY = 46          // bar vertical center
  const BAR_H = 8
  const BAR_COLOR = '#5A5550'
  const COLLAR_COLOR = '#3A3630'
  const SLEEVE_IN = 120  // inner edge of each sleeve (plates go outward from here)

  const sidePlates = calcSidePlates(targetWeight || 0)
  const caption = makeCaption(sidePlates)

  // Build rects left-to-right (innermost plate first, going outward)
  let lx = SLEEVE_IN
  const leftRects = sidePlates.map((p, i) => {
    const s = PLATE_STYLE[p]
    lx -= s.w
    return <rect key={`l${i}`} x={lx} y={CY - s.h / 2} width={s.w} height={s.h} fill={s.color} stroke={s.stroke} strokeWidth="0.5" rx={1.5} />
  })

  let rx = W - SLEEVE_IN
  const rightRects = sidePlates.map((p, i) => {
    const s = PLATE_STYLE[p]
    const x = rx
    rx += s.w
    return <rect key={`r${i}`} x={x} y={CY - s.h / 2} width={s.w} height={s.h} fill={s.color} stroke={s.stroke} strokeWidth="0.5" rx={1.5} />
  })

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={`Barbell: ${caption}`}
      >
        {/* Main bar */}
        <rect x={0} y={CY - BAR_H / 2} width={W} height={BAR_H} fill={BAR_COLOR} rx={3} />

        {/* Knurl zone (center, slightly darker band) */}
        <rect x={W / 2 - 28} y={CY - BAR_H / 2} width={56} height={BAR_H} fill="#3A3530" rx={0} />

        {/* Left collar */}
        <rect x={SLEEVE_IN - 9} y={CY - 16} width={9} height={32} fill={COLLAR_COLOR} rx={2} />
        {/* Right collar */}
        <rect x={W - SLEEVE_IN} y={CY - 16} width={9} height={32} fill={COLLAR_COLOR} rx={2} />

        {/* Left end cap */}
        <rect x={0} y={CY - 12} width={12} height={24} fill={COLLAR_COLOR} rx={2} />
        {/* Right end cap */}
        <rect x={W - 12} y={CY - 12} width={12} height={24} fill={COLLAR_COLOR} rx={2} />

        {/* Plates */}
        {leftRects}
        {rightRects}
      </svg>

      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px',
        color: 'var(--muted)',
        textAlign: 'center',
        marginTop: '10px',
        letterSpacing: '0.02em',
      }}>
        {caption}
      </p>
    </div>
  )
}
