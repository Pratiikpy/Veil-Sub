import { useEffect, useCallback, type RefObject } from 'react'

/**
 * Implements roving tabindex for ARIA radiogroup containers.
 * Arrow keys move focus between [role="radio"] children; wraps at ends.
 * The currently selected radio gets tabIndex 0; all others get -1.
 */
export function useRovingTabIndex(containerRef: RefObject<HTMLElement | null>) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const container = containerRef.current
      if (!container) return

      const radios = Array.from(
        container.querySelectorAll<HTMLElement>('[role="radio"]')
      )
      if (radios.length === 0) return

      const currentIndex = radios.indexOf(document.activeElement as HTMLElement)
      if (currentIndex === -1) return

      let nextIndex: number

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % radios.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + radios.length) % radios.length
          break
        default:
          return
      }

      // Guard against out-of-bounds access (should never happen but defensive)
      if (nextIndex < 0 || nextIndex >= radios.length) return

      e.preventDefault()
      radios[currentIndex].setAttribute('tabindex', '-1')
      radios[nextIndex].setAttribute('tabindex', '0')
      radios[nextIndex].focus()
      radios[nextIndex].click()
    },
    [containerRef]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, handleKeyDown])
}
