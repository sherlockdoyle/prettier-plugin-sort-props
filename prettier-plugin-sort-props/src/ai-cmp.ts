import ort from 'onnxruntime-node';
import path from 'path';
import { type SplitString } from './split-identifier';

const SEQ_LEN = 25;
const VOCAB = Object.fromEntries('$abcdefghijklmnopqrstuvwxyz 0123456789'.split('').map((c, i) => [c, i + 1]));

/**
 * Tokenize an identifier
 * @param word The identifier, must be less than 25 characters
 * @returns The tokenized identifier
 */
function tokenize(word: SplitString): ort.Tensor {
  const tokens = new Int32Array(25);
  for (let i = 0; i < word.length; ++i) {
    tokens[i] = VOCAB[word[i]];
  }
  return new ort.Tensor(tokens, [1, SEQ_LEN]);
}

export default class AIComparator {
  private cache = new Map<string, number>();

  private constructor(private session: ort.InferenceSession) {}
  public static async create(): Promise<AIComparator> {
    return new AIComparator(await ort.InferenceSession.create(path.join(import.meta.dirname, 'model.onnx')));
  }

  public async rawCompare(a: SplitString, b: SplitString): Promise<[number, number]> {
    const input1 = tokenize(a),
      input2 = tokenize(b);
    const result = await this.session.run({ input1, input2 });

    return [(result.cmp.data as Float32Array)[0], (result.cmpRev.data as Float32Array)[0]];
  }

  public async compare(a: SplitString, b: SplitString): Promise<number> {
    const key = `${a}-${b}`,
      keyRev = `${b}-${a}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.cache.has(keyRev)) return -this.cache.get(keyRev)!;

    const output = await this.rawCompare(a, b),
      cmp = output[0] - output[1];
    this.cache.set(key, cmp);
    return cmp;
  }
}
