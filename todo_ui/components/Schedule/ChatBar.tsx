    function ChatBar({ onSubmit }: { onSubmit: (text: string) => void }) {
        return (
            <div>
                <input type="text" placeholder="Ask AI..." />
                <button>Send</button>
            </div>
        );
    }