import bradleyTerry from '../src/bradley-terry';

describe('bradleyTerry', () => {
  it('should return correct probabilities for a simple case', () => {
    const wins = [
      [0, 1, 1],
      [0, 0, 1],
      [0, 0, 0],
    ];
    const probabilities = bradleyTerry(wins);
    expect(probabilities[0]).toBeGreaterThan(probabilities[1]);
    expect(probabilities[1]).toBeGreaterThan(probabilities[2]);
  });

  it('should handle a case with no wins', () => {
    const wins = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const probabilities = bradleyTerry(wins);
    expect(probabilities[0]).toBeCloseTo(probabilities[1]);
    expect(probabilities[1]).toBeCloseTo(probabilities[2]);
  });
});
