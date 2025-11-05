import { useRef } from "react"
import { Paperclip } from "lucide-react"
import { scheduleStyles as cal } from "./ScheduleView.styles"

type ChatBarProps = {
  input: string
  setInput: (input: string) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  onFileUpload: (file: File) => Promise<void>
  isLoading: boolean
  uploading: boolean
  demoMode: boolean
  sentCount: number
  demoMaxMessages: number
  disabled?: boolean
}

export default function ChatBar({
  input,
  setInput,
  onSubmit,
  onFileUpload,
  isLoading,
  uploading,
  demoMode,
  sentCount,
  demoMaxMessages,
  disabled = false,
}: ChatBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isDisabled = disabled || (demoMode && sentCount >= demoMaxMessages)

  return (
    <div className={cal.chatBar}>
      <form className={cal.inputForm} onSubmit={onSubmit}>
        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) {
              await onFileUpload(f)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }
          }}
        />

        {/* Attach (paperclip) button */}
        <button
          type="button"
          aria-label="Upload file for agent"
          className={cal.attachBtn}
          disabled={uploading || isDisabled}
          onClick={() => fileInputRef.current?.click()}
          title={uploading ? "Uploading..." : "Attach file"}
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isDisabled
              ? "Demo allows one message."
              : "Ask to schedule, reschedule, or summarize your week…"
          }
          className={cal.input}
          disabled={isDisabled}
        />

        <button
          type="submit"
          className={cal.sendBtn}
          disabled={!input.trim() || isLoading || isDisabled}
        >
          Send
        </button>
      </form>
    </div>
  )
}
