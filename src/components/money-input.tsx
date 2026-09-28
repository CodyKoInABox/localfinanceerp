import * as React from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  moneyFromClipboard,
  popMoneyDigit,
  pushMoneyDigit,
  currencySymbol,
} from "@/lib/money"
import { cn } from "@/lib/utils"

export function MoneyInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  onEnter,
  onPasteText,
  currency,
  invalid,
  required,
  placeholder = "0,00",
  className,
  dataQuick,
  dataField,
}: {
  id: string
  name?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onEnter?: () => void
  onPasteText?: (text: string) => boolean
  currency: string
  invalid?: boolean
  required?: boolean
  placeholder?: string
  className?: string
  dataQuick?: string
  dataField?: string
}) {
  const applied = React.useRef<string | null>(null)

  React.useEffect(() => {
    applied.current = null
  }, [value])

  function commit(next: string) {
    if (applied.current === next) {
      return
    }
    applied.current = next
    onChange(next)
  }

  function replacesAll(input: HTMLInputElement) {
    return (
      input.value.length > 0 &&
      input.selectionStart === 0 &&
      input.selectionEnd === input.value.length
    )
  }

  return (
    <InputGroup className={cn(invalid && "border-destructive", className)}>
      <InputGroupAddon>
        <span className="text-muted-foreground">
          {currencySymbol(currency)}
        </span>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        name={name ?? id}
        inputMode="numeric"
        autoComplete="off"
        required={required}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        value={value}
        data-quick={dataQuick}
        data-field={dataField}
        onChange={() => {
          // Digits are applied in keydown so the field stays in centavos.
        }}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.metaKey || event.ctrlKey || event.altKey) {
            return
          }
          const replace = replacesAll(event.currentTarget)
          if (/^\d$/.test(event.key)) {
            event.preventDefault()
            commit(pushMoneyDigit(value, event.key, replace))
            return
          }
          if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault()
            commit(replace ? "" : popMoneyDigit(value))
            return
          }
          if (event.key === "Enter" && onEnter) {
            event.preventDefault()
            onEnter()
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text")
          if (onPasteText?.(text)) {
            event.preventDefault()
            return
          }
          event.preventDefault()
          commit(moneyFromClipboard(text))
        }}
      />
    </InputGroup>
  )
}
