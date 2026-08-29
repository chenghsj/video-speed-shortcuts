import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../lib/utils'

type PopupSelectOption = {
  value: string
  label: string
}

export const PopupSelect = ({
  ariaLabel,
  ariaLabelledBy,
  value,
  options,
  onValueChange,
}: {
  ariaLabel?: string
  ariaLabelledBy?: string
  value: string
  options: readonly PopupSelectOption[]
  onValueChange: (value: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex(option => option.value === value))
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selectedOption = options.find(option => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown, true)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown, true)
  }, [open])

  const openListbox = () => {
    setActiveIndex(Math.max(0, options.findIndex(option => option.value === value)))
    setOpen(true)
  }

  const selectActiveOption = () => {
    const option = options[activeIndex]
    if (option && option.value !== value) onValueChange(option.value)
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        openListbox()
      }
      return
    }

    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false)
      if (event.key === 'Escape') event.preventDefault()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(current => (current + direction + options.length) % options.length)
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectActiveOption()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-slot="select-trigger"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        className="flex h-8 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
        onClick={() => (open ? setOpen(false) : openListbox())}
        onKeyDown={handleKeyDown}
      >
        <span className="line-clamp-1">{selectedOption?.label}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className="absolute bottom-full left-0 z-50 mb-1 max-h-56 w-full min-w-[8rem] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((option, index) => (
            <div
              id={`${listboxId}-${index}`}
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={cn(
                'relative flex cursor-default select-none items-center rounded-sm py-1 pl-7 pr-2 text-sm outline-none',
                index === activeIndex && 'bg-accent text-accent-foreground'
              )}
              onPointerMove={() => setActiveIndex(index)}
              onPointerDown={event => event.preventDefault()}
              onClick={() => {
                if (option.value !== value) onValueChange(option.value)
                setOpen(false)
              }}
            >
              <span className="absolute left-2 flex size-3.5 items-center justify-center">
                {option.value === value && <Check aria-hidden="true" className="size-4" />}
              </span>
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
