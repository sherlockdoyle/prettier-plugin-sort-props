import plugin from '../src/index';
import { AST } from '../src/ast';

jest.mock('prettier/plugins/typescript', () => ({
    parsers: {
        typescript: {
            parse: jest.fn((text: string) => ({
                type: 'File',
                program: {
                    type: 'Program',
                    body: [
                        {
                            type: 'ExpressionStatement',
                            expression: {
                                type: 'JSXElement',
                                openingElement: {
                                    type: 'JSXOpeningElement',
                                    name: {
                                        type: 'JSXIdentifier',
                                        name: 'div',
                                    },
                                    attributes: [
                                        { type: 'JSXAttribute', name: { type: 'JSXIdentifier', name: 'c' } },
                                        { type: 'JSXAttribute', name: { type: 'JSXIdentifier', name: 'b' } },
                                        { type: 'JSXAttribute', name: { type: 'JSXIdentifier', name: 'a' } },
                                    ],
                                },
                            },
                        },
                    ],
                },
            })),
        },
    },
}));

describe('Prettier Plugin', () => {
    it('should sort props in the AST', async () => {
        const parser = plugin.parsers.typescript;
        const ast = await parser.parse!('', { sortPropsCustomOrder: ['a', 'b', 'c'] } as any);
        const jsxElement = (ast as any).program.body[0].expression;
        const attrs = jsxElement.openingElement.attributes;
        expect(attrs[0].name.name).toBe('a');
        expect(attrs[1].name.name).toBe('b');
        expect(attrs[2].name.name).toBe('c');
    });
});
