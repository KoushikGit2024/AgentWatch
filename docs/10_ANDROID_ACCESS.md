# 10 — Android Mobile Usability Guide

**Document ID:** CW-DOC-010  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Mobile Usability & Interaction Guide  

---

## 1. Mobile-First Ergonomics & Design

AgentWatch is engineered specifically for single-handed use on modern mobile devices (e.g. Android smartphones with screen widths between 360px and 430px).

### Key Usability Enhancements:
1. **Thumb-Zone Controls:** All primary interactive elements—the `PromptComposer`, send button, and dynamic `InteractionDrawer` cards—are anchored to the bottom third of the screen.
2. **Visual Viewport Keyboard Accommodation:** Employs responsive padding and flexible flexbox layouts within `frontend/src/components/PromptComposer.jsx`:
   - When the on-screen keyboard appears, mobile viewports accommodate the input field smoothly without shifting critical navigation.
   - Preserves message drafts locally during connectivity interruptions so typed prompts are never lost.
3. **Touch Targets (44px+ Minimum):** Option pills, action chips, and mode/model selectors satisfy mobile touch guidelines with comfortable hit-targets, neutral styling, and tactile active scaling.

---

## 2. Navigating the Mobile Interface

### 2.1 The Top Navigation Bar
- **Status Indicator:** Displays a glowing green dot (`Live`) when connected to the local server, transitioning to an amber dot (`Reconnecting`) during network transitions.
- **Node & Bandwidth Counter:** Shows live DOM node counts and serialized snapshot payload sizes (e.g. `245 Nodes · 38KB`).
- **Action Buttons:**
  - 🔄 **Refresh:** Manually forces an immediate viewport and capability re-sync.
  - ⏹ **Stop:** Dispatches a halt command to active agent tasks.
  - ➕ **New Chat:** Clears the desktop conversation window for a fresh session.
  - 📋 **History:** Slides up a drawer displaying recent conversation sessions.

### 2.2 The Main Viewport
- Renders the desktop Antigravity conversation window with forced dark-mode styling.
- Tap any collapsed thought block ("Thinking...", "Thought for 15s") to expand it.
- Tap any code block copy button to copy code directly to your phone's clipboard.

### 2.3 The Dynamic Interaction Container
- Appears automatically above the prompt composer whenever the agent asks a question.
- **Single Choice:** Tap an option pill (turns indigo with a solid indicator ●).
- **Multiple Choice:** Tap multiple option pills (checkbox indicators ☑).
- **Custom Other:** Enter custom guidance in the textarea if enabled.
- **Submit:** Tap **Submit Response**. The card turns green, flashes a confirmation checkmark, and dismisses cleanly.

### 2.4 The Bottom Prompt Composer
- Type instructions or follow-ups.
- Tap the **Send** button (paper airplane icon).
- If network connection drops while sending, the input text is automatically restored so you never have to re-type instructions.
