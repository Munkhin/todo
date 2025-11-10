// header for calendar
// contains weekly/monthly toggle

function CalendarHeader() {
    return (
        <div>
            <h2>Schedule</h2>
            <ViewToggle />
        </div>
    );
}

function ViewToggle() {
    return (
        <div>
            <button onClick={() => setView('weekly')}>Weekly</button>
            <button onClick={() => setView('daily')}>Daily</button>
        </div>
    );
}