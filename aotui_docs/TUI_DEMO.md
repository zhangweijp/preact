## TUI 核心概念阐述及 DEMO  

### TUI的重要概念

- 去视觉化，不需要复杂的渲染引擎，这是为了渲染页面给人类看的；不需要页面和跳转，这也是为了适配人类视觉和电子屏幕所推出的概念，在TUI里和页面相呼应的概念是视图，且理论上LLM的上下文长度内，都可以用来放置视图，可以说是一片无限延展的屏幕，不要怀有一个app只展示一个页面的陈旧观念。

- 去光标化，LLM并没有手来操作鼠标，选中按钮，选中输入框，敲击键盘输入文本，所以它只能通过输入文本来操作TUI。

### Desktop

#### 概念

从Agent视角来看，Desktop 就是 Agent 的工作台，Agent 可以在 Desktop 上通过命令来操作 Applications 和 Application里的 Views 以及执行 View 内部的Operations，进而开展工作。

#### Desktop Demo

``` Agent 看到的 TUI desktop
<desktop>

## System Instruction
Here is your your TUI desktop, you can use commands to operate Applications and Views.

If you want to open a Installed Application, you can use
<context>
    open application --id $app_id;
    close application --id $app_id;
</context>
to open a installed application, application will showed in <application> tag.

If you want to open a View，你应该指定app_id，因为view是属于app的。
<context app_id="$app_id">
    mount view --id $view_id;
    dismount view --id $view_id;
</context>
to mount a view.

If you want to execute an Operation, you should specify app_id and view_id, because operation is belong to view.
<context app_id="$app_id" view_id="$view_id">
    execute operation --id $operation_id;
</context>
to execute an operation.


## Installed Applications
- [Chat](application:app_0)
    - Name: Chat
    - Description: 聊天应用
    - State: launched
- [Calendar](application:app_1)
    - Name: Calendar
    - Description: 日历应用
    - State: not launched
- [ThoughtRecorder](application:app_2)
    - Name: ThoughtRecorder
    - Description: 思路记录应用
    - State: not launched
- [MemoryManager](application:app_3)
    - Name: MemoryManager
    - Description: 内存管理应用
    - State: not launched

## System Logs
- [2025-12-14 16:09:46] User just opened the chat application.

</desktop>
```

### Application

Desktop 上安装的应用，每个 Application 里可以有多个 Views。

``` Agent 看到的 TUI application
<application id="app_0" name="chat">

<application_info>
## Operation Log
- [2025-12-14 16:09:46] User just mounted the conversations view.

## Application View Tree
- [Navigation](view:view_0, mounted)
    - [Conversations](view:view_1, mounted)
    - [Contacts](view:view_2)

</application_info>

<view id="view_0" name="navigation">

## Navigation
- [Conversations](view:view_1) // 这是一个可以 mount 的 view
    - Description: 会话列表
- [Contacts](view:view_2)
    - Description: 联系人列表

</view>

</application>
```

### View

#### 概念

view是一个可以被 mount 和 dismount 的视图。 Application本质上是一颗由 View 组成的树，类似于 React 的组件树。

开发者只需要标记出 View，Runtime会按照层序遍历为所有的 View 及其可 mount 子View 分配 view_id，从 view_0 开始。

#### View Demo

``` Agent 看到的 application
application snapshot 001:
<application id="app_0" name="chat">

<application_info>
## Operation Log
- [2025-12-14 16:09:46] User just mounted the conversations view.

## Application View Tree
- [Navigation](view:view_0, mounted)
    - [Conversations](view:view_1, mounted)
    - [Contacts](view:view_2)

</application_info>

<view id="view_0" name="navigation">

## Navigation
- [Conversations](view:view_1)
    - Description: 会话列表
- [Contacts](view:view_2)
    - Description: 联系人列表

</view>

</application>

Agent:
<context app_id="app_0">
    mount view --id view_1;
</context>


application snapshot 002:
<application id="app_0" name="chat">

<view id="view_0" name="navigation">

## Navigation
- [Conversations](view:view_1)
    - Description: 会话列表
- [Contacts](view:view_2)
    - Description: 联系人列表

</view>

<view id="view_1" name="conversations">

## Conversations
- [Johnny](view:view_3)
    - Type: Private Chat
    - Last Message: Hello
    - Unread Message Count: 1
- [TUI Tech Group](view:view_4)
    - Description: Tech support group for TUI project.
    - Type: Group Chat
    - Last Message: Who own this project?
    - Unread Message Count: 2

</view>

</application>

Agent:
<context app_id="app_0">
    mount view --id view_3;
    mount view --id view_4;
</context>

```

### List

#### 概念

List 容器用于展示列表数据，兼容 ol 和 ul 语义。

#### List  Demo

``` Agent 看到的 list
application snapshot 001:
<application id="app_0" name="chat">

<view id="view_1" name="conversations">

## Conversations
- [Johnny](view:view_3)
    - Type: Private Chat
    - Last Message: Hello
    - Unread Message Count: 1
- [TUI Tech Group](view:view_4)
    - Description: Tech support group for TUI project.
    - Type: Group Chat
    - Last Message: Who own this project?
    - Unread Message Count: 2

</view>

</application>

Agent:
<context app_id="app_0">
    mount view --id view_3;
    mount view --id view_4;
</context>

application snapshot 002:
<application id="app_0" name="chat">

<view id="view_1" name="conversations">

## Conversations
- [Johnny](view:view_3)
    - Type: Private Chat
    - Last Message: Hello
    - Unread Message Count: 1
- [TUI Tech Group](view:view_4)
    - Description: Tech support group for TUI project.
    - Type: Group Chat
    - Last Message: Who own this project?
    - Unread Message Count: 2

</view>

<view id="view_3" name="Johnny">

## Private Chat Detail

### Peer Profile
- Name: Johnny
- Email: johnny@tencent.com

### [Message History](message[]:message_history)
1. [Hello](message:message_history[0])
    - Time Stamp: 2025-12-14 16:09:46
    - Content: Hello

#### Message Operations
- [Send Message](operation:send_message)
    - Description: 发送消息
    - Parameters:
        - content: string

- [Reply Message](operation:reply_message)
    - Description: 回复消息
    - Parameters:
        - message_to_be_replied: message
        - content: string

</view>

<view id="view_4" name="TUI Tech Group">

## Group Chat Detail

### Group Profile
- Name: TUI Tech Group
- Description: Tech support group for TUI project.

### [Group Members](user[]:group_members)
- [John](user:message_history[0])
    - Role: Owner
- [Jane](user:message_history[1])
    - Role: Admin
- [Bob](user:message_history[2])
    - Role: Member

### [Message History](message[]:message_history)
1. [Hello](message:message_history[0])
    - Sender: John
    - Time Stamp: 2025-12-14 16:09:46
    - Content: Hello

2. [Who own this project?](message:message_history[1])
    - Sender: Jane
    - Time Stamp: 2025-12-14 16:09:46
    - Content: Who own this project?

#### Message Operations
- [Send Message](operation:send_message)
    - Description: 发送消息
    - Parameters:
        - content: string

- [Reply Message](operation:reply_message)
    - Description: 回复消息
    - Parameters:
        - message_to_be_replied: message
        - content: string

</view>


</application>

```

[Message History](message[]:message_history) 表明 message_history 是一个 message 列表，列表里的每一个元素都是一个 message，即可以作为reply_message的入参。

我们给出的例子也清晰的表明为什么要用view_id，会话view是具备相同的内部结构的，当Agent mount 多个 conversation 的 view 时，你会发现不同 view 存在名称相同的list:message_history 和 名称相同的 operation: reply_message, send_message；所以我们需要为 view 分配不同的 view_id，这样Agent就能区分不同的 view， 其次也能搞清楚 Agent 到底是在对那个view 执行 reply_message 操作。

<context app_id="app_0" view_id="view_3">  
    execute reply_message --message_to_be_replied message_history[0] --content "Hello";
</context>

### Operation

#### 概念

我们定义了 Operation，即 View 内部提供的操作，我们以类似函数方式封装了 View 内部所有可能的操作，包括但不限于 触发、输入并处罚等。

#### Operation Demo

- [SendMessage](operation:send_message)
  - Description: 发送消息
  - Parameters:
    - content: 消息内容

### TUI 完整 Demo

- TUI desktop snapshot 001:

``` TUI desktop snapshot 001
<desktop>

## System Instruction
Here is your your TUI desktop, you can use commands to operate Applications and Views.

If you want to open a Installed Application, you can use
<context>
    open application --id $app_id;
    close application --id $app_id;
</context>
to open a installed application, application will showed in <application> tag.

If you want to open a View，你应该指定app_id，因为view是属于app的。
<context app_id="$app_id">
    mount view --id $view_id;
    dismount view --id $view_id;
</context>
to mount a view.

If you want to execute an Operation, you should specify app_id and view_id, because operation is belong to view.
<context app_id="$app_id" view_id="$view_id">
    execute operation --id $operation_id;
</context>
to execute an operation.


## Installed Applications
- [Chat](application:app_0)
    - Name: Chat
    - Description: 聊天应用
    - State: launched
- [Calendar](application:app_1)
    - Name: Calendar
    - Description: 日历应用
    - State: not launched
- [ThoughtRecorder](application:app_2)
    - Name: ThoughtRecorder
    - Description: 思路记录应用
    - State: not launched
- [MemoryManager](application:app_3)
    - Name: MemoryManager
    - Description: 内存管理应用
    - State: not launched

## System Logs
- [2025-12-14 16:09:46] User just opened the chat application.

</desktop>

<application id="app_0" name="chat">

<info>
## Operation Log
- [2025-12-14 16:09:46] User just mounted the conversations view.

## Application View Tree
- [Navigation](view:view_0, mounted)
    - [Conversations](view:view_1, mounted)
    - [Contacts](view:view_2)

</info>

<view id="view_0" name="navigation">

## Navigation
- [Conversations](view:view_1)
    - Description: 会话列表
- [Contacts](view:view_2)
    - Description: 联系人列表

</view>

</application>

Agent:
<context app_id="app_0">
    mount view --id view_1;
</context>


application snapshot 002:
<application id="app_0" name="chat">

<view id="view_0" name="navigation">

## Navigation
- [Conversations](view:view_1)
    - Description: 会话列表
- [Contacts](view:view_2)
    - Description: 联系人列表

</view>

<view id="view_1" name="conversations">

## Conversations
- [Johnny](view:view_3)
    - Type: Private Chat
    - Last Message: Hello
    - Unread Message Count: 1
- [TUI Tech Group](view:view_4)
    - Description: Tech support group for TUI project.
    - Type: Group Chat
    - Last Message: Who own this project?
    - Unread Message Count: 2

</view>

<view id="view_1" name="conversations">

## Conversations
- [Johnny](view:view_3)
    - Type: Private Chat
    - Last Message: Hello
    - Unread Message Count: 1
- [TUI Tech Group](view:view_4)
    - Description: Tech support group for TUI project.
    - Type: Group Chat
    - Last Message: Who own this project?
    - Unread Message Count: 2

</view>

<view id="view_3" name="Johnny">

## Private Chat Detail

### Peer Profile
- Name: Johnny
- Email: johnny@tencent.com

### [Message History](message[]:message_history)
1. [Hello](message:message_history[0])
    - Time Stamp: 2025-12-14 16:09:46
    - Content: Hello

#### Message Operations
- [Send Message](operation:send_message)
    - Description: 发送消息
    - Parameters:
        - content: string

- [Reply Message](operation:reply_message)
    - Description: 回复消息
    - Parameters:
        - message_to_be_replied: message
        - content: string

</view>

<view id="view_4" name="TUI Tech Group">

## Group Chat Detail

### Group Profile
- Group Name: TUI Tech Group
- Description: Tech support group for TUI project.

### [Group Members](user[]:group_members)
- [John](user:message_history[0])
    - Role: Owner
- [Jane](user:message_history[1])
    - Role: Admin
- [Bob](user:message_history[2])
    - Role: Member

### [Message History](message[]:message_history)
1. [Hello](message:message_history[0])
    - Sender: John
    - Time Stamp: 2025-12-14 16:09:46
    - Content: Hello

2. [Who own this project?](message:message_history[1])
    - Sender: Jane
    - Time Stamp: 2025-12-14 16:09:46
    - Content: Who own this project?

#### Message Operations
- [Send Message](operation:send_message)
    - Description: 发送消息
    - Parameters:
        - content: string

- [Reply Message](operation:reply_message)
    - Description: 回复消息
    - Parameters:
        - message_to_be_replied: message
        - content: string

</view>

</application>
```

agent's response:

``` agent's response:
I am the Project Leader of TUI, have to reply the message in TUI Tech Group.
<context app_id="app_0" view_id="view_4">
    execute reply_message --message message_history[1] --content "Me."
</context>
```

### 总结

如果说 LLM 的 System Prompt 解决的是: 你是谁(who)? 你为什么而存在(why)? 你如何工作(how)? 这三个问题，那么我们的 TUI 其实部分解决了 When(现在发生的事件) 和 Where(你在何处) 这两个问题。

我们希望 LLM Agent 作为 first class user，而当前的 GUI 并不能很好的服务 LLM；因为 GUI 服务于人类的，默认使用者和人类一样具备视觉、听觉和双手触觉等人类感官；而 LLM 目前只具备人类能力的子集，即文字输入和文字输出；我的解决方案不是让 LLM 学会与 GUI 交互，而是设计一套 Agent Computer Interface / Agent Oriented Text-Based UI，让 LLM 仅仅通过文字就可以操作电脑。

让 LLM 处于一个 Text-Based 的电脑桌面之中(就像大部分在命令行下工作的程序员一样)，准实时的处理各种任务。

LLM 与人类的不同:

- LLM 没有人类视觉
  - 劣势：意味着 LLM 不能直接使用现在基于 GUI 构建的各种 Web 和 Application
  - 优势：
    - 为 LLM 构建的应用不需要复杂的 GUI 渲染逻辑
    - LLM 没有屏幕的限制，它的上下文里可以存在理论上无限多的屏幕和页面
- LLM 没有人类双手
  - 劣势：不能直接操作鼠标和键盘
  - 优势：天生具备强大的文本处理和文本输出能力，为 LLM 构建一个 Text-Based 的操作系统，那么 LLM 将极大的释放其工作潜力
- LLM 没有记忆，其记忆只存在于上下文窗口
  - 劣势：上下文窗口有限
  - 优势：灵活，开发者可以创造 LLM 的记忆，LLM 自己也可以构造自己的记忆

如何构造 TUI 视图，LLM 和 TUI 进行交互?

- 使用 xml + markdown 来划分页面内容，
  - 使用 <desktop> ## System Instructions...</desktop> 划出桌面的边界
  - 使用 <application> ## Application Views... </application> 划出应用的边界
  - 使用 <view> ## View Details </view> 划出view的边界, application 本质是一颗 view tree
- 使用 ()[] 来标记系统中的实体
  - 使用 [application_name](application:app_id) 来标记 desktop 上已经安装可以 open 的 application
  - 使用 [view_name](view:view_id) 来标记 view 内部可以被 mount 的子 view
  - 使用 [operation_name](operation:operation_id) 来标记 view 内部可以被执行的操作
  - 用户可以自定义实体，[object_name](object:object_id) 来标记 view 内部可以被引用/操作的实体
  - 用户可以自定义实体列表，[list_name](object[]:list_id) 来标记自定义实体列表，用户可以使用 list_id[i] 来选择列表内部特定元素
- Agent 输出 <context> commands </context> 来执行操作
  - 对于 applications，Agent 输出 <context>open application --id $app_id</context>
  - 对于 views，Agent 输出 <context app_id="$app_id">mount view --id $view_id</context>
  - 对于 operations，Agent 输出 <context app_id="$app_id" view_id="$view_id">execute $operation_id --args1 $args1 --args2 $args2 ...</context>
