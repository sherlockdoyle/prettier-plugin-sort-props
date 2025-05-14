import AIComparator, { tokenize } from '../ai-cmp'; 
import { SplitString } from '../split-identifier';
import * as ort from 'onnxruntime-node'; 
import path from 'path'; 

// Helper to cast strings to SplitString for testing
const ss = (s: string): SplitString => s as SplitString;

// Constants for testing tokenize, based on problem description hints or assumptions
const TEST_SEQ_LEN = 25; // Assuming SEQ_LEN is 25 as hinted
// Simplified VOCAB for testing tokenize logic. Actual tokenize uses its internal VOCAB.
const TEST_VOCAB: { [char: string]: number } = {
  'a': 1, 'b': 2, 'c': 3,
  's': 19, 'h': 8, 'o': 15, 'r': 18, 't': 20,
  'w': 23, 'd': 4, // 'o', 'r' already defined
  'p': 16, 'e': 5, 'x': 24, // For 'propX'
  'y': 25, // For 'propY'
  // For 'cachedPropA', 'cachedPropB', 'swappedS', 'swappedT', 'distinctA', 'distinctB', 'distinctC', 'distinctD'
  // Add more if specific token values for these are needed for precise tokenize output checking.
  // For now, tests will focus on structure and presence/absence of known tokens from this TEST_VOCAB.
};

// Mock onnxruntime-node
const mockSessionRun = jest.fn();
const mockSessionCreate = jest.fn().mockResolvedValue({
  run: mockSessionRun,
  inputNames: ['input_1', 'input_2'], 
  outputNames: ['cmp', 'cmpRev'], 
});
const mockTensor = jest.fn().mockImplementation((data, dims) => ({
  data,
  dims,
  type: 'float32', 
}));

jest.mock('onnxruntime-node', () => ({
  InferenceSession: {
    create: mockSessionCreate,
  },
  Tensor: mockTensor,
}));

describe('tokenize', () => {
  // These tests use TEST_SEQ_LEN and a local TEST_VOCAB to construct expected outputs
  // for verifying the *logic* of the actual tokenize function from ai-cmp.ts.
  // The actual tokenize() will use its own internal VOCAB and SEQ_LEN.
  // We assume its internal SEQ_LEN is consistent with TEST_SEQ_LEN (25).

  it('should tokenize a simple word correctly based on TEST_VOCAB assumptions', () => {
    const word = 'abc';
    const tokenizedTensorData = tokenize(ss(word)).data;
    const expectedArray = new Float32Array(TEST_SEQ_LEN).fill(0);
    if (TEST_VOCAB.a) expectedArray[0] = TEST_VOCAB.a;
    if (TEST_VOCAB.b) expectedArray[1] = TEST_VOCAB.b;
    if (TEST_VOCAB.c) expectedArray[2] = TEST_VOCAB.c;
    
    expect(tokenizedTensorData.length).toBe(TEST_SEQ_LEN); // Check actual length
    expect(tokenizedTensorData[0]).toEqual(expectedArray[0]);
    expect(tokenizedTensorData[1]).toEqual(expectedArray[1]);
    expect(tokenizedTensorData[2]).toEqual(expectedArray[2]);
    // Check padding for the rest
    for (let i = word.length; i < TEST_SEQ_LEN; i++) {
        expect(tokenizedTensorData[i]).toBe(0);
    }
  });

  it('should pad words shorter than SEQ_LEN with zeros', () => {
    const word = 'short';
    const tokenizedTensorData = tokenize(ss(word)).data;
    expect(tokenizedTensorData.length).toBe(TEST_SEQ_LEN);
    for (let i = 0; i < word.length; i++) {
      // We can only assert specific token values if they are in TEST_VOCAB
      // and assume they match the real VOCAB's mapping for these common chars.
      if (TEST_VOCAB[word[i]]) {
        expect(tokenizedTensorData[i]).toEqual(TEST_VOCAB[word[i]]);
      }
    }
    for (let i = word.length; i < TEST_SEQ_LEN; i++) {
      expect(tokenizedTensorData[i]).toBe(0);
    }
  });

  it('should handle words exactly TEST_SEQ_LEN long', () => {
    const word = 'a'.repeat(TEST_SEQ_LEN);
    const tokenizedTensorData = tokenize(ss(word)).data;
    expect(tokenizedTensorData.length).toBe(TEST_SEQ_LEN);
    if (TEST_VOCAB.a) { // Assuming 'a' is in the real VOCAB and has same/some value
        for(let i=0; i < TEST_SEQ_LEN; ++i) {
            // This check is only valid if the real VOCAB maps 'a' to TEST_VOCAB.a
            // A more robust check would be that tokenizedTensorData[i] is not 0.
            expect(tokenizedTensorData[i]).not.toBe(0); // Assuming 'a' is in real VOCAB
        }
    }
  });

  it('should truncate words longer than TEST_SEQ_LEN', () => {
    const longWord = 'a'.repeat(TEST_SEQ_LEN + 5);
    const tokenizedTensorData = tokenize(ss(longWord)).data; 
    expect(tokenizedTensorData.length).toBe(TEST_SEQ_LEN);
    if (TEST_VOCAB.a) { // Assuming 'a' is in the real VOCAB
        expect(tokenizedTensorData[0]).not.toBe(0); // Check the first char's token
    }
  });

  it('should handle characters not in its internal VOCAB by assigning 0', () => {
    const wordWithUnknownChar = 'word~'; // Assuming '~' is not in actual VOCAB
    const tokenizedTensorData = tokenize(ss(wordWithUnknownChar)).data;
    expect(tokenizedTensorData.length).toBe(TEST_SEQ_LEN);
    // Check known characters
    if (TEST_VOCAB.w) expect(tokenizedTensorData[0]).toEqual(TEST_VOCAB.w);
    if (TEST_VOCAB.o) expect(tokenizedTensorData[1]).toEqual(TEST_VOCAB.o);
    if (TEST_VOCAB.r) expect(tokenizedTensorData[2]).toEqual(TEST_VOCAB.r);
    if (TEST_VOCAB.d) expect(tokenizedTensorData[3]).toEqual(TEST_VOCAB.d);
    // The character '~' at index 4 should be 0 if not in actual VOCAB
    expect(tokenizedTensorData[4]).toBe(0); 
  });

  it('should handle empty string', () => {
    const tokenizedTensorData = tokenize(ss('')).data;
    const expectedArray = new Float32Array(TEST_SEQ_LEN).fill(0);
    expect(tokenizedTensorData).toEqual(expectedArray);
  });
});

describe('AIComparator', () => {
  beforeEach(() => {
    mockSessionRun.mockClear();
    mockSessionCreate.mockClear();
    mockTensor.mockClear();
  });

  it('AIComparator.create() should call InferenceSession.create with correct model path', async () => {
    await AIComparator.create();
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    const actualModelPath = mockSessionCreate.mock.calls[0][0];
    expect(path.basename(actualModelPath)).toBe('model.onnx');
  });

  describe('rawCompare', () => {
    it('should call session.run with tokenized inputs and return scores', async () => {
      mockSessionRun.mockResolvedValueOnce({
        cmp: { data: new Float32Array([0.7]), dims: [1] },
        cmpRev: { data: new Float32Array([0.2]), dims: [1] },
      });

      const comparator = await AIComparator.create();
      const propA = ss('propA');
      const propB = ss('propB');
      const result = await comparator.rawCompare(propA, propB);

      expect(mockSessionRun).toHaveBeenCalledTimes(1);
      
      const tokenizedAData = tokenize(propA).data;
      const tokenizedBData = tokenize(propB).data;
      // Determine actual SEQ_LEN from the output of tokenize itself
      const actualSeqLen = tokenizedAData.length; 

      expect(mockTensor).toHaveBeenCalledWith(tokenizedAData, [1, actualSeqLen]);
      expect(mockTensor).toHaveBeenCalledWith(tokenizedBData, [1, actualSeqLen]);
      
      const expectedRunArgs = {
        input_1: { data: tokenizedAData, dims: [1, actualSeqLen], type: 'float32' },
        input_2: { data: tokenizedBData, dims: [1, actualSeqLen], type: 'float32' },
      };
      expect(mockSessionRun.mock.calls[0][0]).toEqual(expectedRunArgs);
      expect(result).toEqual([0.7, 0.2]);
    });
  });

  describe('compare', () => {
    let comparator: AIComparator;

    beforeEach(async () => {
      mockSessionRun.mockClear(); 
      mockSessionCreate.mockClear();
      mockTensor.mockClear();
      comparator = await AIComparator.create(); 
    });

    it('should call rawCompare for new pairs and return their difference', async () => {
      mockSessionRun.mockResolvedValueOnce({
        cmp: { data: new Float32Array([0.8]), dims: [1] },
        cmpRev: { data: new Float32Array([0.1]), dims: [1] },
      });

      const result = await comparator.compare(ss('propX'), ss('propY'));
      expect(mockSessionRun).toHaveBeenCalledTimes(1); 
      expect(result).toBeCloseTo(0.8 - 0.1); 
    });

    it('should use cache for repeated calls with the same pair', async () => {
      mockSessionRun.mockResolvedValueOnce({
        cmp: { data: new Float32Array([0.6]), dims: [1] },
        cmpRev: { data: new Float32Array([0.3]), dims: [1] },
      });

      const propA = ss('cachedPropA');
      const propB = ss('cachedPropB');

      await comparator.compare(propA, propB); 
      expect(mockSessionRun).toHaveBeenCalledTimes(1);

      const result = await comparator.compare(propA, propB); 
      expect(mockSessionRun).toHaveBeenCalledTimes(1); 
      expect(result).toBeCloseTo(0.6 - 0.3); 
    });

    it('compare should use cache and negate for reversed pair', async () => {
      mockSessionRun.mockResolvedValueOnce({
        cmp: { data: new Float32Array([0.75]), dims: [1] },
        cmpRev: { data: new Float32Array([0.25]), dims: [1] },
      });
      
      const propS = ss('swappedS');
      const propT = ss('swappedT');

      const result1 = await comparator.compare(propS, propT); 
      expect(mockSessionRun).toHaveBeenCalledTimes(1);
      expect(result1).toBeCloseTo(0.75 - 0.25); 

      const result2 = await comparator.compare(propT, propS); 
      expect(mockSessionRun).toHaveBeenCalledTimes(1); 
      expect(result2).toBeCloseTo(-(0.75 - 0.25)); 
    });

    it('compare should handle different pairs independently in cache', async () => {
      mockSessionRun.mockResolvedValueOnce({ 
        cmp: { data: new Float32Array([0.9]), dims: [1] },
        cmpRev: { data: new Float32Array([0.05]), dims: [1] },
      }).mockResolvedValueOnce({ 
        cmp: { data: new Float32Array([0.6]), dims: [1] },
        cmpRev: { data: new Float32Array([0.1]), dims: [1] },
      });

      const propA = ss('distinctA');
      const propB = ss('distinctB');
      const propC = ss('distinctC');
      const propD = ss('distinctD');

      const resultAB = await comparator.compare(propA, propB);
      expect(mockSessionRun).toHaveBeenCalledTimes(1);
      expect(resultAB).toBeCloseTo(0.9 - 0.05); 

      const resultCD = await comparator.compare(propC, propD);
      expect(mockSessionRun).toHaveBeenCalledTimes(2); 
      expect(resultCD).toBeCloseTo(0.6 - 0.1); 

      const resultAB_cached = await comparator.compare(propA, propB);
      expect(mockSessionRun).toHaveBeenCalledTimes(2); 
      expect(resultAB_cached).toBeCloseTo(0.9 - 0.05);
    });
  });
});
