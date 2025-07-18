import AIComparator from '../src/ai-cmp';
import { SplitString } from '../src/split-identifier';

jest.mock('onnxruntime-node', () => ({
  InferenceSession: {
    create: jest.fn().mockResolvedValue({
      run: jest.fn().mockImplementation(async (feeds) => {
        if (feeds.input1 && feeds.input2) {
            return {
                cmp: { data: new Float32Array([0.6]) },
                cmpRev: { data: new Float32Array([0.4]) },
            };
        }
        return {};
      }),
    }),
  },
  Tensor: jest.fn((data, dims) => ({ data, dims })),
}));

describe('AIComparator', () => {
  it('should return a comparison value', async () => {
    const comparator = await AIComparator.create();
    const result = await comparator.compare('a' as SplitString, 'b' as SplitString);
    expect(result).toBeCloseTo(0.2);
  });

  it('should cache results', async () => {
    const comparator = await AIComparator.create();
    await comparator.compare('a' as SplitString, 'b' as SplitString);
    const result = await comparator.compare('a' as SplitString, 'b' as SplitString);
    expect(result).toBeCloseTo(0.2);
  });
});
