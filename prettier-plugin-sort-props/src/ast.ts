interface JSXIdentifier {
  type: 'JSXIdentifier';
  name: string;
}
export interface JSXAttribute {
  type: 'JSXAttribute';
  name: JSXIdentifier;
}
interface JSXSpreadAttribute {
  type: 'JSXSpreadAttribute';
}
export type JSXAttributeLike = JSXAttribute | JSXSpreadAttribute;
interface JSXOpeningElement {
  type: 'JSXOpeningElement';
  attributes: JSXAttributeLike[];
}
export interface JSXElement {
  type: 'JSXElement';
  openingElement: JSXOpeningElement;
}
export type AST = JSXElement;
