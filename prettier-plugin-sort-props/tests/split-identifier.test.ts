import splitIdentifier from '../src/split-identifier';

describe('splitIdentifier', () => {
  it('should split camelCase correctly', () => {
    expect(splitIdentifier('camelCase')).toBe('camel case');
  });

  it('should split PascalCase correctly', () => {
    expect(splitIdentifier('PascalCase')).toBe('pascal case');
  });

  it('should split snake_case correctly', () => {
    expect(splitIdentifier('snake_case')).toBe('snake case');
  });

  it('should split kebab-case correctly', () => {
    expect(splitIdentifier('kebab-case')).toBe('kebab case');
  });

  it('should handle multiple uppercase letters correctly', () => {
    expect(splitIdentifier('HTMLParser')).toBe('html parser');
  });

  it('should handle leading and trailing underscores', () => {
    expect(splitIdentifier('_leading')).toBe('leading');
    expect(splitIdentifier('trailing_')).toBe('trailing');
  });

  it('should handle spaces correctly', () => {
    expect(splitIdentifier('with spaces')).toBe('with spaces');
  });

  it('should handle numbers correctly', () => {
    expect(splitIdentifier('version2')).toBe('version 2');
  });
});
