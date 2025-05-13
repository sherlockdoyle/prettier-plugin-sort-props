declare const splitString: unique symbol;
export type SplitString = string & { [splitString]: true }; // for type safety since the comparator functions expects split strings

/**
 * Split an identifier into words
 * @param identifier The identifier
 * @returns The split identifier
 */
export default function splitIdentifier(identifier: string): SplitString {
  let s = identifier.trim().replace(/[_\-.:]+/g, ' ');
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  s = s.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  s = s.replace(/^[_\s]+|[_\s]+$/g, '');
  return s.toLowerCase() as SplitString;
}
