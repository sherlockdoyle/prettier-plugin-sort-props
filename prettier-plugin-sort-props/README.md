# Prettier Plugin Sort Props

A Prettier plugin to meticulously sort your JSX props based on a sophisticated ordering logic. It leverages AI capabilities for props not covered by predefined rules and allows for extensive customization.

This plugin works with JSX in `.ts` and `.tsx` files.

## Installation

Install Prettier and `prettier-plugin-sort-props`:

```bash
npm install --save-dev prettier prettier-plugin-sort-props
# or
yarn add --dev prettier prettier-plugin-sort-props
```

## Usage

The plugin will be automatically loaded by Prettier if it's in your `package.json` dependencies.

### Configuration

You can configure the plugin through your Prettier configuration file (`.prettierrc.js`, `prettier.config.js`, or `.prettierrc.json`).

**Example `.prettierrc.js`:**

```javascript
module.exports = {
  // Prettier options
  semi: true,
  singleQuote: true,
  // prettier-plugin-sort-props options
  propSortUseAI: 'stable', // Default: 'stable'
  propSortCustomOrder: ['key', 'ref', 'id', 'className', 'on*', 'style', 'children'],
};
```

### Options

#### `propSortUseAI`

*   **Type**: `String`
*   **Default**: `"stable"`
*   **Choices**:
    *   `"no"`: Disables AI-powered sorting. Props not matching `propSortCustomOrder` or any internal heuristics will maintain their original relative order.
    *   `"yes"`: Uses the AI model's output directly to sort props that don't match `propSortCustomOrder`. This might lead to less stable sorting if the AI model's preferences change or are very nuanced.
    *   `"stable"`: (Recommended) Uses the AI model's output but first stabilizes the sorting. This aims to provide a balance between intelligent sorting and deterministic output for props not covered by custom order.

This option controls how the plugin uses its underlying AI model to sort props that are not explicitly handled by `propSortCustomOrder` or internal heuristics (like sorting `style` or event handlers).

#### `propSortCustomOrder`

*   **Type**: `Array<String>`
*   **Default**: `[]`
*   **Description**: Defines a custom order for JSX props. Props matching entries in this array will be sorted according to their order in the array.
    *   Strings can be exact prop names (e.g., `"id"`, `"className"`).
    *   Strings can be prefix wildcards ending with `*` (e.g., `"on*"` to match all props starting with `on`, like `onClick`, `onSubmit`). The `*` matches any sequence of characters.

Props listed in `propSortCustomOrder` are prioritized first. Then, any remaining props are sorted based on internal heuristics and the `propSortUseAI` setting.

### Examples

**Before:**

```jsx
<MyComponent
  onClick={handleClick}
  style={{ color: 'red' }}
  id="my-comp"
  className="my-class"
  data-test="test-id"
  aria-label="Component"
  key="comp-key"
  ref={myRef}
>
  Children
</MyComponent>
```

**After (with example configuration above):**

```jsx
<MyComponent
  key="comp-key"
  ref={myRef}
  id="my-comp"
  className="my-class"
  onClick={handleClick}
  style={{ color: 'red' }}
  aria-label="Component" // Sorted by AI/heuristics
  data-test="test-id"   // Sorted by AI/heuristics
>
  Children
</MyComponent>
```
(Note: The exact order of `aria-label` and `data-test` might vary based on the `propSortUseAI` setting and the AI model's behavior if not covered by `propSortCustomOrder`.)

## Command Line Interface (CLI)

This plugin provides a CLI utility to help you generate a `propSortCustomOrder` based on the existing prop patterns in your project.

### `extract-order` Command

The `extract-order` command scans your JSX/TSX files, analyzes the relative order of props as they appear, and then suggests an optimized `propSortCustomOrder` array. This can be a great starting point for your configuration.

**Usage:**

```bash
npx prettier-plugin-sort-props extract-order [options] [<file|dir|glob>...]
```

**Arguments:**

*   `[<file|dir|glob>...]`: (Optional) A list of files, directories, or glob patterns to scan.
    *   If not provided, defaults to scanning `'**/*.tsx'` and `'**/*.jsx'`.

**Options:**

*   `-e <glob>`, `--exclude <glob>`: (Optional) A glob pattern to exclude files from scanning. This option can be used multiple times.
    *   Defaults to `['*.test.*']` (e.g., `*.test.tsx`, `*.test.js`).

**How it Works:**

The CLI parses your source files and observes how props are typically ordered relative to each other within components. It counts pairwise occurrences (e.g., "propA appears before propB X times"). It also normalizes common prefixes like `data-`, `test-`, and `aria-` into wildcards (e.g., `data *`) to create more general sorting rules. Using this data, it performs a topological sort (specifically Feedback Arc Set) to find an optimal ordering that minimizes conflicts and respects the most common patterns in your code.

**Output:**

The command will print a JSON array to your console, which you can copy and paste into the `propSortCustomOrder` option in your Prettier configuration file.

**Example:**

```bash
npx prettier-plugin-sort-props extract-order src --exclude "src/legacy/**"
```

This will scan all `.tsx` and `.jsx` files within the `src` directory (excluding anything under `src/legacy/`) and then output a suggested `propSortCustomOrder` array.

You might see output like this:

```
Rearrange the following props, if necessary, and add them to your prettier config:
"propSortCustomOrder": [
  "key",
  "ref",
  "id",
  "className",
  "aria *",
  // ... other props based on your project
  "style",
  "children"
]
```
Remember to review and adjust the suggested order to perfectly fit your project's conventions.

## How it Works (Briefly)

The plugin parses your code, and when it encounters JSX opening elements, it extracts the props.
1.  Props matching `propSortCustomOrder` are pulled out and ordered first.
2.  Remaining props are then sorted using a combination of internal heuristics (e.g., for common props like `style`, event handlers if not in custom order) and an AI model.
3.  Spread attributes (`{...props}`) act as delimiters; props are sorted within their respective groups around spread attributes.

For more technical details, please see the [TECHNICAL_DOC.md](TECHNICAL_DOC.md).
