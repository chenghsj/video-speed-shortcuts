import { cn } from '../lib/utils'
import { formatBinding, formatBindingParts } from '../shared/keys'
import type { KeyBinding } from '../shared/types'
import { Kbd, KbdGroup } from './ui/kbd'

export const KeyboardShortcut = ({
  binding,
  className,
  keyClassName,
}: {
  binding: KeyBinding
  className?: string
  keyClassName?: string
}) => (
  <KbdGroup className={className}>
    <span className="sr-only">{formatBinding(binding)}</span>
    {formatBindingParts(binding).map((part, index) => (
      <Kbd key={`${part}-${index}`} aria-hidden="true" className={cn('text-foreground', keyClassName)}>
        {part}
      </Kbd>
    ))}
  </KbdGroup>
)
