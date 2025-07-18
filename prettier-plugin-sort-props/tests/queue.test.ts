import { PriorityQueue, MultiQueue } from '../src/queue';

describe('PriorityQueue', () => {
  it('should correctly order numbers', async () => {
    const pq = new PriorityQueue<number>((a, b) => a - b);
    await pq.push(5);
    await pq.push(2);
    await pq.push(8);
    expect(await pq.pop()).toBe(2);
    expect(await pq.pop()).toBe(5);
    expect(await pq.pop()).toBe(8);
  });

  it('should handle an empty queue', async () => {
    const pq = new PriorityQueue<number>((a, b) => a - b);
    expect(await pq.pop()).toBeUndefined();
  });
});

describe('MultiQueue', () => {
  it('should prioritize correctly based on the given key', async () => {
    type Data = { name: string; priority: number };
    const mq = new MultiQueue<Data, 'priority'>({
      priority: (a, b) => a.priority - b.priority,
    });

    await mq.push({ name: 'low', priority: 10 });
    await mq.push({ name: 'high', priority: 1 });

    expect((await mq.pop('priority'))?.name).toBe('high');
    expect((await mq.pop('priority'))?.name).toBe('low');
  });

  it('should handle deletions correctly', async () => {
    type Data = { name: string; priority: number };
    const mq = new MultiQueue<Data, 'priority'>({
      priority: (a, b) => a.priority - b.priority,
    });

    const item1 = await mq.push({ name: 'item1', priority: 10 });
    await mq.push({ name: 'item2', priority: 1 });

    mq.delete(item1.id);

    expect((await mq.pop('priority'))?.name).toBe('item2');
    expect(await mq.pop('priority')).toBeUndefined();
  });
});
