import React from 'react'

// Extracted style constant to prevent re-renders
const DOT_GRID_STYLE = {
  backgroundImage:
    'radial-gradient(rgba(139, 92, 246, 0.2) 1px, transparent 1px)',
  backgroundSize: '30px 30px',
  maskImage:
    'radial-gradient(ellipse 50% 40% at 50% 35%, black 30%, transparent 60%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 50% 40% at 50% 35%, black 30%, transparent 60%)',
  animation: 'dot-sweep 8s linear infinite',
} as const

function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={DOT_GRID_STYLE}
    />
  )
}

export default React.memo(DotGrid)
