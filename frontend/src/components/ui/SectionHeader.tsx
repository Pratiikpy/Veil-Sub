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
        <div className={`mb-4 ${align === 'center' ? 'flex justify-center' : ''}`}>
          <Badge>{badge}</Badge>
        </div>
      )}
      <h2 className="text-3xl sm:text-4xl font-semibold text-[#fafafa] tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-[#a1a1aa] max-w-xl leading-relaxed mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  )
}
