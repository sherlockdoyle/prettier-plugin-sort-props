# Prettier Plugin Sort Props - Technical Documentation

## 1. Introduction

`prettier-plugin-sort-props` is a Prettier plugin designed to automatically sort JSX attributes (props) within code. It aims to provide a consistent and configurable ordering by integrating into Prettier's formatting pipeline. This document details the algorithms, data flow, and core mechanics of the plugin.

## 2. Overall Data Flow

The plugin operates within Prettier's formatting process. The high-level data flow is as follows:

1.  **Code Input**: Prettier reads the raw source code string.
2.  **Parsing**: Prettier's TypeScript parser (extended by this plugin) converts the code string into an Abstract Syntax Tree (AST).
3.  **AST Traversal & Prop Extraction (`index.ts`)**:
    *   The `walkAST` function traverses the AST.
    *   When a `JSXElement` is encountered, its attributes are collected.
    *   Crucially, attributes are grouped: `JSXSpreadAttribute`s (`{...obj}`) act as delimiters. Each group of `JSXAttribute`s between spread attributes (or element boundaries) is processed independently.
    *   Prop names within each group are normalized using `splitIdentifier`.
4.  **Sorting (`PreferenceSorter`)**: The normalized prop names for each group are passed to the `PreferenceSorter` instance for sorting.
5.  **AST Modification**: The original attributes in the AST are reordered based on the sorted prop names.
6.  **Code Generation**: Prettier's printer takes the modified AST and generates the formatted output code string.

## 3. Identifier Normalization (`split-identifier.ts`)

Before sorting, prop names are processed by `splitIdentifier`. This function tokenizes prop names by splitting them based on camelCase, PascalCase, snake_case, or kebab-case conventions, and converting them to lowercase space-separated strings (e.g., `onClick` becomes `"on click"`, `data-testid` becomes `"data testid"`).

**Purpose**:
*   **Consistent Matching**: Ensures that different casing conventions for the same conceptual prop (if any) are treated similarly.
*   **Improved AI Input**: Provides more meaningful, tokenized input to the AI model, potentially improving its ability to discern patterns.
*   **Flexible Custom Rules**: Allows custom order rules with prefix wildcards (e.g., `on*`) to match relevant prop names more effectively after normalization.

The output, `SplitString`, is the standardized form used internally by the sorting logic.

## 4. The `PreferenceSorter` Algorithm (`preference-sorter.ts`)

The `PreferenceSorter` class orchestrates the sorting of a group of (normalized) prop names. It employs a multi-stage process primarily based on constructing and resolving a Directed Acyclic Graph (DAG).

**Input**: An array of `SplitString` prop names for the current group.

**Initialization**:
*   A `PreferenceSorter` instance is created with user-defined `propSortCustomOrder` and the `propSortUseAI` choice.
*   If AI is enabled, an `AIComparator` instance is created, which involves loading the `model.onnx`.
*   The `customOrder` rules are normalized using `splitIdentifier`.
*   Internal predefined orders (from `src/order.ts`) are also available.

**Sorting Steps**:

1.  **DAG Construction**: A DAG is initialized where each prop name is a node.
2.  **Applying Preferential Orders**:
    *   The plugin iterates through `propSortCustomOrder` (user-defined) and then internal predefined orders.
    *   For each list of ordered props (e.g., `['key', 'ref', 'on*']`), the `dag.addEdges(order)` method is called. This adds directed edges to the DAG (e.g., `key` -> `ref`, `ref` -> any prop starting with `on` if `on*` is used).
    *   `dag.addEdges` is careful: it adds an edge only if it doesn't introduce a cycle, thus maintaining the DAG property. It also handles wildcard matching (e.g., `aria-*`) by finding all matching nodes in the graph.
3.  **AI-Driven Sorting & Tie-Breaking (Conditional on `propSortUseAI`)**:
    *   **Case `no` (No AI)**:
        *   The original relative order of props within the current group (if not already constrained by custom/predefined orders) is added as further edges to the DAG via `dag.addEdges(arr)`.
        *   The DAG is topologically sorted using `dag.topoSort()`. The tie-breaker for this sort is the original index of the props, ensuring stability for otherwise equally ranked props.
    *   **Case `yes` (Direct AI Sort)**:
        *   The DAG (with custom/predefined orders applied) is topologically sorted using `dag.topoSort()`.
        *   The tie-breaker function provided to `topoSort` is `aiComparator.compare(a, b)`. This function:
            *   Calls `aiComparator.rawCompare(a,b)` which tokenizes `a` and `b` (via `ai-cmp.ts#tokenize`) and feeds them to the ONNX model.
            *   The ONNX model returns two scores. `compare` calculates their difference, resulting in a value indicating which prop is preferred.
    *   **Case `stable` (AI + Bradley-Terry for Ranking + Stable Sort)**:
        1.  **Pairwise AI Scores**: `aiComparator.rawCompare(a, b)` is called for all unique pairs of props in the current group to get pairwise preference scores from the ONNX model. This results in a matrix `w` where `w[i][j]` might represent the AI's confidence that prop `i` comes before prop `j` (or a transformation of this).
        2.  **Bradley-Terry Model (`bradley-terry.ts`)**: The matrix `w` is fed into the `bradleyTerry(w)` function. This statistical model iteratively calculates a global "strength" score for each prop based on its pairwise "wins" against other props. The output is an array of scores, effectively a linear ranking of props based on aggregated AI preferences.
        3.  **Apply Bradley-Terry Ranking**: The props are sorted according to their descending Bradley-Terry scores. This sorted list is then added as another set of preferential edges to the DAG via `dag.addEdges(arr)`.
        4.  **Final Topological Sort**: The DAG is then topologically sorted using `dag.topoSort()`. The tie-breaker is the index from the Bradley-Terry sorted array, ensuring that props with equal graph importance are ordered according to the Bradley-Terry ranking, and further ties are broken by their original relative order within that ranking (maintaining stability).

4.  **Output**: The `topoSort` method returns the final sorted list of `SplitString` prop names for the group.

## 5. AI Model and Comparison (`ai-cmp.ts` & `model.onnx`)

*   **ONNX Model (`model.onnx`)**: This is a pre-trained neural network model in the Open Neural Network Exchange format. It's treated as a black box that has learned patterns of prop ordering from a dataset.
*   **`AIComparator`**:
    *   Loads the ONNX model using `onnxruntime-node`.
    *   **`tokenize(word)`**: Converts a `SplitString` prop name into a fixed-length integer array (tensor) based on a character vocabulary. This is the required input format for the ONNX model.
    *   **`rawCompare(a, b)`**: Sends two tokenized prop names to the ONNX model. The model outputs two float values. These are likely interpreted as scores related to the preference of `a` over `b` and `b` over `a`.
    *   **`compare(a, b)`**: A wrapper around `rawCompare` that subtracts the two output scores to produce a single comparison value (positive if `a` before `b`, negative if `b` before `a`, zero if neutral). It includes a cache for performance.

## 6. CLI `extract-order` Algorithm (`cli.ts` & `graph.ts`)

The CLI command `prettier-plugin-sort-props extract-order` helps generate a `propSortCustomOrder`. Its algorithm is distinct from the main plugin's runtime sorting but shares some components:

1.  **AST Traversal & Prop Collection**: Similar to the main plugin, it parses specified source files, traverses their ASTs, and extracts groups of props (again, delimited by spread attributes). Prop names are normalized using `splitIdentifier`. It also applies wildcard normalization (e.g., `data-foo` -> `data *`).
2.  **Building a Preference Graph**:
    *   It iterates through all collected prop groups. For every pair of props `(propA, propB)` within a single group where `propA` appears before `propB`, it increments a counter for the directed edge `propA -> propB`.
    *   This results in a weighted directed graph where nodes are prop names and edge weights represent the frequency of observed precedence.
3.  **Feedback Arc Set Topological Sort (`fasTopoSort` in `graph.ts`)**:
    *   The collected edges (with their weights) are passed to `fasTopoSort`.
    *   This is a greedy algorithm designed for graphs that may contain cycles (unlike a strict DAG). It aims to find a linear ordering of nodes that minimizes the total weight of "feedback arcs" (edges that point backward in the proposed order).
    *   The algorithm iteratively identifies and places sources (nodes with no incoming edges from remaining nodes) at the beginning of the order and sinks (nodes with no outgoing edges to remaining nodes) at the end.
    *   If no sources or sinks are left, it selects a node based on a heuristic (typically related to the difference between its weighted in-degree and out-degree) to break cycles and places it in the order.
4.  **Output**: The `fasTopoSort` produces a sorted list of prop names, which is then suggested to the user as a `propSortCustomOrder`.

## 7. Summary

The plugin employs a sophisticated, multi-layered approach to prop sorting. It combines user-defined rules with AI-driven comparisons and robust ranking algorithms like Bradley-Terry. The core sorting logic relies on constructing a DAG from various preference sources and then topologically sorting it, using different strategies for tie-breaking based on configuration. The CLI provides a separate but related graph algorithm (FAS topological sort) to learn ordering rules from existing code.
