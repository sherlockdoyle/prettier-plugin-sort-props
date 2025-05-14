import { DAG, fasTopoSort } from '../graph';
import { SplitString } from '../split-identifier';

// Helper to cast strings to SplitString for testing
const ss = (s: string): SplitString => s as SplitString;
const defaultTieBreaker = (a: SplitString, b: SplitString) => (a as string).localeCompare(b as string);

describe('DAG', () => {
  it('should sort a simple linear graph (A -> B -> C)', async () => {
    const dag = new DAG([ss('A'), ss('B'), ss('C')]);
    dag.addEdges([ss('A'), ss('B'), ss('C')]);
    const sorted = await dag.topoSort(defaultTieBreaker);
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('B')));
    expect(sorted.indexOf(ss('B'))).toBeLessThan(sorted.indexOf(ss('C')));
    expect(sorted).toEqual([ss('A'), ss('B'), ss('C')]);
  });

  it('should sort a graph with multiple paths and merges (A->B, A->C, B->D, C->D)', async () => {
    const dag = new DAG([ss('A'), ss('B'), ss('C'), ss('D')]);
    dag.addEdges([ss('A'), ss('B'), ss('D')]);
    dag.addEdges([ss('A'), ss('C'), ss('D')]);
    const sorted = await dag.topoSort(defaultTieBreaker);
    
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('B')));
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('C')));
    expect(sorted.indexOf(ss('B'))).toBeLessThan(sorted.indexOf(ss('D')));
    expect(sorted.indexOf(ss('C'))).toBeLessThan(sorted.indexOf(ss('D')));

    expect(sorted[0]).toBe(ss('A'));
    expect(sorted[sorted.length -1]).toBe(ss('D')); // D is last
    expect(sorted).toContain(ss('B'));
    expect(sorted).toContain(ss('C'));
  });

  it('should handle an empty graph', async () => {
    const dag = new DAG([]);
    expect(await dag.topoSort(defaultTieBreaker)).toEqual([]);
  });

  it('should handle a graph with a single node', async () => {
    const dag = new DAG([ss('A')]);
    dag.addEdges([ss('A')]); 
    expect(await dag.topoSort(defaultTieBreaker)).toEqual([ss('A')]);
  });

  it('should handle nodes registered through addEdges correctly', async () => {
    // All nodes must be declared in constructor for this interpretation
    const dag = new DAG([ss('A'), ss('B'), ss('C'), ss('D'), ss('Unknown'), ss('E')]);
    dag.addEdges([ss('A'), ss('B')]); 
    dag.addEdges([ss('A'), ss('C'), ss('D')]); 
    dag.addEdges([ss('Unknown'), ss('E')]);
    
    const sorted = await dag.topoSort(defaultTieBreaker);
    const allNodes = [ss('A'), ss('B'), ss('C'), ss('D'), ss('Unknown'), ss('E')];
    allNodes.forEach(node => expect(sorted).toContain(node));
    expect(sorted.length).toBe(allNodes.length);

    expect(sorted.indexOf(ss('Unknown'))).toBeLessThan(sorted.indexOf(ss('E')));
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('B')));
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('C')));
    expect(sorted.indexOf(ss('C'))).toBeLessThan(sorted.indexOf(ss('D')));
  });


  it('should maintain existing order if addEdges implies a cycle (A->B, then addEdges B->A)', async () => {
    const dag = new DAG([ss('A'), ss('B')]);
    dag.addEdges([ss('A'), ss('B')]); 
    const initialSort = await dag.topoSort(defaultTieBreaker);
    expect(initialSort).toEqual([ss('A'), ss('B')]);

    dag.addEdges([ss('B'), ss('A')]); 
    const sortAfterCycle = await dag.topoSort(defaultTieBreaker);
    expect(sortAfterCycle.indexOf(ss('A'))).toBeLessThan(sortAfterCycle.indexOf(ss('B')));
    expect(sortAfterCycle).toEqual([ss('A'), ss('B')]);
  });

  it('should correctly use wildcard matching in addEdges (e.g., "conf*" matching "config" and "configure")', async () => {
    const dag = new DAG([ss('config'), ss('configure'), ss('apple'), ss('another')]);
    dag.addEdges([ss('config')]); // Ensure nodes are part of graph if not in other edges
    dag.addEdges([ss('configure')]);
    dag.addEdges([ss('apple')]);
    dag.addEdges([ss('another')]); 
    
    dag.addEdges([ss('conf*'), ss('apple')]); 
    
    const sorted = await dag.topoSort(defaultTieBreaker);
    expect(sorted).toContain(ss('config'));
    expect(sorted).toContain(ss('configure'));
    expect(sorted).toContain(ss('apple'));
    expect(sorted).toContain(ss('another'));

    expect(sorted.indexOf(ss('config'))).toBeLessThan(sorted.indexOf(ss('apple')));
    expect(sorted.indexOf(ss('configure'))).toBeLessThan(sorted.indexOf(ss('apple')));
  });

  it('should use tieBreaker in topoSort for parallel nodes', async () => {
    const dag = new DAG([ss('A'), ss('B')]);
    // No explicit edges between A and B, their order is determined by tieBreaker.
    // They are added to the DAG via constructor, making them known nodes.
    // addEdges([]) on them is not necessary if they are already in `verts`.
    // However, if addEdges is the only way to make them "active" for sorting beyond just being known,
    // then dag.addEdges([ss('A')]); dag.addEdges([ss('B')]); might be needed.
    // Assuming constructor verts are enough to make them appear in sort if no explicit order.
    
    let sorted = await dag.topoSort(defaultTieBreaker); // alphabetical: A, B
    // Order depends on how roots are selected if A and B are roots.
    // Default tiebreaker will apply to roots.
    if (sorted.length === 2) { // Ensure both are present
        expect( (sorted[0] === ss('A') && sorted[1] === ss('B')) || 
                (sorted[0] === ss('B') && sorted[1] === ss('A')) ).toBeTruthy();
        // With defaultTieBreaker (localeCompare), A should come before B
        expect(sorted).toEqual([ss('A'), ss('B')]);
    } else {
        // Fail if not all nodes are present, or extra nodes.
        expect(sorted).toEqual(expect.arrayContaining([ss('A'), ss('B')]));
        expect(sorted.length).toBe(2);
    }


    const reverseTieBreaker = (a: SplitString, b: SplitString) => (b as string).localeCompare(a as string);
    sorted = await dag.topoSort(reverseTieBreaker); // reverse: B, A
    if (sorted.length === 2) {
        expect( (sorted[0] === ss('A') && sorted[1] === ss('B')) || 
                (sorted[0] === ss('B') && sorted[1] === ss('A')) ).toBeTruthy();
        // With reverseTieBreaker, B should come before A
        expect(sorted).toEqual([ss('B'), ss('A')]);
    } else {
        expect(sorted).toEqual(expect.arrayContaining([ss('A'), ss('B')]));
        expect(sorted.length).toBe(2);
    }
  });

  it('should correctly sort pre-ordered items with new items mixed in', async () => {
    const dag = new DAG([ss('A'), ss('B'), ss('C'), ss('D'), ss('E')]);
    dag.addEdges([ss('C'), ss('D')]);
    dag.addEdges([ss('A'), ss('B'), ss('C')]);
    dag.addEdges([ss('D'), ss('E')]);

    const sorted = await dag.topoSort(defaultTieBreaker);
    expect(sorted).toEqual([ss('A'), ss('B'), ss('C'), ss('D'), ss('E')]);
  });

  it('should handle complex scenarios with multiple addEdges calls', async () => {
    const dag = new DAG([ss('A'), ss('B'), ss('C'), ss('D'), ss('E'), ss('F')]);
    // F->A->B->E and F->C->D->E
    dag.addEdges([ss('F'), ss('A')]); 
    dag.addEdges([ss('A'), ss('B')]);
    dag.addEdges([ss('B'), ss('E')]);

    dag.addEdges([ss('F'), ss('C')]);
    dag.addEdges([ss('C'), ss('D')]);
    dag.addEdges([ss('D'), ss('E')]);
    

    const sorted = await dag.topoSort(defaultTieBreaker);
    expect(sorted[0]).toBe(ss('F'));
    expect(sorted.indexOf(ss('F'))).toBeLessThan(sorted.indexOf(ss('A')));
    expect(sorted.indexOf(ss('F'))).toBeLessThan(sorted.indexOf(ss('C')));
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('B')));
    expect(sorted.indexOf(ss('C'))).toBeLessThan(sorted.indexOf(ss('D')));
    expect(sorted.indexOf(ss('B'))).toBeLessThan(sorted.indexOf(ss('E')));
    expect(sorted.indexOf(ss('D'))).toBeLessThan(sorted.indexOf(ss('E')));
    expect(sorted[sorted.length - 1]).toBe(ss('E'));
    expect(sorted).toEqual(expect.arrayContaining([ss('A'), ss('B'), ss('C'), ss('D'), ss('E'), ss('F')]));
    expect(sorted.length).toBe(6);
  });
});

describe('fasTopoSort', () => {
  it('should sort a simple DAG correctly', async () => {
    const edges: [SplitString, SplitString, number][] = [
      [ss('A'), ss('B'), 1],
      [ss('B'), ss('C'), 1],
    ];
    const sorted = await fasTopoSort(edges); // Assuming fasTopoSort is async based on DAG.topoSort
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('B')));
    expect(sorted.indexOf(ss('B'))).toBeLessThan(sorted.indexOf(ss('C')));
    expect(sorted).toEqual([ss('A'), ss('B'), ss('C')]);
  });

  it('should produce a stable order for a graph with a simple cycle (A->B, B->C, C->A)', async () => {
    const edges: [SplitString, SplitString, number][] = [
      [ss('A'), ss('B'), 1],
      [ss('B'), ss('C'), 1],
      [ss('C'), ss('A'), 1], 
    ];
    const sorted1 = await fasTopoSort(edges);
    expect(sorted1.length).toBe(3);
    expect(sorted1).toContain(ss('A'));
    expect(sorted1).toContain(ss('B'));
    expect(sorted1).toContain(ss('C'));

    const sorted2 = await fasTopoSort(edges);
    expect(sorted2).toEqual(sorted1);

    const isABeforeB = sorted1.indexOf(ss('A')) < sorted1.indexOf(ss('B'));
    const isBBeforeC = sorted1.indexOf(ss('B')) < sorted1.indexOf(ss('C'));
    const isCBeforeA = sorted1.indexOf(ss('C')) < sorted1.indexOf(ss('A'));

    let preservedEdges = 0;
    if (isABeforeB) preservedEdges++;
    if (isBBeforeC) preservedEdges++;
    if (isCBeforeA) preservedEdges++;
    expect(preservedEdges).toBe(2); 
  });

  it('should consider weights when breaking cycles (heavier edges less likely to be part of FAS)', async () => {
    const edges: [SplitString, SplitString, number][] = [
      [ss('A'), ss('B'), 1],  
      [ss('B'), ss('C'), 1],  
      [ss('C'), ss('A'), 10], 
    ];
    const sorted = await fasTopoSort(edges);
    expect(sorted.indexOf(ss('C'))).toBeLessThan(sorted.indexOf(ss('A')));
  });

  it('should handle an empty edge list', async () => {
    const edges: [SplitString, SplitString, number][] = [];
    expect(await fasTopoSort(edges)).toEqual([]);
  });

  it('should handle a graph with multiple disconnected components', async () => {
    const edges: [SplitString, SplitString, number][] = [
      [ss('A'), ss('B'), 1],
      [ss('C'), ss('D'), 1],
    ];
    const sorted = await fasTopoSort(edges);
    expect(sorted.length).toBe(4);
    expect(sorted).toContain(ss('A'));
    expect(sorted).toContain(ss('B'));
    expect(sorted).toContain(ss('C'));
    expect(sorted).toContain(ss('D'));
    expect(sorted.indexOf(ss('A'))).toBeLessThan(sorted.indexOf(ss('B')));
    expect(sorted.indexOf(ss('C'))).toBeLessThan(sorted.indexOf(ss('D')));
  });

  it('should handle nodes with only incoming or only outgoing edges', async () => {
    const edges: [SplitString, SplitString, number][] = [
      [ss('A'), ss('B'), 1], 
      [ss('B'), ss('C'), 1], 
    ];
    const sorted = await fasTopoSort(edges);
    expect(sorted).toEqual([ss('A'), ss('B'), ss('C')]);

    const edges3: [SplitString, SplitString, number][] = [
      [ss('G'), ss('H'), 1],
      [ss('H'), ss('I'), 1],
      [ss('J'), ss('J'), 1], // J is a node, possibly treated as isolated if self-loops are ignored by main algo
    ];
     const sorted3 = await fasTopoSort(edges3);
     expect(sorted3.indexOf(ss('G'))).toBeLessThan(sorted3.indexOf(ss('H')));
     expect(sorted3.indexOf(ss('H'))).toBeLessThan(sorted3.indexOf(ss('I')));
     expect(sorted3).toContain(ss('J')); 
     expect(sorted3.length).toBe(4);
  });
});
