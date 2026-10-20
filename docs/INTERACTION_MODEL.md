# Dynamic Interaction Model

## 1. Overview

CloudWatchV2 implements a structured, dynamic interaction model to support rich agent dialogues beyond binary accept/reject buttons.

Supported interaction classes:
- **`single_choice`**: Select exactly one option among provided alternatives.
- **`multiple_choice`**: Select one or more options.
- **`free_text`**: Provide unconstrained text input.
- **`confirmation`**: Acknowledge an informational prompt or consequential action.
- **`form`**: Multi-field structured input.

## 2. Dynamic Interaction Schema

```json
{
  "interaction_id": "uuid-or-unique-string",
  "session_id": "session-uuid",
  "kind": "single_choice",
  "title": "Select approach for refactor",
  "description": "Choose between modular ES6 or React SPA",
  "options": [
    {
      "id": "opt-es6",
      "label": "Modular ES6",
      "description": "Zero build dependencies and lightweight mobile bundle",
      "is_recommended": true
    },
    {
      "id": "opt-react",
      "label": "React Vite SPA",
      "description": "Rich component framework with npm build pipeline",
      "is_recommended": false
    }
  ],
  "allow_custom_response": true,
  "custom_response_label": "Other (enter custom approach)",
  "status": "pending",
  "created_at": "2026-10-20T14:30:00Z"
}
```

## 3. Custom Response "Other" Handling

- **Enforcement:** Custom text input is only presented and accepted if `allow_custom_response: true`.
- **Backend Validation:** If a custom response is submitted when `allow_custom_response` is `false`, the API rejects the request with HTTP 400.
- **Secret Sanitization:** All incoming custom text responses pass through recursive key/value redaction before MongoDB storage.

## 4. Native IDE Security Boundary

Native Antigravity permission dialogs (e.g., executing commands or filesystem operations outside sandbox) are intentionally NOT bypassable remotely.
- The capability `remote_permission_bypass` returns status `requires_native_ide`.
- The UI shows an informational security badge directing the user to confirm consequential native approvals locally.
