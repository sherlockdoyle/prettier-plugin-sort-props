import { AST, JSXAttribute, JSXElement } from '../src/ast';

describe('AST types', () => {
  it('should allow creating a JSXAttribute', () => {
    const attr: JSXAttribute = {
      type: 'JSXAttribute',
      name: {
        type: 'JSXIdentifier',
        name: 'test',
      },
    };
    expect(attr.name.name).toBe('test');
  });

  it('should allow creating a JSXElement', () => {
    const el: JSXElement = {
      type: 'JSXElement',
      openingElement: {
        type: 'JSXOpeningElement',
        attributes: [],
      },
    };
    expect(el.type).toBe('JSXElement');
  });

  it('should allow creating an AST', () => {
    const ast: AST = {
      type: 'JSXElement',
      openingElement: {
        type: 'JSXOpeningElement',
        attributes: [],
      },
    };
    expect(ast.type).toBe('JSXElement');
  });
});
