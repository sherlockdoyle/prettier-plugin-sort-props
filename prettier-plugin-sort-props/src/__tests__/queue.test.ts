import { PriorityQueue, MultiQueue } from '../queue';

describe('PriorityQueue', () => {
  // Assuming PQ methods always return Promise if comparator *can* be async
  const syncComparator = (a: number, b: number) => a - b; // Min-heap

  it('should push and pop elements in correct order (sync cmp)', async () => {
    const pq = new PriorityQueue<number>(syncComparator);
    pq.push(5);
    pq.push(1);
    pq.push(3);
    expect(await pq.pop()).toBe(1);
    expect(await pq.pop()).toBe(3);
    expect(await pq.pop()).toBe(5);
    expect(await pq.pop()).toBeUndefined();
  });

  it('should peek the smallest element (sync cmp)', async () => {
    const pq = new PriorityQueue<number>(syncComparator);
    pq.push(5);
    pq.push(1);
    pq.push(3);
    expect(await pq.peek()).toBe(1);
    expect(pq.length).toBe(3); 
    expect(await pq.pop()).toBe(1);
    expect(await pq.peek()).toBe(3);
  });

  it('should handle empty queue correctly (sync cmp)', async () => {
    const pq = new PriorityQueue<number>(syncComparator);
    expect(pq.length).toBe(0);
    expect(await pq.pop()).toBeUndefined();
    expect(await pq.peek()).toBeUndefined();
  });

  it('should handle multiple identical elements (sync cmp)', async () => {
    const pq = new PriorityQueue<number>(syncComparator);
    pq.push(5);
    pq.push(1);
    pq.push(3);
    pq.push(1);
    pq.push(5);
    expect(await pq.pop()).toBe(1);
    expect(await pq.pop()).toBe(1);
    expect(await pq.pop()).toBe(3);
    expect(await pq.pop()).toBe(5);
    expect(await pq.pop()).toBe(5);
    expect(pq.length).toBe(0);
  });

  it('should work with a larger number of elements (sync cmp)', async () => {
    const pq = new PriorityQueue<number>(syncComparator);
    const elements = Array.from({ length: 100 }, (_, i) => Math.floor(Math.random() * 1000));
    elements.forEach(el => pq.push(el));
    
    elements.sort((a, b) => a - b); 
    
    const poppedElements: number[] = [];
    // Assuming pq.length might change if pop is concurrent or if items can be added during popping.
    // Standard is to check pq.length > 0.
    while (pq.length > 0) {
      const el = await pq.pop(); 
      if (el !== undefined) {
        poppedElements.push(el);
      } else {
        // This case should ideally not be reached if pq.length > 0 was true,
        // unless pop can return undefined when length is still positive (e.g. only dead items left)
        // For a simple PQ<number>, this means empty.
        if (pq.length > 0) break; // Safety break if pop returns undefined prematurely
      }
    }
    expect(poppedElements).toEqual(elements);
  });

  const asyncComparator = async (a: number, b: number) => {
    await new Promise(resolve => setTimeout(resolve, 0)); 
    return a - b; 
  };

  it('should push and pop elements in correct order (async cmp)', async () => {
    const pq = new PriorityQueue<number>(asyncComparator);
    pq.push(5);
    pq.push(1);
    pq.push(3);
    expect(await pq.pop()).toBe(1);
    expect(await pq.pop()).toBe(3);
    expect(await pq.pop()).toBe(5);
    expect(await pq.pop()).toBeUndefined();
  });

  it('should peek the smallest element (async cmp)', async () => {
    const pq = new PriorityQueue<number>(asyncComparator);
    pq.push(5);
    pq.push(1);
    pq.push(3);
    expect(await pq.peek()).toBe(1);
    expect(pq.length).toBe(3); 
    expect(await pq.pop()).toBe(1);
    expect(await pq.peek()).toBe(3);
  });
});

describe('MultiQueue', () => {
  interface TestItem {
    id: number;
    p1: number; 
    p2: string; 
  }

  const comparators = {
    byP1: (a: TestItem, b: TestItem) => a.p1 - b.p1,
    byP2: (a: TestItem, b: TestItem) => a.p2.localeCompare(b.p2),
  };

  const item1: TestItem = { id: 1, p1: 10, p2: 'apple' };
  const item2: TestItem = { id: 2, p1: 5, p2: 'banana' };
  const item3: TestItem = { id: 3, p1: 10, p2: 'cherry' }; 
  const item4: TestItem = { id: 4, p1: 1, p2: 'banana' }; 

  it('should push and pop elements according to different priority keys', async () => {
    const mq = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    mq.push(item1);
    mq.push(item2);
    mq.push(item3);
    mq.push(item4);

    expect(await mq.pop('byP1')).toBe(item4); 
    expect(await mq.pop('byP1')).toBe(item2); 
    const nextP1 = await mq.pop('byP1');
    expect(nextP1 === item1 || nextP1 === item3).toBe(true);
    const lastP1 = await mq.pop('byP1');
    expect(lastP1 === item1 || lastP1 === item3).toBe(true);
    expect(nextP1).not.toBe(lastP1);
    
    expect(await mq.pop('byP1')).toBeUndefined();

    const mq2 = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    mq2.push(item1); 
    mq2.push(item2); 
    mq2.push(item3); 
    mq2.push(item4); 

    expect(await mq2.pop('byP2')).toBe(item1); 
    const nextP2a = await mq2.pop('byP2');
    expect(nextP2a === item2 || nextP2a === item4).toBe(true);
    const nextP2b = await mq2.pop('byP2');
    expect(nextP2b === item2 || nextP2b === item4).toBe(true);
    expect(nextP2a).not.toBe(nextP2b);
    expect(await mq2.pop('byP2')).toBe(item3); 
    expect(await mq2.pop('byP2')).toBeUndefined();
  });

  it('should peek elements according to different priority keys', async () => {
    const mq = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    mq.push(item1);
    mq.push(item2);
    mq.push(item3);
    mq.push(item4);

    expect(await mq.peek('byP1')).toBe(item4);
    expect(mq.length).toBe(4); 
    expect(await mq.peek('byP2')).toBe(item1);
    expect(mq.length).toBe(4);

    await mq.pop('byP1'); 
    expect(await mq.peek('byP1')).toBe(item2);
    expect(await mq.peek('byP2')).toBe(item1); 
  });

  it('should correctly report its length for live items', async () => {
    const mq = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    expect(mq.length).toBe(0);
    mq.push(item1);
    expect(mq.length).toBe(1);
    mq.push(item2);
    expect(mq.length).toBe(2);
    await mq.pop('byP1'); 
    expect(mq.length).toBe(1);
    await mq.pop('byP2'); 
    expect(mq.length).toBe(0);
  });

  it('should allow deleting items, making them unavailable for pop/peek', async () => {
    const mq = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    mq.push(item1);
    mq.push(item2);
    mq.push(item3);
    mq.push(item4);
    expect(mq.length).toBe(4);

    mq.delete(item2.id); 
    expect(mq.length).toBe(3);
    expect(await mq.peek('byP1')).toBe(item4); 
    // After item2 (banana) is deleted, item4 (banana) is still a candidate for byP2.
    // item1 (apple) is first byP2.
    expect(await mq.peek('byP2')).toBe(item1); 

    expect(await mq.pop('byP1')).toBe(item4); // item4 (p1:1) is popped
    // Remaining live items: item1 (p1:10, apple), item3 (p1:10, cherry)
    expect(await mq.peek('byP2')).toBe(item1); 
  });

  it('should handle popping all items from one priority view', async () => {
    const mq = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    mq.push(item1);
    mq.push(item2);
    mq.push(item3);
    mq.push(item4);

    await mq.pop('byP1'); 
    await mq.pop('byP1'); 
    await mq.pop('byP1'); 
    await mq.pop('byP1'); 
    expect(await mq.pop('byP1')).toBeUndefined();
    expect(mq.length).toBe(0); 

    expect(await mq.peek('byP2')).toBeUndefined();
    expect(await mq.pop('byP2')).toBeUndefined();
  });
  
  it('should handle empty queue for pop and peek', async () => {
    const mq = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    expect(mq.length).toBe(0);
    expect(await mq.pop('byP1')).toBeUndefined();
    expect(await mq.peek('byP1')).toBeUndefined();
    expect(await mq.pop('byP2')).toBeUndefined();
    expect(await mq.peek('byP2')).toBeUndefined();
  });

  it('should handle pushing and popping multiple items, testing interactions', async () => {
    const mq = new MultiQueue<TestItem, keyof typeof comparators>(comparators);
    mq.push(item1); 
    mq.push(item2); 
    mq.push(item3); 
    mq.push(item4); 

    expect(await mq.peek('byP1')).toBe(item4); 
    expect(await mq.peek('byP2')).toBe(item1); 

    expect(await mq.pop('byP1')).toBe(item4); // item4 (id:4, p1:1, p2:banana) is gone
    expect(mq.length).toBe(3);

    // Remaining: item1(10,apple), item2(5,banana), item3(10,cherry)
    expect(await mq.peek('byP1')).toBe(item2); // p1:5
    expect(await mq.peek('byP2')).toBe(item1); // p2:apple

    expect(await mq.pop('byP2')).toBe(item1); // item1 (id:1, p1:10, p2:apple) is gone
    expect(mq.length).toBe(2);

    // Remaining: item2(5,banana), item3(10,cherry)
    expect(await mq.peek('byP1')).toBe(item2); // p1:5
    expect(await mq.peek('byP2')).toBe(item2); // p2:banana (item3 is cherry)

    mq.delete(item2.id); // item2 (id:2, p1:5, p2:banana) is gone
    expect(mq.length).toBe(1);

    // Remaining: item3(10,cherry)
    expect(await mq.peek('byP1')).toBe(item3);
    expect(await mq.peek('byP2')).toBe(item3);
    expect(await mq.pop('byP1')).toBe(item3);
    expect(mq.length).toBe(0);
  });
});
