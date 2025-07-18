import { DAG, fasTopoSort } from '../src/graph';
import { SplitString } from '../src/split-identifier';

describe('DAG', () => {
    it('should correctly perform topological sort', async () => {
        const dag = new DAG(['a', 'b', 'c', 'd'] as SplitString[]);
        dag.addEdges(['a', 'b', 'c'] as SplitString[]);
        dag.addEdges(['a', 'd'] as SplitString[]);
        const sorted = await dag.topoSort((a, b) => a.localeCompare(b));
        expect(sorted).toEqual(['a', 'b', 'd', 'c']);
    });
});

describe('fasTopoSort', () => {
    it('should handle a simple graph', async () => {
        const edges: [SplitString, SplitString, number][] = [
            ['a', 'b', 1],
            ['b', 'c', 1],
            ['a', 'c', 1],
        ];
        const sorted = await fasTopoSort(edges);
        expect(sorted).toEqual(['a', 'b', 'c']);
    });

    it('should handle a graph with a cycle', async () => {
        const edges: [SplitString, SplitString, number][] = [
            ['a', 'b', 1],
            ['b', 'c', 1],
            ['c', 'a', 1],
        ];
        const sorted = await fasTopoSort(edges);
        expect(sorted.length).toBe(3);
    });
});
