# Agent-Oriented TUI (AOTUI) Specification

> **Version**: 0.9.0
> **Status**: Planning

## 1. Core Philosophy

### 1.1 What is AOTUI?

AOTUI is a runtime standard designed to bridge **HTML5 Applications** and **Large Language Models (LLMs)**. It treats the LLM as a first-class user, providing a structured, text-based interface instead of a visual pixel-based one.

### 1.2 Why do we need it?

* **Visual Noise**: Standard HTML contains too much visual information (CSS, Layouts) irrelevant to LLMs.
* **Interaction Gap**: LLMs cannot "click" or "scroll". They need a semantic command interface.
* **State Management**: LLMs are stateless between turns. The Runtime must provide a persistent, self-describing state (HATEOAS).

### 1.3 How does it work?

The Runtime acts as a **"Headless Browser & Translator"**:

1. **Runs** standard HTML5/JS applications.
2. **Transforms** the DOM into a semantic Markdown representation for the LLM.
3. **Translates** LLM's commands into DOM Events to trigger application logic.

---

## 2. Architecture & Responsibilities

### 2.1 The Trinity Model

| Component | Role | Responsibility (What & Why) |
| :--- | :--- | :--- |
| **Application** | Content Provider | **What**: Standard Web App (HTML/JS).<br>**Why**: Leverage existing ecosystem and developer skills.<br>**How**: Uses semantic attributes (`view`, `list`, `operation`, etc.) to mark elements. |
| **Runtime** | Operating System | **What**: The Mediator.<br>**Why**: To isolate the Agent from implementation details.<br>**How**: Manages App lifecycle, transforms DOM -> Markdown, dispatches Events. |
| **Agent (LLM)** | The User | **What**: The Decision Maker.<br>**Why**: To perform tasks based on the TUI.<br>**How**: Reads Markdown, outputs Commands. |

### 2.2 Responsibility Boundaries

* **ID Generation**:
  * **Developer (Semantic)**:
    * **Operations**: Must be semantic (e.g., `send_message`) and unique within the App.
    * **Entities**: Must be semantic (e.g., `title_id`) and unique within the App. *Only required if the entity is actionable.*
  * **Runtime (Automatic)**:
    * **Views**: Assigned by Runtime (e.g., `view_001`).
    * **List Indices**: Assigned by Runtime based on DOM order (0-indexed, e.g., `user_list[0]`).
* **View Model**: **One View = One HTML Document**.
  * Each View is a self-contained HTML file (or independent DOM root).
  * Views are isolated like browser tabs/pages.
* **Data Binding**: **Stable ID Mapping**.
  * App binds its internal Stable ID to the DOM (`key`).
  * Runtime maps `list[i]` -> `key`.

---

## 3. The Developer Contract (HTML Schema)

This section defines how developers write Applications using semantic HTML attributes.

### 3.1 Views (`view`)

* **Concept**: A View corresponds to a single HTML document (or component root).
* **How**:

    ```html
    <!-- The root element of the view -->
    <body view="ConversationDetail">
      <h1>Title</h1>
    </body>
    ```

### 3.2 Lists & Items (`list`, `item`)

* **What**: A collection of entities.
* **Syntax**: TypeScript-style array syntax `type[]:id`.
* **Indexing**: **0-based** (matches programming languages).
* **How**:

    ```html
    <!-- Defines a list of 'message' type with id 'message_list' -->
    <ul list="message[]:message_list">
      <!-- App binds Data Payload via 'data-value' -->
      <!-- Runtime maps message_list[0] -> {id: "msg_101", ...} -->
      <li key="msg_101" data-value='{"id": "msg_101"}'>Hello</li>
      <li key="msg_102" data-value='{"id": "msg_102"}'>World</li>
    </ul>
    ```

### 3.3 Operations (`operation`)

* **What**: An actionable element.
* **ID**: **Developer defined**. Must be semantic (e.g., `send_message`) and unique in the App.
* **How**:

    ```html
    <button 
      operation="send_message"
      args='{"content": "string"}'
    >
      Send
    </button>
    ```

### 3.4 Entities (`entity`)

* **How**:

    ```html
    <!-- This title might be editable, so we give it an ID -->
    <h1 entity="title:conversation_title">Project TUI</h1>
    
    <!-- This description is static, no ID needed -->
    <p>Description text...</p>
    ```

### 3.5 Application Manifest (`aoapp.json`)

Every App must have an `aoapp.json` file.

```json
{
  "id": "com.example.lark",
  "name": "Lark",
  "version": "1.0.0",
  "entry": "dist/main.js",
  "system": false,
  "permissions": [
    "fs:read:/tmp", 
    "net:http:*.larksuite.com"
  ]
}
```

**Field Descriptions**:

* `id`: Unique identifier (reverse domain notation)
* `name`: Display name
* `entry`: Entry point script
* `system`: If `true`, this is a System App (auto-installed, cannot be closed)
* `permissions`: Resource access permissions

**Permission Syntax**: `resource:action[:scope]`

* `fs:read:*` (Read all files)
* `net:http:google.com` (Access specific domain)

---

## 4. The Agent Contract (Markdown Output)

This section defines what the Agent sees.

### 4.1 View Structure

```markdown
<desktop>
<!-- View 0: System Instructions & Global Commands -->
<view id="view_0", name="System Instructions">
# System Instructions
Here is your TUI computer desktop...

## System Command
- open --application <app_id>
- mount --view <view_id>
</view>

<!-- View 1: App Definitions -->
<view id="view_1", name="Applications">
# Installed Applications
- [System Chat App](application:app_1)
- [Thought Recorder](application:app_2)
</view>

<!-- View 2: Global Logs -->
<view id="view_2", name="System Logs">
1. Desktop initialized.
</view>

<!-- Active Applications -->
<application id="app_1", name="System Chat App">
    <operation_log>...</operation_log>
    
    <view id="view_001", name="ConversationDetail">
        # [Project TUI](entity:conversation_title)
        
        # [Message List](list:message_list)
        1. [Hello](item:message_list[0])
        2. [World](item:message_list[1])
        
        # Operation
        - [SendMessage](operation:send_message)
            - Arguments:
                - content: string
    </view>
</application>
</desktop>
```

---

## 5. The Interaction Contract (Command Protocol)

This section defines how the Agent acts.

### 5.1 Hybrid Command Structure

* **Outer Layer (XML)**: Defines the **Context** (Which App? Which View?).
* **Inner Layer (DSL)**: Defines the **Action** (What to do?).

### 5.2 System Commands (The OS Layer)

The Runtime provides a set of built-in commands for managing the Desktop environment.

#### Application Management

* `open --application <app_id>`: Launches an application.
* `close --application <app_id>`: Terminates an application.
* `collapse --application <app_id>`: Hides an application's views but keeps it running.
* `show --application <app_id>`: Restores a collapsed application.

#### View Management

* `mount --view <view_id>`: Renders a specific view within an active application.
* `dismount --view <view_id>`: Removes a view from the display.
* `hide --view <view_id>`: Temporarily hides a view.
* `show --view <view_id>`: Unhides a view.

### 5.3 Format & DSL Syntax

**Structure**: `<context> DSL_COMMAND </context>`

**The DSL Command**:

* **Syntax**: `execute <operation_id> [arguments...]`
* **Arguments**:
  * **Named**: `--key value` or `--key="value with spaces"`
  * **Boolean**: `--flag` (implies true)
  * **Short**: `-k value` (if supported)
* **Mapping Rule**: The Runtime converts CLI args into a JSON object based on the `args` schema defined in HTML.
  * `--content "Hi"` -> `{ content: "Hi" }`

**Example (System Command - Operating on Desktop)**:

```xml
<context>
    open --application app_1
</context>
```

**Example (View Command - Operating on specific View)**:

```xml
<context app_id="app_1" view_id="view_001">
    execute send_message --content "Hello World" --urgent
</context>
```

### 5.3 Execution Flow (The "Implicit ID" Pattern)

To solve the "State-Action Gap" (where the UI changes while the Agent is thinking), we use a **Snapshot Registry** model.

1. **Snapshot Generation**:
    * Runtime generates a Snapshot with ID `T1`.
    * Runtime saves the mapping `T1: { "list[0]": "msg_A", ... }` in its **Snapshot Registry**.
    * Runtime returns `{ markup: "...", snapshot_id: "T1" }` to the bridge.

2. **Transport (Hiding the ID)**:
    * The **Bridge/Product Layer** stores `current_snapshot_id = "T1"` in the user session.
    * The Bridge sends **ONLY** the markup to the Agent.
    * The Agent is unaware of `T1`.

3. **Command Execution**:
    * Agent sends command: `execute reply --message list[0]`.
    * Bridge intercepts, appends `snapshot_id: "T1"`.
    * Bridge calls `desktop.input.execute(command_with_id)`.

4. **Resolution (Value Injection)**:
    * Runtime looks up `T1` in registry.
    * Resolves `list[0]` -> **`{id: "msg_A"}`** (The Data Payload).
    * Injects data into execution args.

5. **Dispatch (Global/Container Dispatch)**:
    * Runtime finds the **Operation Owner** (e.g., the View Root or App Body).
    * Dispatches 'reply' event with `{ message: {id: "msg_A"} }` payload.
    * **Benefit**: Even if `msg_A` DOM element is unmounted, the Operation still runs because it targets the View Container, not the specific item.

### 5.4 Event Dispatching

The Runtime dispatches a standard `CustomEvent` to the target element.

```typescript
// Event Name: "aotui:operation"
interface TuiOperationDetail {
    operation: string; // e.g., "send_message"
    args: Record<string, any>; // e.g., { content: "Hello World", urgent: true }
    stable_keys?: string[]; // If operation targeted a list item
}
```

### 5.5 Communication Model (Stream-based)

**Core Principle**: Runtime does NOT push data to Agent. Instead, it provides **Streams** and **Pull APIs**.

#### Architecture

```text
Product Layer
    │
    ├──→ desktop.input.execute(cmd)    [Single Writer - Command Input]
    │
    └──→ desktop.output.subscribe()     [Multiple Readers - Signal Output]
         └──→ desktop.getSnapshot()     [Pull API - Read Snapshot]
```

#### Input Stream (Commands)

The `CommandInputStream` allows **single-writer** access to send commands to the Desktop.

```typescript
interface CommandInputStream {
  /**
   * Acquire exclusive ownership of the input stream
   * Throws Error if already locked by another owner
   */
  acquire(ownerId: string): void;
  
  /**
   * Execute a command and wait for acknowledgment
   * Requires: Command must include valid snapshot_id
   * @returns Promise<CommandAck> - Command completion confirmation
   */
  execute(command: Command): Promise<CommandAck>;
  
  /**
   * Release ownership
   */
  release(): void;
}

interface Command {
  app: string;
  operation: string;
  args: Record<string, any>;
  snapshot_id: string; // INJECTED BY BRIDGE, NOT AGENT
}
```

> [!CAUTION]
> **Enforced Locking**: The Runtime strictly enforces single-writer access. If `acquire()` is called when locked by `agent-A`, or `execute()` is called by `agent-B`, the Runtime will **throw an error**. This is not advisory; it is mandatory.

#### Output Stream (Signals)

The `SignalOutputStream` allows **multiple readers** to subscribe to Desktop update signals.

```typescript
interface SignalOutputStream {
  /**
   * Subscribe to update signals
   * Multiple observers can subscribe (e.g., Agent, Logger, Debugger)
   */
  subscribe(listener: (signal: UpdateSignal) => void): void;
  
  unsubscribe(listener: Function): void;
}

interface UpdateSignal {
  desktopId: string;
  timestamp: number;
  reason: 'dom_mutation' | 'app_opened' | 'app_closed';
  // NOTE: Does NOT contain snapshot data - use getSnapshot() to pull
}
```

**Key Design**: Signals are **lightweight notifications** (no data payload). Observers must actively pull snapshot data.

#### Pull API (Snapshot Retrieval)

```typescript
/**
 * Retrieve the current Markdown snapshot of a Desktop
 * Thread-safe: Multiple observers can call concurrently
 * @returns Markdown representation (read-only)
 */
function getSnapshot(desktop: Desktop): string;
```

#### Typical Flow

```typescript
// 1. Product Layer creates Desktop
const desktop = runtime.createDesktop(config);

// 2. Acquire input stream (exclusive)
desktop.input.acquire('agent-primary');

// 3. Subscribe to output signals (multiple OK)
desktop.output.subscribe(async (signal) => {
  // Observer pulls snapshot when notified
  const snapshot = getSnapshot(desktop);
  await sendToAgent(snapshot);
});

// 4. Execute command (single writer)
const ack = await desktop.input.execute({
  app: 'system.chat',
  operation: 'send_message',
  args: { content: 'Hello' }
});
```

> [!IMPORTANT]
> **Agent Serial Processing**: Agents MUST process snapshots serially. When an Agent receives an `UpdateSignal`:
>
> * If currently processing: Queue the signal, handle after current command ACK
> * If idle: Pull snapshot immediately
>
> **Rationale**: Prevents race conditions where Agent acts on stale state.
>

#### Why NOT JSON-RPC Push?

The original design had Runtime push snapshots via JSON-RPC. This violated Runtime's stateless nature:

* ❌ Runtime would need to know Agent's endpoint
* ❌ Runtime would manage communication state
* ❌ Hard to support multiple observers
* ❌ Couples Runtime to Agent architecture

With Stream-based design:

* ✅ Runtime only emits signals (no knowledge of consumers)
* ✅ Product Layer chooses transport (JSON-RPC, HTTP, local call, etc.)
* ✅ Multiple observers supported naturally
* ✅ Pull model = clearer data flow

---

## 6. Concurrency & State Management

### 6.1 Core Principle: Passive Signals, Active Pulls

**Runtime does NOT manage Event Loop or buffering.** Instead:

* Runtime emits lightweight signals when state changes
* Product Layer decides when to pull snapshots
* Product Layer handles batching/debouncing if needed

### 6.2 Internal DOM Monitoring

Runtime uses `MutationObserver` internally to detect DOM changes:

```typescript
// Internal implementation (not exposed API)
class Desktop {
  private setupDomObserver(dom: HappyDOM) {
    const observer = new MutationObserver(() => {
      this.output.emit({
        desktopId: this.id,
        timestamp: Date.now(),
        reason: 'dom_mutation'
      });
    });
    
    observer.observe(dom.window.document, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }
}
```

**Key Point**: This is an implementation detail, not a user-facing API.

### 6.3 Concurrency Safety: Snapshot Data Registry

**Problem**: Agent sees `list[0]` (Msg A). By the time Agent acts, Msg A might be scrolled out of view (unmounted).

**Solution**: **Value-Driven Execution**.
The Runtime persists the **Data Value** of list items in the Snapshot Registry.

1. **Snapshot T0**: Runtime reads `data-value` from DOM. Map `list[0]` -> `{id: "101"}`.
2. **Mutation**: Msg A is unmounted.
3. **Command**: `reply --target list[0]`.
4. **Resolution**: Runtime retrieves `{id: "101"}` from Registry.
5. **Execution**: Runtime calls `reply({id: "101"})` on the View Container.
6. **Result**: Operation succeeds because Data is preserved, even if Visuals are gone.

### 6.4 Product Layer Responsibilities

Product Layer must handle:

**Signal Debouncing** (optional):

```typescript
desktop.output.subscribe(
  debounce((signal) => {
    const snapshot = getSnapshot(desktop);
    sendToAgent(snapshot);
  }, 300)  // Wait 300ms for signal bursts
);
```

**Agent Serial Processing** (required):
See ARCHITECTURE.md Section 7.5 NOTICE 2 for detailed implementation.

---

## 7. Development Model (The "Headless Electron" Concept)

### 7.1 Runtime Environment

* **Analogy**: Think of AOTUI as **"Electron without the Pixel Rendering Layer"**.
* **Core**: It runs on **Node.js**.
* **DOM**: It uses **HappyDOM** (or similar) to provide a standard Browser API (`document`, `window`, `CustomEvent`) without a graphical window.
* **System Access**: Apps have full access to Node.js APIs (`fs`, `net`, `child_process`), allowing them to build real desktop capabilities (File Management, Terminal, System Control).

### 7.2 The "Renderer"

* **Traditional Electron**: Renders HTML/CSS to Pixels (GPU).
* **AOTUI**: Renders HTML/Data-Attributes to Markdown (Text).
* **Implication**: Developers don't write CSS. They write **Semantic HTML**. Layout is handled by the Markdown Transformer.

### 7.3 Developer Workflow

1. **Scaffold**: `npm create aoapp` (Creates a standard TypeScript/Vite project).
2. **Develop**: Write React/Vue/VanillaJS components.
    * *UI*: `<body view="...">`
    * *Logic*: `fs.readFileSync(...)`
3. **Debug**: Use the **AOTUI Inspector** (a terminal tool that shows the real-time Markdown output and Event logs).
4. **Distribute**: Package as a standard Node.js module or executable.

---

## 8. Error Handling Standards

### 8.1 Error Codes

| Code | Description | Recoverable |
| :--- | :--- | :--- |
| `E_INVALID_CMD` | Malformed XML or DSL syntax | Yes (Retry) |
| `E_NOT_FOUND` | Target App/View/Element not found | Yes (Refresh) |
| `E_PERMISSION` | App tried to access forbidden resource | No |
| `E_TIMEOUT` | Operation or Transform timed out | Yes (Retry) |
| `E_INTERNAL` | Runtime crash or bug | No |

### 8.2 Error Response (JSON-RPC)

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "E_INVALID_CMD: Syntax error in DSL",
    "data": { "recoverable": true }
  },
  "id": 1
}
```

---

## 9. Desktop Instance & Serialization

### 9.1 Core Concept: The Desktop

A **Desktop** is an isolated runtime environment containing:

* A set of running Applications
* Their mounted Views
* The ID registry mapping ephemeral indices to stable keys

**Key Principle**: The Runtime is a **stateless engine**. It creates and manages Desktop instances but does **not** persist them. Persistence is the responsibility of the **Product Layer** (the consumer of the Runtime).

### 9.2 Desktop Lifecycle

The Runtime exports independent functions (not a class or object):

```typescript
// Exported functions from @aotui/runtime

/**
 * Create a fresh, empty Desktop
 */
function createDesktop(config?: DesktopConfig): Desktop;

/**
 * Destroy a Desktop and release resources
 */
function destroyDesktop(id: string): void;

/**
 * Serialize current state (for external storage)
 */
function serialize(desktop: Desktop): DesktopState;

/**
 * Restore from serialized state
 */
function restore(state: DesktopState): Desktop;

/**
 * Get current Markdown snapshot
 */
function getSnapshot(desktop: Desktop): string;

interface DesktopConfig {
  // System apps to pre-install (e.g., ChatWithUser, ThoughtRecorder)
  systemApps?: string[];
}
```

**Usage Example:**

```typescript
import { createDesktop, serialize, getSnapshot } from '@aotui/runtime';

const desktop = createDesktop({ systemApps: ['system.chat'] });
const snapshot = getSnapshot(desktop);
const state = serialize(desktop);
```

### 9.3 Serialization: What Gets Saved

The Runtime provides a lightweight serialization interface. **The Runtime does NOT store data** — it only exports/imports state.

```typescript
// Exported by Runtime
interface DesktopState {
  id: string;
  createdAt: number;
  apps: AppState[];
}

interface AppState {
  appId: string;                    // e.g., "com.example.lark"
  status: "running" | "minimized";
  mountedViews: string[];           // e.g., ["view_001", "view_005"]
  appData?: unknown;                // App's own serialized data (provided by App)
}
```

**Data Ownership**:

| Data | Owner | Persistence |
| :--- | :--- | :--- |
| Desktop structure (which apps, which views) | Runtime | Via `serialize()` |
| App internal data (chat history, drafts, etc.) | App | App implements `serialize()`/`restore()` hooks |
| Desktop → Topic mapping | Product Layer | Product Layer's database |

### 9.4 Restoration Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Product Layer                                 │
│  1. User resumes Topic X                                         │
│  2. Lookup: Topic X → DesktopState (from product's storage)     │
│  3. Call: runtime.restore(desktopState)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TUI Runtime                                   │
│  4. Create Desktop instance                                      │
│  5. For each App in state:                                       │
│     - Load App module                                            │
│     - Call App.restore(appData) if appData exists               │
│     - Mount saved Views                                          │
│  6. Return ready Desktop                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 9.5 System Apps

System Apps are special applications that are:

* **Auto-installed** when Desktop is created
* **Cannot be closed** by the Agent
* **Must implement** serialization hooks

Examples:

* `ChatWithUser`: The conversation between Agent and User
* `ThoughtRecorder`: Agent's internal reasoning log

```json
// aoapp.json for a System App
{
  "id": "system.chat",
  "name": "ChatWithUser",
  "system": true,
  "entry": "dist/chat.js"
}
```

### 9.6 Runtime Responsibility Boundaries

| Runtime DOES | Runtime DOES NOT |
| :--- | :--- |
| Create isolated Desktop instances | Decide when to create/destroy |
| Manage App lifecycle within Desktop | Store Desktop state |
| Provide `serialize()` / `restore()` | Manage Topic/Session mapping |
| Auto-install System Apps | Implement chat UI (that's an App) |
| Enforce Desktop isolation | Handle user authentication |
