import React from 'react'

function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        backgroundImage:
          'radial-gradient(rgba(139, 92, 246, 0.15) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        maskImage:
          'radial-gradient(ellipse 60% 50% at 50% 40%, black 20%, transparent 70%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 60% 50% at 50% 40%, black 20%, transparent 70%)',
        animation: 'dot-sweep 8s linear infinite',
      }}
    />
  )
}

export default React.memo(DotGrid)
