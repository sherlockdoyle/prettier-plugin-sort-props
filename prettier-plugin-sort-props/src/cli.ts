#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { parsers as typescript } from 'prettier/plugins/typescript';
import { AST } from './ast';
import { fasTopoSort } from './graph';
import splitIdentifier, { SplitString } from './split-identifier';

function prefixToWildcard(s: SplitString): SplitString {
  if (s.startsWith('data ')) return 'data *' as SplitString;
  if (s.startsWith('test ')) return 'test *' as SplitString;
  if (s.startsWith('aria ')) return 'aria *' as SplitString;
  return s;
}
class Map2D {
  private m = new Map<SplitString, Map<SplitString, number>>();

  inc(r: SplitString, c: SplitString) {
    r = prefixToWildcard(r);
    c = prefixToWildcard(c);

    let m = this.m.get(r);
    if (!m) this.m.set(r, (m = new Map()));
    m.set(c, (m.get(c) ?? 0) + 1);
  }

  async sortKeys(): Promise<SplitString[]> {
    const edges = Array<[SplitString, SplitString, number]>();
    for (const [u, m] of this.m) {
      for (const [v, w] of m) {
        edges.push([u, v, w]);
      }
    }
    return await fasTopoSort(edges);
  }
}

const {
  positionals,
  values: { exclude },
} = util.parseArgs({
  options: {
    exclude: { type: 'string', short: 'e', multiple: true, default: ['node_modules', '*.test.*', '*.spec.*'] },
  },
  allowPositionals: true,
});
if (positionals[0] !== 'extract-order') {
  console.error(`Usage: prettier-plugin-sort-props extract-order [<file|dir|glob>...] [--exclude <glob>]
Refer to the docs for more info.`);
  process.exit(1);
}
const paths = positionals.slice(1);
if (paths.length === 0) {
  paths.push('**/*.tsx', '**/*.jsx');
}

const propLists = Array<SplitString[]>();
function walkAST(ast: AST) {
  if (!ast) return;
  if (typeof ast !== 'object') return;
  if (Array.isArray(ast)) {
    for (const item of ast) {
      walkAST(item);
    }
    return;
  }

  if (ast.type === 'JSXElement') {
    const { attributes } = ast.openingElement;
    const group = Array<SplitString>();
    function addGroup() {
      if (group.length) {
        propLists.push(group.slice());
        group.length = 0;
      }
    }

    for (const prop of attributes) {
      if (prop.type === 'JSXAttribute') {
        group.push(splitIdentifier(prop.name.name));
      } else if (prop.type === 'JSXSpreadAttribute') {
        addGroup();
      } else {
        throw new Error('Unknown prop type ' + (prop as any).type);
      }
    }
    addGroup();
  }

  for (const key in ast) {
    walkAST((ast as any)[key]);
  }
}

const cwd = process.cwd();
for (const p of paths) {
  for (const f of fs.globSync(p, { exclude })) {
    walkAST(typescript.typescript.parse(fs.readFileSync(path.join(cwd, f), 'utf8'), {} as any));
  }
}

const weights = new Map2D();
for (const props of propLists) {
  for (let i = 0, l = props.length; i < l; ++i) {
    for (let j = i + 1; j < l; ++j) {
      weights.inc(props[i], props[j]);
    }
  }
}

console.log('Rearrange the following props, if necessary, and add them to your prettier config:');
console.log('"sortPropsCustomOrder":', JSON.stringify(await weights.sortKeys(), null, 2));
