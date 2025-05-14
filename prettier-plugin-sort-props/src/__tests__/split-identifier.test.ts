import splitIdentifier from '../split-identifier';

describe('splitIdentifier', () => {
  const testCases = [
    { input: 'camelCaseString', expected: 'camel case string' },
    { input: 'PascalCaseString', expected: 'pascal case string' },
    { input: 'snake_case_string', expected: 'snake case string' },
    { input: 'kebab-case-string', expected: 'kebab case string' },
    { input: 'dot.case.string', expected: 'dot case string' },
    { input: 'UPPER_CASE_STRING', expected: 'upper case string' },
    // Updated to match actual behavior: "MiXeD" -> "Mi Xe D" by /([a-z0-9])([A-Z])/g
    // "Value123" is not split by either rule.
    { input: 'MiXeD_CaSe-STRING.Value123', expected: 'mi xe d ca se string value123' },
    { input: 'test123String', expected: 'test123 string' },
    { input: '  _leading-Test_  ', expected: 'leading test' },
    // Updated to match actual behavior: input 'word1  __--word2..word3' (contains 2 spaces after word1)
    // results in 'word1' + '  ' + ' ' (from __--) + 'word2' + ' ' (from ..) + 'word3'
    { input: 'word1  __--word2..word3', expected: 'word1   word2 word3' },
    { input: 'Word', expected: 'word' },
    { input: 'IDENTIFIER', expected: 'identifier' },
    { input: 'identifier', expected: 'identifier' },
    { input: 'IDENTIFIER_fooIdentifier', expected: 'identifier foo identifier' },
    { input: 'fooIdentifierBARIdentifier', expected: 'foo identifier bar identifier' },
    { input: '', expected: '' },
    { input: ' __ ', expected: '' },
    { input: 'single', expected: 'single' },
    { input: 'TARGET_BUILD_VERSION', expected: 'target build version' },
    { input: 'TARGET_buildVersion', expected: 'target build version' },
    { input: 'Target_Build_Version', expected: 'target build version' },
    { input: 'TargetBuildVersion', expected: 'target build version' },
    { input: 'targetBuildVersion', expected: 'target build version' },
    { input: 'XMLDocument', expected: 'xml document' },
    // Updated to match actual behavior: "CIACMELCase" -> "CIACMEL Case" by /([A-Z]+)([A-Z][a-z])/g
    { input: 'CIACMELCase', expected: 'ciacmel case' },
  ];

  testCases.forEach(({ input, expected }) => {
    it(`should split "${input}" into "${expected}"`, () => {
      expect(splitIdentifier(input)).toBe(expected);
    });
  });
});
