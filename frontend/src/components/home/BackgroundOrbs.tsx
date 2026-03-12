import React from 'react'

// Extracted gradient constants to prevent re-renders
const ORB_VIOLET_STYLE = {
  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.04) 0%, rgba(139, 92, 246, 0.01) 50%, transparent 70%)',
} as const

const ORB_WHITE_STYLE = {
  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.018) 0%, transparent 70%)',
} as const

const ORB_GLOW_CENTER_STYLE = {
  background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.04) 0%, transparent 70%)',
} as const

const ORB_GLOW_BOTTOM_STYLE = {
  background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.03) 0%, transparent 70%)',
} as const

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Violet orb -- top right (responsive: 350px on mobile, 700px on sm+) */}
      <div
        className="absolute -top-[150px] sm:-top-[300px] -right-[100px] sm:-right-[200px] w-[350px] sm:w-[700px] h-[350px] sm:h-[700px] rounded-full animate-float"
        style={ORB_VIOLET_STYLE}
      />
      {/* White orb -- top left (responsive) */}
      <div
        className="absolute -top-[100px] sm:-top-[200px] -left-[150px] sm:-left-[300px] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full animate-float-delayed"
        style={ORB_WHITE_STYLE}
      />
      {/* Subtle violet glow -- center (responsive) */}
      <div
        className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[450px] sm:w-[900px] h-[250px] sm:h-[500px] rounded-full animate-float-slow"
        style={ORB_GLOW_CENTER_STYLE}
      />
      {/* Deep bottom ambient (responsive) */}
      <div
        className="absolute top-[75%] left-1/3 w-[300px] sm:w-[600px] h-[200px] sm:h-[400px] rounded-full animate-float-delayed"
        style={ORB_GLOW_BOTTOM_STYLE}
      />
    </div>
  )
}

export default React.memo(BackgroundOrbs)
