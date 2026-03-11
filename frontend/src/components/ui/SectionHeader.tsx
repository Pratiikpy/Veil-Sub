import Badge from './Badge'

interface Props {
  badge?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export default function SectionHeader({
  badge,
  title,
  subtitle,
  align = 'center',
  className = '',
}: Props) {
  return (
    <div className={`${align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
      {badge && (
        <div className={`mb-5 ${align === 'center' ? 'flex justify-center' : ''}`}>
          <Badge>{badge}</Badge>
        </div>
      )}
      <h2
        className="text-3xl sm:text-4xl font-serif italic text-white"
        style={{ letterSpacing: '-0.025em', lineHeight: 1.15 }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-white/70 max-w-xl leading-relaxed mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
}
