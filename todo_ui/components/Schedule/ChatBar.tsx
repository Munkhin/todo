// handles file uploads, user text input and sending

import React, { useRef, useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { ArrowUpIcon } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import "./ChatBar.css"

type ChatBarProps = {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (query: string, file?: File) => void
  disabled?: boolean
  placeholder?: string
  usagePercent?: number
}

export function ChatBar({
  value = "",
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask, Search or Chat...",
  usagePercent = 0,
}: ChatBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined)

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  const handleSubmit = () => {
    if (!disabled && value.trim()) {
      onSubmit?.(value, selectedFile)
      setSelectedFile(undefined)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  return (
    <div className="chat-bar-container">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-hidden="true"
      />
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
            onClick={handleFileButtonClick}
          >
            <IconPlus />
          </InputGroupButton>
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
