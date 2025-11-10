import { IconPlus } from "@tabler/icons-react"
import { ArrowUpIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import "./chatBar.css"

type ChatBarProps = {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
  placeholder?: string
  usagePercent?: number
  mode?: "auto" | "agent" | "manual"
  onModeChange?: (mode: "auto" | "agent" | "manual") => void
}

export function ChatBar({
  value = "",
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask, Search or Chat...",
  usagePercent = 0,
  mode = "auto",
  onModeChange,
}: ChatBarProps) {
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  const handleSubmit = () => {
    if (!disabled && value.trim()) {
      onSubmit?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="chat-bar-container">
      <InputGroup>
        <InputGroupTextarea
          placeholder={placeholder}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Chat input"
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            variant="outline"
            className="rounded-full"
            size="icon-xs"
            type="button"
            aria-label="Add attachment"
          >
            <IconPlus />
          </InputGroupButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton variant="ghost" type="button">
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="[--radius:0.95rem]"
            >
              <DropdownMenuItem onClick={() => onModeChange?.("auto")}>
                Auto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onModeChange?.("agent")}>
                Agent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onModeChange?.("manual")}>
                Manual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <InputGroupText className="ml-auto">
            {usagePercent}% used
          </InputGroupText>
          <Separator orientation="vertical" className="!h-4" />
          <InputGroupButton
            variant="default"
            className="rounded-full"
            size="icon-xs"
            disabled={disabled || !value.trim()}
            onClick={handleSubmit}
            type="button"
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
