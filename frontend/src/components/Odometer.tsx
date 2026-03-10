'use client'

import { useEffect, useRef, useState } from 'react'
import { m, useInView } from 'framer-motion'

interface Props {
  end: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}

function Digit({ value, duration }: { value: number; duration: number }) {
  return (
    <span className="inline-block overflow-hidden" style={{ height: '1em', lineHeight: 1 }}>
      <m.span
        className="inline-flex flex-col"
        initial={{ y: 0 }}
        animate={{ y: `-${value}em` }}
        transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
        style={{ lineHeight: 1 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <span key={d} className="block" style={{ height: '1em' }}>
            {d}
          </span>
        ))}
      </m.span>
    </span>
  )
}

export default function Odometer({
  end,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.6,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    if (isInView && !triggered) setTriggered(true)
  }, [isInView, triggered])

  const digits = String(end).split('')

  return (
    <span ref={ref} className={`inline-flex items-baseline tabular-nums ${className}`}>
      {prefix && <span>{prefix}</span>}
      {triggered
        ? digits.map((d, i) => (
            <Digit
              key={`${i}-${d}`}
              value={parseInt(d)}
              duration={duration + i * 0.1}
            />
          ))
        : <span>{String(end)}</span>}
      {suffix && <span>{suffix}</span>}
    </span>
  )
}
