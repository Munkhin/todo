run codex resume session_id to resume session

## backend/logic
019a90ab-f979-7be1-8375-ac5c3bb3a898: api call error in agent chat

## UI
019a8bf1-9f6b-75c2-8291-9c355e0634d7: debug api call and added change plan buttons in subscription tab
019a9011-ba9b-7a70-a27e-4cd180e87be0: width fixes for tab content

## Features
019a8c25-c6f4-77d0-bc6a-9e9886338fa3: task editing in task tab
019a8c2a-437d-7042-bf93-32a1cba05622: implemented feedback tab


## Misc

curl -v -H "Content-Type: application/json" -d '{"text":"Please schedule two study sessions for biology and chemistry.","user_id":"42","file":null}' https://todo-fufa.onrender.com/api/chat/