# AOTUI System Design Blueprint

> **Version**: 1.0.0
> **Status**: APPROVED
> **Author**: System Architect (INTJ)

## 1. Architectural Philosophy

The AOTUI (Agent-Oriented Text User Interface) is designed as a **Deterministic State Machine** that bridges the gap between the stateless, text-based nature of LLMs and the stateful, event-driven nature of modern GUIs.

**Core Axioms:**

1. **De-visualized**: The interface is semantic data, not pixels.
2. **Value-Driven**: Operations are function calls on data, not clicks on pixels.
3. **Time-Safe**: State is snapshotted; Actions are executed against specific temporal states but resolved against current data.

---

## 2. High-Level Architecture (System Context)

The system is composed of three distinct layers with strict boundaries: the **Product Layer** (Host), the **AOTUI Runtime** (Kernel), and the **Agent** (User).

```mermaid
graph TB
    subgraph "Product Layer (Host Environment)"
        SessionMgr[Session Manager]
        Transport["Transport Adapter (HTTP/RPC)"]
        EventHub[Event Hub]
    end

    subgraph "AOTUI Runtime (The Kernel)"
        Bridge[Bridge Interface]
        
        subgraph "Core Engine"
            Kernel[Kernel Controller]
            Registry[Snapshot Registry]
        end
        
        subgraph "Desktop Environment"
            Desktop[Desktop Instance]
            DOM[LinkeDOM]
            Stream[I/O Streams]
        end
        
        Transformer["DOM -> Markdown"]
        Dispatcher["Command -> Event"]
    end

    subgraph "Agent (External)"
        LLM[Large Language Model]
    end

    %% Data Flow
    SessionMgr -->|1. Create/Restore| Bridge
    Bridge -->|2. Control| Kernel
    Kernel -->|3. Manage| Desktop
    
    %% Read Loop (Passive)
    Desktop -->|Signal| Bridge
    Bridge -->|Signal| Transport
    Transport -->|Pull Request| Bridge
    Bridge -->|Get Snapshot| Transformer
    Transformer -- Read --> DOM
    Transformer -->|Markdown| Transport
    Transport -->|Prompt| LLM
    
    %% Write Loop (Active)
    LLM -->|Command| Transport
    Transport -->|Command + SnapshotID| Bridge
    Bridge -->|Execute| Kernel
    Kernel -->|Resolve Data| Registry
    Registry -->|Data Payload| Dispatcher
    Dispatcher -->|Event| DOM
```

---

## 3. Kernel Module Design (Detailed Breakdown)

The Runtime Kernel is organized into strict functional modules.

### 3.1 Interface Layer (`bridge/`)

* **Role**: The "Air Lock" between the Kernel and the Outside World.
* **Responsibilities**:
  * **Protocol Normalization**: Converts external JSON-RPC/API calls into internal Kernel commands.
  * **Implicit ID Management**: Injects the **Active Snapshot ID** (anchored by the Session) into incoming Agent commands.
  * **Lifecycle Management**: Explicitly **Acquires** snapshots when needed and **Releases** them when a turn ends.
  * **Stream Management**: Exposes standard `stdin` (Commands) and `stdout` (Signals).
* **Boundaries**:
  * Input: Raw JSON, Session Context.
  * Output: Standardized `Command` objects, `UpdateSignal`.
  * **Flow Control (Throttling)**: Implements "Leaky Bucket" or "Debounce" strategies for `UpdateSignal` emission (e.g., max 10Hz) to prevent downstream noise. Note: Actual Snapshot generation is **Lazy** (Pull-based), so signals are cheap.

### 3.2 Core Engine Layer (`kernel/`)

* **Role**: The Orchestrator.
* **Responsibilities**:
  * **Lifecycle Management**: Creates/Destroys Desktop instances.
  * **Concurrency Control**: Enforces the **Single-Writer / Multi-Reader** lock model.
  * **Lazy Generation**: Only runs the `Transformer` when `acquireSnapshot()` is called.
  * **Resolution Logic**: Coordinates with the Registry to resolve `Path` -> `DataPayload`.
* **Components**:
  * **Snapshot Registry (`registry/`)**:
    * *Data Structure*: `Map<SnapshotID, CachedSnapshot>`.
    * *Mechanism*: **Reference Counting**.
      * `acquire()`: RefCount = 1.
      * `retain()`: RefCount++.
      * `release()`: RefCount--. If 0, Destroy.
    * *Safety*: **TTL (Time-To-Live)**. Hard expiry (e.g., 10 mins) to prevent leaks if `release()` is missed.

### 3.3 Representation Layer (`transformer/`)

* **Role**: The Renderer (DOM to Text).
* **Responsibilities**:
  * **Traversal**: Efficiently walks the LinkeDOM tree.
  * **Extraction**: Reads semantic attributes (`view`, `list`, `operation`, `data-value`).
  * **Markdown Generation**: Produces the formatted TUI output.
  * **Data Capture**: Extracts `data-value` payloads and builds the `IndexMapping` for the Registry.
* **Input**: LinkeDOM Document.
* **Output**: Markdown String + Index Map.
* **Safety & Limits (Sanitization)**:
  * **Payload Toxicity**: Strict size limit (e.g., 10KB) on `data-value` JSON.
  * **Structure Check**: Shallow parse/copy to prevent Prototype Pollution or Circular References before Registry storage.

### 3.4 Execution Layer (`dispatcher/`)

* **Role**: The Actuator (Text to Event).
* **Responsibilities**:
  * **Targeting**: Locates the `View` or `App` container for the operation.
  * **Event Construction**: Creates `CustomEvent('aotui:operation')`.
  * **Payload Injection**: Merges explicit arguments (from Agent) with resolved data (from Registry).
  * **Dispatch**: Fires the event into the DOM, handling bubbling.
* **Role**: The Actuator (Text to Event).
* **Responsibilities**:
  * **Targeting**: Locates the `View` or `App` container for the operation.
  * **Event Construction**: Creates `CustomEvent('aotui:operation')`.
  * **Payload Injection**: Merges explicit arguments (from Agent) with resolved data (from Registry).
  * **Dispatch**: Fires the event into the DOM, handling bubbling.

### 3.5 Desktop Environment (`desktop/`)

* **Role**: The Sandbox.
* **Responsibilities**:
  * **App Hosting**: Loads App bundles, acts as the "OS".
  * **Resource Management**: Manages the shared LinkeDOM instance.
  * **Isolation**: Ensures Apps cannot crash the Kernel or access unauthorized resources.
  * **Resource Governance (Watchdogs)**:
    * **Heap Limit**: Monitors LinkeDOM memory usage; force-restarts Desktop if limits (e.g., 500MB) are exceeded.
    * **CPU Quota**: Detects run-away loops (e.g., blocking event loop for >1s) and kills the offending App context.

---

## 4. Key Workflows (Sequence Diagrams)

### 4.1 Value-Driven Command Execution (The "Time Travel" Flow)

This diagram illustrates how a command issued against an old snapshot (T0) is successfully executed against the current state (T1) using Data Resolution.

```mermaid
sequenceDiagram
    participant Agent
    participant Bridge
    participant Kernel
    participant Registry
    participant Dispatcher
    participant ViewContainer as View Container (DOM)

    Note over Agent: Thinking based on T0...
    Note over ViewContainer: State changes T0 -> T1
    
    Agent->>Bridge: execute reply --message list[0]
    
    Note right of Bridge: Bridge knows Agent uses T0
    Bridge->>Kernel: execute(op="reply", target="list[0]", snap="T0")
    
    Kernel->>Registry: resolve("list[0]", "T0")
    Registry-->>Kernel: return { id: "msg_101", content: "Hi" } (DataPayload)
    
    Kernel->>Dispatcher: dispatch("reply", payload={ message: {id: "msg_101"...} })
    
    Note right of Dispatcher: Finds View (Container)
    Dispatcher->>ViewContainer: Event "aotui:operation"
    
    Note over ViewContainer: App Consumer handles event
    Note over ViewContainer: Uses msg_101 ID to call DB
    
    ViewContainer-->>Dispatcher: Success
    Dispatcher-->>Kernel: Ack
    Kernel-->>Bridge: Ack
    Bridge-->>Agent: Success
```

### 4.2 Snapshot Generation Cycle (The "Pull-Lease" Flow)

```mermaid
sequenceDiagram
    participant DOM as LinkeDOM
    participant Observer as MutationObserver
    participant Bridge hiding Agent
    participant Kernel
    participant Registry
    participant Transformer

    Note over DOM: App updates UI
    DOM->>Observer: Mutation Detected
    Observer->>Bridge: Signal (Update Available)
    
    Note right of Bridge: Bridge decides update is needed
    Bridge->>Bridge: Debounce (e.g., 300ms)
    
    Bridge->>Kernel: acquireSnapshot()
    activate Kernel
    Kernel->>Transformer: transform(dom)
    Transformer-->>Kernel: Markdown + IndexMap
    
    Kernel->>Registry: create(IndexMap) -> "T1"
    Note right of Registry: RefCount = 1
    
    Kernel-->>Bridge: { id: "T1", markup: "..." }
    deactivate Kernel
    
    Note right of Bridge: Bridge Anchors Session to T1
    Bridge->>Agent: Send Markdown (T1)
    
    Note over Bridge: Agent Thinking / Turn Complete
    
    Bridge->>Kernel: releaseSnapshot("T1")
    Kernel->>Registry: release("T1")
    Note right of Registry: RefCount = 0 -> Destroy
```

### 4.3 End-to-End Interaction (The "Hello World" Cycle)

This scenario demonstrates the full lifecycle: New Topic -> User Message -> Agent Reply.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Product as Product Layer
    participant Bridge
    participant Kernel
    participant Registry
    participant Desktop as ChatApp (DOM)
    participant Transformer
    actor Agent

    %% 1. Initialization
    User->>Product: New Topic "AOTUI Design"
    Product->>Bridge: createDesktop(system_apps=["chat"])
    Bridge->>Kernel: init()
    Kernel->>Desktop: Load "ChatApp"
    Desktop-->>Kernel: Ready
    Kernel-->>Product: desktop_id "dt_001"

    %% 2. User Sends Message
    User->>Product: Send "Hello Agent"
    Product->>Desktop: Inject "UserMessage" Event
    Note over Desktop: App Internal Logic runs<br/>Updates DOM state
    
    %% 3. Observation Cycle (Passive)
    rect rgb(240, 255, 240)
        Desktop->>Bridge: DOM Mutation Signal
        Bridge->>Bridge: Debounce
        Bridge->>Transformer: getSnapshot()
        Transformer->>Desktop: Read DOM & Data-Values
        Note right of Transformer: Map list[0] -> {id: "msg_u1", txt: "Hello"}
        Transformer->>Registry: Register Snapshot "T1"
        Transformer-->>Bridge: Markdown "## Messages..." + T1
        Bridge->>Agent: Send Snapshot T1 (Markdown)
    end

    %% 4. Agent Thinking
    Note over Agent: READS TUI:\n1. [Hello](message:list[0])\nDECIDES: Reply "Hi User"
    
    %% 5. Execution Cycle (Time Travel)
    rect rgb(255, 240, 240)
        Agent->>Bridge: execute reply_to_msg<br/>--msg list[0] --content "Hi User"
        Note right of Bridge: Inject current context: snap="T1"
        Bridge->>Kernel: execute(op="reply", args={...}, snap="T1")
        
        Kernel->>Registry: resolve("list[0]", "T1")
        Registry-->>Kernel: DataPayload {id: "msg_u1"}
        
        Kernel->>Desktop: Dispatch "reply_to_msg"<br/>{ msg: {id: "msg_u1"}, content: "Hi User" }
        Note over Desktop: Op Handler runs.<br/>Call Backend API.<br/>Update DOM.
    end

    %% 6. Feedback
    Desktop->>Bridge: DOM Mutation Signal (Reply Added)
    Bridge-->>Product: Notification
    Product->>User: Display Agent Reply
```

---

## 5. Implementation Specifications

### 5.1 Data Resolution Table

| Input (Agent Command) | Resolution Source | Resolved Output (Event Payload) |
| :--- | :--- | :--- |
| `list[i]` | **Snapshot Registry** | `DataPayload` (JSON Object) |
| `view_id` | **DOM Query** | `HTMLElement` (Container) |
| `--arg "val"` | **Command Parser** | String/Number/Boolean |
| `operation_id` | **Command Parser** | Event Name (`aotui:operation`) |

### 5.2 Error Propagation

```mermaid
stateDiagram-v2
    [*] --> Bridge: Invalid Syntax
    Bridge --> [*]: E_INVALID_CMD (400)
    
    Bridge --> Kernel: Valid Syntax
    Kernel --> Registry: Snapshot Lookup
    Registry --> Kernel: Not Found
    Kernel --> Bridge: E_STALE_STATE (409)
    Bridge --> [*]: Retry Request
    
    Kernel --> Dispatcher: Execution
    Dispatcher --> DOM: Dispatch Event
    DOM --> Dispatcher: Exception in Handler
    Dispatcher --> Kernel: E_APP_ERROR (500)
    Kernel --> Bridge: E_APP_ERROR
    Bridge --> [*]: Report to Agent
```

## 6. Review Checklist (Definition of Done)

* [ ] **Modularity**: Are `kernel` (logic) and `desktop` (environment) decoupled?
* [ ] **Isolation**: Is the user's implicit session state managed strictly in the `Bridge`?
* [ ] **Determinism**: Does the Registry guarantee consistent data resolution regardless of UI shifts?
* [ ] **Constraint**: Is the `Input Stream` strictly Single-Writer enforced?

---
*End of Design Document*
