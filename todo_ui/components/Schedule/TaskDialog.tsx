// simple textbox to display AI response messages

import "./TaskDialog.css"

export default function TaskDialog({ text }: { text: string }) {
    return (
        <div className="task-dialog-container">
            <div className="task-dialog-box">
                <p className="task-dialog-text">{text}</p>
            </div>
        </div>
    );
}