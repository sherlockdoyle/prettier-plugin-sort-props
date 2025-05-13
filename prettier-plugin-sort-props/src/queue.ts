export type Comparator<T> = (a: T, b: T) => number | Promise<number>;

export class PriorityQueue<T> {
  private q = Array<T>();
  constructor(private cmp: Comparator<T>) {}

  get length(): number {
    return this.q.length;
  }

  private async siftUp(idx: number) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if ((await this.cmp(this.q[idx], this.q[parent])) < 0) {
        const tmp = this.q[idx];
        this.q[idx] = this.q[parent];
        this.q[parent] = tmp;
        idx = parent;
      } else break;
    }
  }
  async push(item: T) {
    this.q.push(item);
    await this.siftUp(this.q.length - 1);
  }

  private async siftDown(idx: number) {
    const l = this.q.length;
    while (true) {
      const left = 2 * idx + 1,
        right = 2 * idx + 2;
      let min = idx;

      if (left < l && (await this.cmp(this.q[left], this.q[min])) < 0) min = left;
      if (right < l && (await this.cmp(this.q[right], this.q[min])) < 0) min = right;

      if (min === idx) break;
      const tmp = this.q[idx];
      this.q[idx] = this.q[min];
      this.q[min] = tmp;
      idx = min;
    }
  }
  async pop(): Promise<T | undefined> {
    if (!this.q.length) return undefined;

    const top = this.q[0],
      last = this.q.pop()!;
    if (this.q.length) {
      this.q[0] = last;
      await this.siftDown(0);
    }
    return top;
  }

  peek(): T | undefined {
    return this.q[0];
  }
}

declare global {
  interface ObjectConstructor {
    keys<K extends string>(o: Record<K, unknown>): K[];
    fromEntries<K extends string, T>(entries: Iterable<readonly [K, T]>): Record<K, T>;
  }
}
export namespace MultiQueue {
  export interface Item<T> {
    id: number;
    data: T;
  }
}
/**
 * A multi-priority queue that supports retrieval by multiple priority keys.
 */
export class MultiQueue<T, PK extends string> {
  private pKeys: PK[];
  private qs: Record<PK, PriorityQueue<MultiQueue.Item<T>>>;
  private live = new Set<number>();
  private nextId = 0;

  /**
   * @param pCmps A map of priority keys to comparator functions.
   */
  constructor(pCmps: Record<PK, Comparator<T>>) {
    this.pKeys = Object.keys(pCmps);
    this.qs = Object.fromEntries(
      Object.entries<Comparator<T>>(pCmps).map(([k, cmp]) => [
        k,
        new PriorityQueue<MultiQueue.Item<T>>((a, b) => cmp(a.data, b.data)),
      ]),
    );
  }

  /**
   * The number of items in the queue.
   */
  get length(): number {
    return this.live.size;
  }

  /**
   * Adds an item to the queue.
   * @param data The item to add.
   * @returns The created item, with a unique id.
   */
  async push(data: T): Promise<MultiQueue.Item<T>> {
    const id = this.nextId++;
    const item: MultiQueue.Item<T> = { id, data };
    this.live.add(id);
    for (const k of this.pKeys) await this.qs[k].push(item);
    return item;
  }

  /**
   * Removes an item from the queue for the given priority key.
   * @param key The priority key to remove the item from.
   * @returns The removed item.
   */
  async pop(key: PK): Promise<T | undefined> {
    const q = this.qs[key];
    while (true) {
      const top = q.peek();
      if (!top) return undefined;
      await q.pop();
      if (this.live.has(top.id)) {
        this.live.delete(top.id);
        return top.data;
      }
    }
  }

  /**
   * Peeks at the top of the queue for the given priority key.
   * @param key The priority key to peek at.
   * @returns The top item.
   */
  async peek(key: PK): Promise<T | undefined> {
    const q = this.qs[key];
    while (true) {
      const top = q.peek();
      if (!top) return undefined;
      if (this.live.has(top.id)) return top.data;
      await q.pop();
    }
  }

  /**
   * Deletes an item from the queue by id.
   * @param id The unique id of the item to delete.
   */
  delete(id: number) {
    this.live.delete(id);
  }
}
