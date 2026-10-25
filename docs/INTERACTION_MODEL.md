# Dynamic Interaction & Command Approval Model

## 1. Overview

AgentWatch implements a unified, bidirectional interaction model covering both **Agent Questions (`InteractionModal`)** and **Command / Tool Approvals (`ApprovalModal` & `ApprovalCard`)**.

Supported interaction classes:
- **`single_choice`**: Select one option among provided alternatives, or type custom instructions.
- **`multiple_choice`**: Select one or more options, optionally combined with custom instructions.
- **`free_text`**: Provide unconstrained custom instructions when no predefined options are supplied.
- **`command_approval`**: Approve (`allow`), whitelist for session (`always_allow`), reject (`deny`), or reject/approve with custom instructions (`custom_response`).

---

## 2. Dynamic Question Schema (`/api/v1/interactions`)

```json
{
  "interaction_id": "q-9f8e7d6c5b4a",
  "session_id": "session-uuid",
  "kind": "single_choice",
  "title": "Which session storage strategy should we use?",
  "description": "Select an option below or type your own custom instructions to guide the agent.",
  "options": [
    {
      "id": "opt_1",
      "label": "Redis Store (Recommended)",
      "description": "Fast in-memory TTL store",
      "is_recommended": true
    },
    {
      "id": "opt_2",
      "label": "MongoDB Collection",
      "description": "Zero new infrastructure required",
      "is_recommended": false
    }
  ],
  "allow_custom_response": true,
  "custom_response_label": "Type something else / Custom instructions",
  "status": "pending"
}
```

### How Options & "Type Something Else" Are Dispatched to Antigravity
1. **Direct DOM Option Click:** When the user selects a predefined option, `dispatch_answer_question()` in `integrations/antigravity/cdp_actions.py` first searches the active Antigravity DOM (QuickInput rows, question cards, radio/button options) and clicks the matching option directly.
2. **Composer Fallback & Custom Instructions:** If the user types custom text in **"Type something else / Custom instructions"** (or if the question card is not a clickable DOM widget), AgentWatch focuses the Antigravity input via CDP, inserts the text using native `Input.insertText`, and submits it.

---

## 3. Command & Tool Approval Schema (`/api/v1/approvals`)

```json
{
  "step_id": "turn-3-item-1",
  "request_type": "command",
  "target": "alembic upgrade head",
  "title": "Command Approval Required",
  "description": "Antigravity is waiting for your permission to execute this terminal command.",
  "command": "alembic upgrade head",
  "cwd": "/workspace/backend",
  "options": [
    { "id": "allow", "label": "Allow", "description": "Run this command once" },
    { "id": "always_allow", "label": "Always Allow", "description": "Allow similar commands in this session" },
    { "id": "deny", "label": "Deny", "description": "Reject command or provide custom instructions" }
  ],
  "allow_custom_response": true
}
```

### Precision CDP Approval Forwarding
- **Disambiguated Button Scoring:** `dispatch_forward_approval()` scores **Always Allow** (`always allow`, `always run`, `allow all`, including expanding split-button dropdown chevrons) separately from single **Allow** (`allow`, `run`, `accept`) and **Deny** (`deny`, `reject`, `cancel`).
- **Deny / Allow with Custom Instructions:** If the user enters custom instructions in `ApprovalModal` or `ApprovalCard` (e.g., *"Don't run alembic upgrade yet, generate a migration script first"*), AgentWatch clicks **Deny** (or **Allow**) in the IDE and immediately dispatches the custom instructions into the Antigravity prompt composer.
