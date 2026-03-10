import React from 'react'

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Violet orb -- top right */}
      <div
        className="absolute -top-[300px] -right-[200px] w-[700px] h-[700px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 50%, transparent 70%)',
        }}
      />
      {/* White orb -- top left */}
      <div
        className="absolute -top-[200px] -left-[300px] w-[600px] h-[600px] rounded-full animate-float-delayed"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.035) 0%, transparent 70%)',
        }}
      />
      {/* Subtle violet glow -- center */}
      <div
        className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full animate-float-slow"
        style={{
          background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.04) 0%, transparent 70%)',
        }}
      />
      {/* Deep bottom ambient */}
      <div
        className="absolute top-[75%] left-1/3 w-[600px] h-[400px] rounded-full animate-float-delayed"
        style={{
          background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.03) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

export default React.memo(BackgroundOrbs)
