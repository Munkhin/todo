# User aims:
- [ ] what to study
- [ ] when to study
- [ ] how long to study

# Current features and architecture:

## AI calendar
User braindump in schedule tab -> agent 

- [ ] if query on calendar
-> agent returns information in natural language


- [ ] if profile changes
-> profile changed -> sent to the settings tab


- [ ] if tasks
-> agent returns tasks and events -> sent to the tasks tab
-> scheduled as events -> sent to the schedule tab

## Task editing
User edit/delete tasks in task tab -> corresponding events deleted

Note: users are currrently unable to add tasks via task tab

## need to implement:
**Onboarding flow for users**:
- [ ] overlay ui on the dashboard for first time users. skip button available
- [ ] ui must be beautiful and interesting enough for the user to stay engaged
- [ ] What subjects are you studying?
- [ ] When are your upcoming tests?
on completion, send as context to the agent to generate base tasks and events
-> sent to task and calendar tabs before user sends any message to the agent

- [ ] All of the items in the preferences tab -> sent to the settings tab

**Add task in task tab**:
- [ ] an "add task button" on the top right hnad corner of the task tab
- [ ] triggers an overlay identical to the task edit sheet, but with create task as the text for the button instead of save changes
- [ ] adds a task without any child calendar events
- [ ] just like any other task container
- [ ] schedule for me button in the indented children area below
    - [ ] on click, replaced with Inline loader under task (“Finding good slots…”)
    - [ ] agent returns events -> appended to the child area below task container, events rendered in the schedule view