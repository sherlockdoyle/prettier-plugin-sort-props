import AIComparator from './ai-cmp';
import bradleyTerry from './bradley-terry';
import { DAG } from './graph';
import order from './order';
import splitIdentifier, { type SplitString } from './split-identifier';

export type UseAIOption = 'no' | 'yes' | 'stable';

/**
 * A sorter using a list of preference orderings. The array is sorted in the order of the first preference. Each of the
 * next preferences are used for sorting the items that were not present in the previous preferences.
 */
export default class PreferenceSorter {
  private orders = new Array<SplitString[]>();

  private constructor(customOrder: SplitString[], useAI: Extract<UseAIOption, 'no'>);
  private constructor(customOrder: SplitString[], useAI: Exclude<UseAIOption, 'no'>, aiComparator: AIComparator);
  private constructor(
    customOrder: SplitString[],
    private useAI: UseAIOption,
    private aiComparator?: AIComparator,
  ) {
    if (customOrder.length > 1) {
      this.orders.push(customOrder);
    }
    this.orders.push(order);
  }
  static async create(useAI: UseAIOption, customOrder: string[]): Promise<PreferenceSorter> {
    if (useAI === 'no') return new PreferenceSorter(customOrder.map(splitIdentifier), useAI);
    return new PreferenceSorter(customOrder.map(splitIdentifier), useAI, await AIComparator.create());
  }

  async sort(arr: SplitString[]): Promise<SplitString[]> {
    if (arr.length < 2) return arr;

    const dag = new DAG(arr);
    for (const order of this.orders) {
      dag.addEdges(order);
    }

    switch (this.useAI) {
      case 'yes':
        return await dag.topoSort(this.aiComparator!.compare.bind(this.aiComparator));
      case 'stable':
        const n = arr.length;
        const w = Array.from({ length: n }, () => Array.from<number>({ length: n }));
        for (let i = 0; i < n; ++i) {
          for (let j = i + 1; j < n; ++j) {
            [w[j][i], w[i][j]] = await this.aiComparator!.rawCompare(arr[i], arr[j]);
          }
        }
        const p = bradleyTerry(w);

        arr = Array.from(p.keys())
          .sort((a, b) => p[b] - p[a]) // sort in descending order
          .map(si => arr[si]);
      // fallthrough
      case 'no':
        dag.addEdges(arr); // ensure original (or sorted) order
        const indexMap = new Map(arr.map((v, i) => [v, i]));
        return await dag.topoSort((a, b) => indexMap.get(a)! - indexMap.get(b)!);
    }
  }
}
