import PreferenceSorter, { UseAIOption } from '../preference-sorter';
import { SplitString } from '../split-identifier'; 
import defaultOrderArray from '../order'; 
import AIComparator from '../ai-cmp'; 
import bradleyTerry from '../bradley-terry';

// Helper functions
const ss = (s: string): SplitString => s as SplitString;
const sss = (arr: string[]): SplitString[] => arr.map(ss);

// Mocks
jest.mock('../ai-cmp');
jest.mock('../bradley-terry');

const mockAIComparatorInstance = {
  compare: jest.fn(),
  rawCompare: jest.fn(),
};

(AIComparator.create as jest.Mock).mockResolvedValue(mockAIComparatorInstance);

(bradleyTerry as jest.Mock).mockImplementation((wins: number[][]) => {
  const n = wins.length;
  if (n === 0) return [];
  // Default mock: give higher scores to lower original indices (e.g., more "stable" like behavior)
  const scores = Array.from({ length: n }, (_, i) => n - i); 
  return scores;
});


describe('PreferenceSorter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AIComparator.create as jest.Mock).mockResolvedValue(mockAIComparatorInstance);
    (bradleyTerry as jest.Mock).mockImplementation((wins: number[][]) => {
      const n = wins.length;
      if (n === 0) return [];
      const scores = Array.from({ length: n }, (_, i) => n - i); // Higher score for earlier items in input to BT
      return scores;
    });
    mockAIComparatorInstance.compare.mockClear();
    mockAIComparatorInstance.rawCompare.mockClear();
  });

  // Helper to determine an item's group index in defaultOrderArray
  // defaultOrderArray is ReadonlyArray<ReadonlyArray<SplitString>>
  const getBaseDefaultOrderIndex = (item: SplitString): number => {
    const itemStr = item as string;
    const index = defaultOrderArray.findIndex(
      (group: ReadonlyArray<SplitString>) => // group is ReadonlyArray<SplitString>
        group.some((gElem: SplitString) => (gElem as string) === itemStr) || // Direct match
        group.some((gItem: SplitString) => { // Wildcard match
          const gItemStr = gItem as string;
          return gItemStr.endsWith('*') && itemStr.startsWith(gItemStr.slice(0, -1));
        })
    );
    return index === -1 ? Infinity : index;
  };
  
  // Helper function to sort items based on defaultOrderArray for expected results
  // It preserves the original relative order of items that fall into the same group or are not in default order.
  const sortItemsByActualDefaultOrder = (
    itemsToFilterAndSort: string[], 
    originalFullInputOrderForTieBreaking: string[] // Used for tie-breaking
  ): string[] => {
    // Filter to include only items that actually match a default order rule
    const itemsInDefaultOrder = itemsToFilterAndSort.filter(itemStr => getBaseDefaultOrderIndex(ss(itemStr)) !== Infinity);
    
    return [...itemsInDefaultOrder].sort((aStr: string, bStr: string) => {
      const aIndex = getBaseDefaultOrderIndex(ss(aStr));
      const bIndex = getBaseDefaultOrderIndex(ss(bStr));
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      // Preserve original relative order from the full input list for items in the same default group
      return originalFullInputOrderForTieBreaking.indexOf(aStr) - originalFullInputOrderForTieBreaking.indexOf(bStr);
    });
  };

  describe("useAI: 'no'", () => {
    it('should sort by custom order, then default order, then original order (useAI: "no")', async () => {
      const sorter = await PreferenceSorter.create( // Uses 2 arguments
        sss(['custom1', 'custom2']),
        'no' 
      );
      const inputStrings = ['z', 'custom2', 'a', 'id', 'className', 'b', 'custom1', 'key'];
      const input = sss(inputStrings);
      
      let expectedOrderStrings: string[] = [];
      const customPart = ['custom1', 'custom2'];
      expectedOrderStrings.push(...customPart);

      const remainingAfterCustom = inputStrings.filter(s => !customPart.includes(s));
      const sortedDefaultPart = sortItemsByActualDefaultOrder(remainingAfterCustom, inputStrings);
      expectedOrderStrings.push(...sortedDefaultPart);
      
      const currentExpectedSet = new Set(expectedOrderStrings);
      const originalOrderRemainingPart = inputStrings.filter(s => !currentExpectedSet.has(s));
      expectedOrderStrings.push(...originalOrderRemainingPart);

      const sorted = await sorter.sort(input);
      expect(sorted.map(s => s as string)).toEqual(expectedOrderStrings);
    });

    it('should use only default order and original order if custom order is empty (useAI: "no")', async () => {
      const sorter = await PreferenceSorter.create( [], 'no'); 
      const inputStrings = ['z', 'key', 'a', 'id', 'b'];
      const input = sss(inputStrings);
      
      let expectedOrderStrings: string[] = [];
      // All items are candidates for default order, then remaining for original.
      const sortedDefaultPart = sortItemsByActualDefaultOrder(inputStrings, inputStrings);
      expectedOrderStrings.push(...sortedDefaultPart);
      
      const currentExpectedSet = new Set(expectedOrderStrings);
      const originalOrderRemainingPart = inputStrings.filter(s => !currentExpectedSet.has(s));
      expectedOrderStrings.push(...originalOrderRemainingPart);
      
      const sorted = await sorter.sort(input);
      expect(sorted.map(s => s as string)).toEqual(expectedOrderStrings);
    });

    it('should handle items not in any predefined order (useAI: "no")', async () => {
      const sorter = await PreferenceSorter.create( [ss('custom1')], 'no');
      const inputStringsNoMatch = ['z', 'a', 'b']; // custom1 not in input, no default items from this list
      const sortedNoMatch = await sorter.sort(sss(inputStringsNoMatch));
      // Since 'custom1' is not in input, and 'z','a','b' are not default, original order is kept.
      expect(sortedNoMatch.map(s => s as string)).toEqual(inputStringsNoMatch);

      const inputStringsMixed = ['z', 'custom1', 'a', 'id', 'b']; // id is default
      const inputMixed = sss(inputStringsMixed);
      
      let expectedOrderStrings = ['custom1']; // Custom part
      const remainingAfterCustom = inputStringsMixed.filter(s => !expectedOrderStrings.includes(s));
      const sortedDefaultPart = sortItemsByActualDefaultOrder(remainingAfterCustom, inputStringsMixed);
      expectedOrderStrings.push(...sortedDefaultPart);
      
      const currentExpectedSet = new Set(expectedOrderStrings);
      const originalOrderRemainingPart = inputStringsMixed.filter(s => !currentExpectedSet.has(s));
      expectedOrderStrings.push(...originalOrderRemainingPart);
      
      const sortedMixed = await sorter.sort(inputMixed);
      expect(sortedMixed.map(s => s as string)).toEqual(expectedOrderStrings);
    });

    it('should handle empty input array (useAI: "no")', async () => {
      const sorter = await PreferenceSorter.create(sss(['custom1']), 'no');
      const sorted = await sorter.sort([]);
      expect(sorted).toEqual([]);
    });

    it('should correctly use wildcard from default order (useAI: "no")', async () => {
      const sorter = await PreferenceSorter.create( [], 'no');
      const inputStrings = ['key', 'data-test', 'z', 'id', 'data-id', 'aria-label', 'a'];
      const input = sss(inputStrings);
            
      let expectedOrderStrings:string[] = [];
      const sortedDefaultPart = sortItemsByActualDefaultOrder(inputStrings, inputStrings);
      expectedOrderStrings.push(...sortedDefaultPart);

      const currentExpectedSet = new Set(expectedOrderStrings);
      const originalOrderRemainingPart = inputStrings.filter(s => !currentExpectedSet.has(s));
      expectedOrderStrings.push(...originalOrderRemainingPart);
            
      const sorted = await sorter.sort(input);
      expect(sorted.map(s => s as string)).toEqual(expectedOrderStrings);
    });
  });

  describe("useAI: 'yes'", () => {
    it('should use AI comparator for items not in custom/default orders (useAI: "yes")', async () => {
      mockAIComparatorInstance.compare.mockImplementation(async (a, b) => {
        return (a as string).localeCompare(b as string); 
      });

      const sorter = await PreferenceSorter.create( sss(['custom1', 'custom2']), 'yes');
      const inputStrings = ['z', 'custom2', 'a', 'id', 'b', 'custom1'];
      const input = sss(inputStrings);
      
      let expectedOrderStrings = ['custom1', 'custom2'];
      const remainingAfterCustom = inputStrings.filter(s => !expectedOrderStrings.includes(s));
      const defaultCandidates = remainingAfterCustom.filter(s => getBaseDefaultOrderIndex(ss(s)) !== Infinity);
      const sortedDefaultPart = sortItemsByActualDefaultOrder(defaultCandidates, inputStrings); 
      expectedOrderStrings.push(...sortedDefaultPart);

      const currentExpectedSet = new Set(expectedOrderStrings);
      const aiItems = inputStrings.filter(s => !currentExpectedSet.has(s));
      aiItems.sort((a,b) => a.localeCompare(b)); 
      expectedOrderStrings.push(...aiItems);

      const sorted = await sorter.sort(input);
      expect(AIComparator.create).toHaveBeenCalledTimes(1); 
      expect(mockAIComparatorInstance.compare).toHaveBeenCalled(); 
      expect(sorted.map(s=>s as string)).toEqual(expectedOrderStrings);
    });

    it('should not call AI if all items covered by custom/default (useAI: "yes")', async () => {
      const sorter = await PreferenceSorter.create( sss(['custom1', 'custom2']), 'yes');
      const inputStrings = ['custom2', 'id', 'custom1'];
      const input = sss(inputStrings);
      
      let expectedOrderStrings = ['custom1', 'custom2'];
      const remainingAfterCustom = inputStrings.filter(s => !expectedOrderStrings.includes(s));
      const defaultCandidates = remainingAfterCustom.filter(s => getBaseDefaultOrderIndex(ss(s)) !== Infinity);
      const sortedDefaultPart = sortItemsByActualDefaultOrder(defaultCandidates, inputStrings);
      expectedOrderStrings.push(...sortedDefaultPart);
      
      const sorted = await sorter.sort(input);
      expect(AIComparator.create).toHaveBeenCalledTimes(1); 
      expect(mockAIComparatorInstance.compare).not.toHaveBeenCalled();
      expect(sorted.map(s=>s as string)).toEqual(expectedOrderStrings);
    });
  });

  describe("useAI: 'stable'", () => {
    it('should use AI (rawCompare) and Bradley-Terry for stable sort (useAI: "stable")', async () => {
      mockAIComparatorInstance.rawCompare.mockImplementation(async (itemA_ss, itemB_ss) => {
        const itemA = itemA_ss as string; const itemB = itemB_ss as string;
        if (itemA === 'a' && (itemB === 'b' || itemB === 'c')) return [1, 0]; 
        if (itemA === 'b' && itemB === 'c') return [1, 0]; 
        if (itemB === 'a' && (itemA === 'b' || itemA === 'c')) return [0, 1]; 
        if (itemB === 'b' && itemA === 'c') return [0, 1]; 
        return [0.5, 0.5]; 
      });
      (bradleyTerry as jest.Mock).mockReturnValue([0.1, 0.6, 0.3]); // Scores for c, a, b

      const sorter = await PreferenceSorter.create( [], 'stable'); 
      const input = sss(['c', 'a', 'b']);
      const expected = sss(['a', 'b', 'c']);
      
      const sorted = await sorter.sort(input);
      expect(AIComparator.create).toHaveBeenCalledTimes(1);
      expect(mockAIComparatorInstance.rawCompare).toHaveBeenCalled();
      expect(bradleyTerry).toHaveBeenCalledTimes(1);
      expect((bradleyTerry as jest.Mock).mock.calls[0][0]).toEqual([[0,0,0],[1,0,1],[1,0,0]]);
      expect(sorted).toEqual(expected);
    });

    it('should fall back to non-AI DAG sort if bradleyTerry results are all equal (useAI: "stable")', async () => {
      (bradleyTerry as jest.Mock).mockReturnValue([0.5, 0.5, 0.5]); 
      const sorter = await PreferenceSorter.create( [], 'stable');
      const input = sss(['c', 'a', 'b']); 
      // Fallback to original relative order for AI-processed items if BT scores are equal
      const expected = sss(['c', 'a', 'b']); 
      
      const sorted = await sorter.sort(input);
      expect(bradleyTerry).toHaveBeenCalledTimes(1);
      expect(sorted).toEqual(expected);
    });

    it('should still use custom/default orders first (useAI: "stable")', async () => {
      mockAIComparatorInstance.rawCompare.mockImplementation(async (a_ss,b_ss) => {
        const a = a_ss as string; const b = b_ss as string;
        if (a === 'z' && b === 'y') return [1,0]; // z preferred over y
        if (a === 'y' && b === 'z') return [0,1]; 
        return [0.5, 0.5];
      });
      (bradleyTerry as jest.Mock).mockImplementation((wins: number[][]) => {
          // Input to BT will be [z,y] if those are the AI items.
          // rawCompare(z,y) -> [1,0]. wins matrix for [z,y] is [[0,1],[0,0]]
          if (wins.length === 2 && wins[0][0] === 0 && wins[0][1] === 1 && wins[1][0] === 0 && wins[1][1] === 0) {
            return [0.6, 0.4]; // Scores for z, y => z comes first
          }
          const n = wins.length; return Array.from({length:n}, (_,i)=> n-i); // Fallback
      });

      const sorter = await PreferenceSorter.create( sss(['custom']), 'stable');
      const inputStrings = ['z', 'default', 'y', 'custom'];
      const input = sss(inputStrings);
      
      let expectedOrderStrings = ['custom'];
      const remainingAfterCustom = inputStrings.filter(s => !expectedOrderStrings.includes(s));
      const defaultCandidates = remainingAfterCustom.filter(s => getBaseDefaultOrderIndex(ss(s)) !== Infinity);
      const sortedDefaultPart = sortItemsByActualDefaultOrder(defaultCandidates, inputStrings);
      expectedOrderStrings.push(...sortedDefaultPart);

      const currentExpectedSet = new Set(expectedOrderStrings);
      const aiItems = inputStrings.filter(s => !currentExpectedSet.has(s));
      // AI part: z, y. Mocked rawCompare and BT should sort them as z, y.
      // (Assuming 'z' and 'y' are the only items left for AI processing here)
      if (aiItems.length === 2 && aiItems.includes('z') && aiItems.includes('y')) {
         expectedOrderStrings.push('z', 'y');
      } else {
         expectedOrderStrings.push(...aiItems); // Fallback, though test expects z,y
      }
      
      const sorted = await sorter.sort(input);
      expect(sorted.map(s => s as string)).toEqual(expectedOrderStrings);
    });
  });
});
