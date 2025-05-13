import { Comparator, MultiQueue, PriorityQueue } from './queue';
import { SplitString } from './split-identifier';

export class DAG {
  private g: Map<SplitString, Set<SplitString>>;

  constructor(verts: SplitString[]) {
    this.g = new Map(verts.map(v => [v, new Set<SplitString>()]));
  }

  private getMatchingNodes(node: SplitString): SplitString[] {
    if (node.endsWith('*')) {
      node = node.slice(0, -1) as SplitString;
      return Array.from(this.g.keys()).filter(k => k.startsWith(node)); //keys().filter is not supported somewhere
    }

    if (this.g.has(node)) return [node];

    return [];
  }

  /**
   * Check if there is a path from src to each dst in dstList.
   */
  private hasPath(src: SplitString, dstList: SplitString[]): boolean[] {
    const visited = new Set<SplitString>();
    const stack = [src];
    const dstSet = new Set(dstList),
      reachable = new Set<SplitString>();

    while (stack.length) {
      const node = stack.pop()!;

      if (dstSet.has(node)) {
        reachable.add(node);
        if (reachable.size === dstList.length) break;
      }

      if (!visited.has(node)) {
        visited.add(node);
        stack.push(...this.g.get(node)!);
      }
    }

    return dstList.map(v => reachable.has(v));
  }

  /**
   * Add the edges according to the consecutive order of elements.
   *
   * For index i, j, i<j, add a directed edge from order[i] to order[j] if it does not form a cycle. The edge may be
   * direct or indirect (path).
   */
  addEdges(order: SplitString[]) {
    let us = Array<SplitString>(),
      i = 0,
      l = order.length;
    // find the first node present in the dag
    while (i < l) {
      us = this.getMatchingNodes(order[i++]);
      if (us.length) break;
    }

    // find the next node
    while (i < l) {
      const vs = this.getMatchingNodes(order[i++]);
      if (!vs.length) continue;

      const chainEnds = new Set(us);
      for (const v of vs) {
        const hasPaths = this.hasPath(v, us);
        for (let j = 0; j < us.length; ++j) {
          if (!hasPaths[j]) {
            this.g.get(us[j])!.add(v);
            chainEnds.delete(us[j]);
          }
        }
      }

      us = [...chainEnds, ...vs];
    }
  }

  /**
   * Topologically sort the DAG. Use tieBreaker to break ties/parallel nodes.
   */
  async topoSort(tieBreaker: Comparator<SplitString>): Promise<SplitString[]> {
    const indegree = new Map<SplitString, number>();
    for (const [u, neighbors] of this.g) {
      if (!indegree.has(u)) indegree.set(u, 0);
      for (const v of neighbors) {
        indegree.set(v, (indegree.get(v) ?? 0) + 1);
      }
    }

    const pq = new PriorityQueue(tieBreaker);
    for (const [node, deg] of indegree) {
      if (deg === 0) await pq.push(node);
    }

    const result = Array<SplitString>();
    while (pq.length) {
      const u = (await pq.pop())!;
      result.push(u);

      for (const v of this.g.get(u)!) {
        const deg = indegree.get(v)! - 1;
        indegree.set(v, deg);
        if (deg === 0) await pq.push(v);
      }
    }
    return result;
  }

  // toDot(): string {
  //   const lines = ['digraph {'];
  //   for (const [u, neighbors] of this.dag) {
  //     if (!neighbors.size) lines.push(`"${u}";`);
  //     for (const v of neighbors) {
  //       lines.push(`"${u}" -> "${v}";`);
  //     }
  //   }
  //   lines.push('}');
  //   return lines.join('\n');
  // }
}

/**
 * Topologically sorts a directed graph (not necessarily DAG) using a greedy FAS (Feedback Arc Set) algorithm.
 *
 * Source: https://github.com/PKUcoldkeyboard/FAS/blob/1c91f860ca241bb41e064a449050b80377f5f087/images/GreedyFAS.png
 *
 * @param edges Array of edges [src, dst, weight]
 * @returns Array of sorted nodes
 */
export async function fasTopoSort(
  edges: [src: SplitString, dst: SplitString, weight: number][],
): Promise<SplitString[]> {
  const nodes = new Set<SplitString>();
  const outAdj = new Map<SplitString, Map<SplitString, number>>(),
    inAdj = new Map<SplitString, Map<SplitString, number>>();
  for (const [src, dst] of edges) {
    nodes.add(src);
    nodes.add(dst);
  }
  for (const node of nodes) {
    outAdj.set(node, new Map());
    inAdj.set(node, new Map());
  }
  for (const [src, dst, weight] of edges) {
    outAdj.get(src)!.set(dst, weight);
    inAdj.get(dst)!.set(src, weight);
  }

  type Data = { u: SplitString; outW: number; inW: number };
  const q = new MultiQueue<Data, 'outW' | 'inW' | 'score'>({
    outW: (a, b) => a.outW - b.outW || -1, // reverse the nodes if they're same since outW is used to fill from the end
    inW: (a, b) => a.inW - b.inW,
    score: (a, b) => {
      const inDiff = a.inW - b.inW,
        outDiff = a.outW - b.outW;
      return inDiff - outDiff || inDiff + outDiff; // return sum of scores if delta diff is 0
    },
  });
  const nodeMap: Record<SplitString, MultiQueue.Item<Data>> = {};
  for (const u of nodes) {
    nodeMap[u] = await q.push({
      u,
      outW: outAdj
        .get(u)!
        .values()
        .reduce((a, b) => a + b, 0),
      inW: inAdj
        .get(u)!
        .values()
        .reduce((a, b) => a + b, 0),
    });
  }

  async function removeNode(node: SplitString) {
    nodes.delete(node);

    // remove outgoing edges
    const outs = outAdj.get(node)!;
    for (const [v, w] of outs) {
      if (!nodes.has(v)) continue;

      const oldItem = nodeMap[v];
      const newData: Data = { u: v, outW: oldItem.data.outW, inW: oldItem.data.inW - w };
      q.delete(oldItem.id);
      nodeMap[v] = await q.push(newData);
    }
    outAdj.delete(node);

    // remove incoming edges
    const ins = inAdj.get(node)!;
    for (const [v, w] of ins) {
      if (!nodes.has(v)) continue;

      const oldItem = nodeMap[v];
      const newData: Data = { u: v, outW: oldItem.data.outW - w, inW: oldItem.data.inW };
      q.delete(oldItem.id);
      nodeMap[v] = await q.push(newData);
    }
    inAdj.delete(node);

    delete nodeMap[node];
  }

  const order = new Array<SplitString>(nodes.size);
  let left = 0,
    right = nodes.size - 1;
  while (nodes.size) {
    // choose sink
    while (q.length) {
      const sink = (await q.peek('outW'))!;
      if (sink.outW !== 0) break; // no more sinks
      await q.pop('outW');
      order[right--] = sink.u;
      await removeNode(sink.u);
    }

    // choose source
    while (q.length) {
      const source = (await q.peek('inW'))!;
      if (source.inW !== 0) break; // no more sources
      await q.pop('inW');
      order[left++] = source.u;
      await removeNode(source.u);
    }

    // choose node with max score (with tie breaking)
    const max = await q.pop('score');
    if (!max) break; // no more nodes
    order[left++] = max.u;
    await removeNode(max.u);
  }

  return order;
}
