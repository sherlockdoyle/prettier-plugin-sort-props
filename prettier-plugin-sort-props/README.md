# Prettier Plugin Sort Props

A [Prettier](https://prettier.io/) plugin to logically sort component props based on their name.

This plugin currently only works with JSX (React props) in `.jsx` and `.tsx` files.

> [!IMPORTANT]
> Rearranging props can change the order of execution. See <https://github.com/prettier/prettier/issues/323#issuecomment-273751697>.

## Installation

Install Prettier and `prettier-plugin-sort-props`:

```bash
npm install --save-dev prettier prettier-plugin-sort-props
# or
yarn add --dev prettier prettier-plugin-sort-props
```

## Usage

Add the plugin to your Prettier configuration file.

```json
{
  "plugins": ["prettier-plugin-sort-props"]
}
```

### Working

Are you aware of [prettier-plugin-css-order](https://github.com/Siilwyn/prettier-plugin-css-order)? This plugin works just like that plugin, but for JSX props. The problem with JSX props is that they can have arbitrary names, so you can't just use a predefined order like [Concentric-CSS](https://github.com/brandon-rhodes/Concentric-CSS). Instead, we use a simple and small (310KB only) AI model to sort the props, which runs offline, completely on your device; and you can disable it too! Other than the AI model, there's also a small list of common props arranged in a predetermined order - which you can find in [order.ts](prettier-plugin-sort-props/src/order.ts).

The props sorting follows 3 steps:

1. Props in `sortPropsCustomOrder` are sorted first.
2. Remaining props, which are present in the internal order, are sorted next.
3. Anything else is sorted using the AI model.

> [!NOTE]
> For technical details, see the [top level README](../README.md).

### Configuration

You can configure the plugin through your Prettier configuration file.

**Example `.prettierrc.json`:**

```jsonc
{
  // prettier-plugin-sort-props options
  "sortPropsUseAI": "stable", // Default: "stable"
  "sortPropsCustomOrder": ["key", "ref", "id", "class name", "on *", "style", "children"],
}
```

### Options

#### `sortPropsUseAI`

* **Type**: `String`
* **Default**: `"stable"`
* **Choices**:
  * `"no"`: Disables AI-powered sorting. Unmatched props maintain their original relative order.
  * `"yes"`: Uses the AI model's output to sort unmatched props. However, the AI model is not very good and may produce different results every time.
  * `"stable"`: Uses the AI model's output to sort unmatched props, but first stabilizes the output. This ranks all unmatched props together and then sorts them. This is slower than `"yes"`, but the output doesn't change every time.

This option controls how the plugin uses its underlying AI model to sort props that are not explicitly handled by `sortPropsCustomOrder` or the predefined order.

#### `sortPropsCustomOrder`

* **Type**: `Array<String>`
* **Default**: `[]`
* **Description**: Defines a custom order for JSX props. Props matching entries in this array will be sorted according to their order in the array.
  * Strings can be exact prop names (e.g., `"id"`, `"class name"`).
  * Strings can be prefix wildcards ending with `*` (e.g., `"on *"` to match all props starting with `on`, like `onClick`, `onSubmit`). The `*` matches any sequence of characters.  
    Note that `"on *"` will match props like `onClick`, `on-submit`, `on_input`, etc. Whereas, `"on*"` (no space) will match props like `onclick`, `once`, `onion`, etc.

Props listed in `sortPropsCustomOrder` are prioritized first. Then, any remaining props are sorted based on the predefined order and the `sortPropsUseAI` setting.

### Examples

**Before:**

```jsx
<div
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
</div>
```

**After:**

```jsx
<div
  key='comp-key'
  ref={myRef}
  id='my-comp'
  data-test='test-id'
  className='my-class'
  onClick={handleClick}
  style={{ color: 'red' }}
  aria-label='Component'
>
  Children
</div>
```

#### With Spread Attributes and Arbitrary Props

**Before:**

```jsx
<div
  data-label="Component"
  emphasis
  id="my-comp"
  appearance
  data-id="test-id"
  {...props}
  onClick={handleClick}
  data-test="test-id"
  onMagic
  aria-label="Component"
  open
/>
```

**After:**

```jsx
<div
  id='my-comp'
  data-label='Component'
  emphasis
  data-id='test-id'
  appearance
  {...props}
  data-test='test-id'
  open
  onClick={handleClick}
  onMagic={9}
  aria-label='Component'
/>
```

## Command Line Interface (CLI)

This plugin provides a CLI utility to help you generate a `sortPropsCustomOrder` based on the existing prop patterns in your project.

### `extract-order` Command

The `extract-order` command scans your JSX/TSX files, analyzes the relative order of props as they appear, and then suggests an optimized `sortPropsCustomOrder` array. This can be a great starting point for your configuration.

> [!IMPORTANT]
> The CLI uses experimental node v22 features and may not work on older versions. It has been tested on v22.15.0 only.

**Usage:**

```bash
npx prettier-plugin-sort-props extract-order [options] [<file|dir|glob>...]
```

**Arguments:**

* `[<file|dir|glob>...]`: (Optional) A list of files, directories, or glob patterns to scan.
  * If not provided, defaults to scanning `'**/*.tsx'` and `'**/*.jsx'`.

**Options:**

* `-e <glob>`, `--exclude <glob>`: (Optional) A glob pattern to exclude files from scanning. This option can be used multiple times.
  * Defaults to `'node_modules', '*.test.*', '*.spec.*'`.

**How it Works:**

The CLI parses your source files and observes how props are typically ordered relative to each other within components. It counts pairwise occurrences (e.g., "propA appears before propB X times"). It also normalizes common prefixes like `data-`, `test-`, and `aria-` into wildcards (e.g., `data *`) to create more general sorting rules. Using this data, it finds an optimal ordering that minimizes conflicts and respects the most common patterns in your code.

**Output:**

The command will print a JSON array to your console, which you can copy and paste into the `sortPropsCustomOrder` option in your Prettier configuration file.

**Example:**

```bash
npx prettier-plugin-sort-props extract-order src --exclude "src/legacy/**"
```

This will scan all `.tsx` and `.jsx` files within the `src` directory (excluding anything under `src/legacy/`) and then output a suggested `sortPropsCustomOrder` array.

You might see output like this:

```jsonc
Rearrange the following props, if necessary, and add them to your prettier config:
"sortPropsCustomOrder": [
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
