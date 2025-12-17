# AOTUI HTML Specification

> **版本**: 0.1.0
> **状态**: Draft
> **日期**: 2025-12-17

---

## 概述

本规范定义了 AOTUI Developer SDK 的 HTML 属性语义。开发者使用标准 HTML + 语义属性编写 App UI，Runtime 的 Transformer 负责将其转换为 Agent 可理解的 TUI Markup。

**核心原则**：

1. **开发者写 HTML** - 熟悉的语法，零学习成本
2. **Runtime 生成 TUI** - 转换逻辑对开发者透明
3. **Agent 看 TUI Markup** - 优化的文本界面格式

### 自由与规范

**开发者有完全的 HTML 自由**：

- 可以使用任何标准 HTML 标签（`<h1>`~`<h6>`, `<p>`, `<section>`, `<strong>` 等）
- Transformer 自动将 HTML 转换为对应的 Markdown
- 这些标签不受 AOTUI 规范约束

**AOTUI 只规范以下语义属性**：

| 属性 | 用途 | 示例 |
|------|------|------|
| `view` | 定义视图容器 | `<div view="Chat">` |
| `list` + `item-type` | 定义数据列表 | `<ul list="messages">` |
| `operation` | 定义可执行操作 | `<button operation="send">` |
| `<param>` | 定义操作参数 | `<param name="content">` |
| `data-value` | 绑定数据到 indexMap | `<li data-value='{}'>` |

```text
┌─────────────────────────────────────────────────────────────┐
│                   Developer (Human)                          │
│               写熟悉的 HTML/JSX                              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOM (HTML)                               │
│   标准 HTML 标签 + AOTUI 语义属性 (view, list, operation)    │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Transformer (Runtime)                      │
│               HTML → TUI Markup 自动转换                     │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     Agent (LLM)                              │
│               看到优化的 TUI Markdown                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 语义元素

### 1. View - 视图容器

定义一个可 mount/dismount 的视图单元。

**HTML 语法**:

```html
<div view="ViewName">
    <!-- View 内容 -->
</div>
```

**属性**:

| 属性 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `view` | string | ✅ | View 显示名称 |

> **注意**: `view_id` 由 **Runtime 自动分配**，按 View Tree 层序遍历递增（如 `view_0`, `view_1`, `view_2`）。
> 开发者 **不需要** 也 **不应该** 手工指定 view_id。

**TUI 输出**:

```markdown
### [ViewName](view:view_0, mounted)

<!-- View 内容 -->
```

---

### 2. List - 数据列表

定义一个可索引的数据列表。

**HTML 语法**:

```html
<ul list="messages" item-type="message">
    <li data-id="msg_1" data-index="0">消息内容</li>
    <li data-id="msg_2" data-index="1">消息内容</li>
</ul>
```

**属性 (容器)**:

| 属性 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `list` | string | ✅ | 列表 ID（用于命令参数引用和 Snapshot 绑定） |
| `item-type` | string | ⚠️ | 列表项类型（默认使用 `list` 值的单数形式） |

**属性 (列表项)**:

| 属性 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `data-id` | string | ⚠️ | 项目唯一 ID |
| `data-*` | any | ⚠️ | 任意数据属性，会包含在 Snapshot 的 `indexMap` 中 |
| `data-value` | JSON | ⚠️ | 完整数据对象，存入 `indexMap` 供 Agent 引用 |

**TUI 输出**:

```markdown
### [Messages](message[]:messages)
1. [消息内容](message:messages[0])
2. [消息内容](message:messages[1])
```

---

### 与 Snapshot 的数据绑定

Runtime 的 `Transformer` 在生成 TUI 快照时，会将列表项的 `data-value` 或 `data-*` 属性存入 `IndexMap`：

```typescript
// HTML
<li data-value='{"id":"msg_1","role":"human","content":"你好"}'>...</li>

// Snapshot.indexMap 结果
{
    "messages[0]": { "id": "msg_1", "role": "human", "content": "你好" },
    "messages[1]": { "id": "msg_2", "role": "agent", "content": "好的" }
}
```

**Agent 引用数据**:

Agent 可以通过路径引用数据，Dispatcher 会自动解析：

```bash
# Agent 命令
execute reply --to messages[0]

# Dispatcher 解析后
{ "to": { "id": "msg_1", "role": "human", "content": "你好" } }
```

---

### 3. Operation - 操作按钮

定义 Agent 可执行的操作。

**HTML 语法**:

```html
<button operation="send_message">
    发送消息
    <param name="content" type="string" required="true" />
</button>
```

或使用 `<div>`:

```html
<div operation="send_message">
    发送消息
    <param name="content" type="string" required="true" />
</div>
```

**属性**:

| 属性 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `operation` | string | ✅ | 操作 ID（用于 Command routing） |

**子元素 `<param>`**:

| 属性 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 参数名 |
| `type` | string | ✅ | 参数类型 (string, number, boolean, reference) |
| `required` | "true" \| "false" | ⚠️ | 是否必需，HTML 属性值必须为字符串 |
| `default` | string | ⚠️ | 默认值 |

**TUI 输出**:

```markdown
#### Operations
- [发送消息](operation:send_message)
    - Parameters: content: string (required)
```

---

### 4. Data Value - 数据值

在列表项或其他元素上附加结构化数据。

**HTML 语法**:

```html
<li data-id="msg_1" data-role="human" data-content="你好">
    [human] 你好
</li>
```

或使用 `data-value` JSON:

```html
<li data-value='{"id":"msg_1","role":"human","content":"你好"}'>
    [human] 你好
</li>
```

**TUI 输出**:

```markdown
1. [human](message:messages[0])
    - 你好
```

**注意**: `data-value` 会被解析为 JSON 并存入 indexMap，用于 Agent 引用数据。

---

## 完整示例

### HTML (开发者写)

```html
<div view="Conversation">
    <h2>与 Alice 的对话</h2>
    
    <!-- 开发者可自由使用标准 HTML 标签，Transformer 会转为 Markdown -->
    <h3>消息历史</h3>
    
    <!-- AOTUI 语义属性：list, item-type, data-value -->
    <ul list="messages" item-type="message">
        <li data-value='{"id":"msg_1","role":"human","content":"你好，请帮我写代码"}'>
            你好，请帮我写代码
        </li>
        <li data-value='{"id":"msg_2","role":"agent","content":"好的，我来帮你！"}'>
            好的，我来帮你！
        </li>
    </ul>
    
    <!-- AOTUI 语义属性：operation, param -->
    <button operation="send_message">
        发送消息
        <param name="content" type="string" required="true" />
    </button>
    <button operation="clear_history">清空历史</button>
</div>
```

### Snapshot.indexMap (Runtime 生成)

```json
{
    "messages[0]": { "id": "msg_1", "role": "human", "content": "你好，请帮我写代码" },
    "messages[1]": { "id": "msg_2", "role": "agent", "content": "好的，我来帮你！" }
}
```

### TUI Output (Transformer 生成)

```markdown
### [Conversation](view:view_0, mounted)

## 与 Alice 的对话

### 消息历史

#### [Messages](message[]:messages)
1. [human](message:messages[0])
    - 你好，请帮我写代码
2. [agent](message:messages[1])
    - 好的，我来帮你！

#### Operations
- [发送消息](operation:send_message)
    - Parameters: content: string (required)
- [清空历史](operation:clear_history)
```

---

## JSX 组件（SDK 提供）

为了提供更好的开发体验，SDK 可以提供 JSX 组件封装：

```tsx
import { View, List, Item, Operation, Param } from '@aotui/sdk';

function ConversationView({ contact, messages }) {
    return (
        <View name={`与 ${contact.name} 的对话`} id={`conv_${contact.id}`}>
            <h2>消息历史</h2>
            
            <List name="messages" type="message">
                {messages.map(msg => (
                    <Item key={msg.id} role={msg.role}>
                        {msg.content}
                    </Item>
                ))}
            </List>
            
            <Operation name="send_message">
                发送消息
                <Param name="content" type="string" required />
            </Operation>
            
            <Operation name="clear_history">
                清空历史
            </Operation>
        </View>
    );
}
```

这些 JSX 组件会渲染为符合规范的 HTML，然后由 Transformer 转换为 TUI Markup。

---

## 与现有代码的兼容性

### 需要修改的地方

1. **SystemChatApp.buildHTML()** - 移除 TUI Markdown 语法
2. **ConversationView.render()** - 改为返回纯 HTML 或使用辅助函数
3. **Transformer** - 确保正确处理语义 HTML 属性

### 渐进式迁移

可以同时支持：

- **旧语法**: `list="message[]:messages"` (TUI 风格)
- **新语法**: `list="messages" item-type="message"` (HTML 语义)

Transformer 兼容两种写法，但推荐使用新语法。

---

## 附录：属性速查表

| HTML 属性 | 作用 | 示例 |
|-----------|------|------|
| `view="name"` | 声明 View | `<div view="Chat">` |
| `list="id"` | 声明列表 | `<ul list="messages">` |
| `item-type="type"` | 列表项类型 | `<ul list="msgs" item-type="message">` |
| `operation="id"` | 声明操作 | `<button operation="send">` |
| `data-id="id"` | 项目 ID | `<li data-id="msg_1">` |
| `data-role="role"` | 角色属性 | `<li data-role="human">` |
| `data-value="json"` | 结构化数据 | `<li data-value='{"key":"val"}'>` |
| `<param>` | 操作参数 | `<param name="x" type="string">` |
