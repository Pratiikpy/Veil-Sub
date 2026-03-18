// Spring physics presets — use these EVERYWHERE instead of duration+ease
export const spring = {
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },    // page elements entering
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },    // buttons, toggles, quick actions
  bouncy: { type: "spring" as const, stiffness: 600, damping: 15 },    // success celebrations, badges
  heavy:  { type: "spring" as const, stiffness: 300, damping: 40 },    // modals, panels, overlays
  soft:   { type: "spring" as const, stiffness: 100, damping: 20 },    // background elements, parallax
}

// Page transition variants
export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const pageTransition = spring.gentle

// Stagger children preset
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring.gentle },
}

// Modal variants
export const modalVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
}

export const modalTransition = spring.heavy

// Backdrop
export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// Card hover
export const cardHover = {
  y: -3,
  transition: spring.gentle,
}

// Button press
export const buttonTap = {
  scale: 0.97,
  transition: spring.snappy,
}
