import prettier from 'prettier';
import { parsers as typescript } from 'prettier/plugins/typescript';
import { AST, JSXAttribute, JSXAttributeLike } from './ast';
import PreferenceSorter, { type UseAIOption } from './preference-sorter';
import splitIdentifier from './split-identifier';

async function sortProps(props: JSXAttributeLike[], sorter: PreferenceSorter) {
  const sorted = Array<JSXAttributeLike>(),
    group = Array<JSXAttribute>();
  async function addGroup() {
    if (group.length) {
      const keyMap = new Map(group.map(item => [splitIdentifier(item.name.name), item]));
      const sortedKeys = await sorter.sort(Array.from(keyMap.keys()));
      sortedKeys.forEach(key => sorted.push(keyMap.get(key)!));

      group.length = 0;
    }
  }

  for (const prop of props) {
    if (prop.type === 'JSXAttribute') {
      group.push(prop);
    } else if (prop.type === 'JSXSpreadAttribute') {
      await addGroup();
      sorted.push(prop);
    } else {
      throw new Error('Unknown prop type ' + (prop as any).type);
    }
  }
  await addGroup();

  props.length = 0;
  props.push(...sorted);
}

async function walkAST(ast: AST, sorter: PreferenceSorter) {
  if (!ast) return;
  if (typeof ast !== 'object') return;
  if (Array.isArray(ast)) {
    for (const item of ast) {
      await walkAST(item, sorter);
    }
    return;
  }

  if (ast.type === 'JSXElement') {
    const { attributes } = ast.openingElement;
    await sortProps(attributes, sorter);
  }

  for (const key in ast) {
    await walkAST((ast as any)[key], sorter);
  }
}

export default {
  options: {
    sortPropsUseAI: {
      category: 'prop-sort',
      type: 'choice',
      choices: [
        { value: 'no', description: 'Do not use AI for sorting' },
        { value: 'yes', description: 'Use AI output as is to sort props' },
        { value: 'stable', description: 'Use AI output to sort props, but stabilize them first' },
      ],
      default: 'stable',
      description: "Use AI to sort props which don't match the predefined order",
    } as prettier.ChoiceSupportOption<UseAIOption>,
    sortPropsCustomOrder: {
      category: 'prop-sort',
      type: 'string',
      array: true,
      default: [{ value: [] }],
      description: 'Custom order of props to override the predefined order',
    },
  },
  parsers: {
    typescript: {
      ...typescript.typescript,
      parse: async (text, options) => {
        const sorter = await PreferenceSorter.create(
          options.sortPropsUseAI as UseAIOption,
          options.sortPropsCustomOrder as string[],
        );

        const parsed: AST = typescript.typescript.parse(text, options);
        await walkAST(parsed, sorter);
        return parsed;
      },
    },
  },
} satisfies prettier.Plugin;
