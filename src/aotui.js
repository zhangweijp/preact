
import { createElement as h } from './create-element.js';

/**
 * AOTUI SDK for Preact
 * Provides semantic components for building Agent-Oriented TUI apps.
 */

// View Container
// Usage: <View name="Conversations">...</View>
// Output: <div view="Conversations">...</div>
export function View({ name, children, ...props }) {
    return h('div', { view: name, ...props }, children);
}

// Data List
// Usage: <List name="messages" type="message">...</List>
// Output: <ul list="messages" item-type="message">...</ul>
export function List({ name, type, children, ...props }) {
    // Default to 'ul', but allow overriding via 'as' prop if needed (e.g. ol)
    const Component = props.as || 'ul';
    return h(Component, { list: name, 'item-type': type, ...props }, children);
}

// List Item
// Usage: <Item key={msg.id} data={msg} ...>Content</Item>
// Output: <li key="msg_1" data-value='{...}'>Content</li>
// Note: 'key' is handled by Preact Core Patch to become an attribute.
export function Item({ data, children, ...props }) {
    // Automatically serialize data to data-value if provided
    const dataAttrs = {};
    if (data) {
        dataAttrs['data-value'] = JSON.stringify(data);
    }

    return h('li', { ...dataAttrs, ...props }, children);
}

// Operation Definition
// Usage: <Operation name="send_message">...</Operation>
// Output: <button operation="send_message">...</button>
export function Operation({ name, children, ...props }) {
    // Spec allows <div> or <button>. Defaulting to <button> for semantics.
    const Component = props.as || 'button';
    return h(Component, { operation: name, ...props }, children);
}

// Operation Parameter
// Usage: <Param name="content" type="string" required />
// Output: <param name="content" type="string" required="true" />
export function Param({ name, type, required, defaultValue, ...props }) {
    // We must manually stringify boolean attributes because <param> isn't a standard HTML boolean element
    const attrs = {
        name,
        type,
        ...props
    };

    if (required !== undefined) attrs.required = String(required);
    if (defaultValue !== undefined) attrs.default = defaultValue;

    return h('param', attrs);
}
