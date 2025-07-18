import PreferenceSorter from '../src/preference-sorter';
import { SplitString } from '../src/split-identifier';
import AIComparator from '../src/ai-cmp';

jest.mock('../src/ai-cmp', () => ({
    create: jest.fn().mockResolvedValue({
        compare: jest.fn().mockImplementation(async (a, b) => a.localeCompare(b)),
        rawCompare: jest.fn().mockResolvedValue([0.6, 0.4]),
    }),
}));

describe('PreferenceSorter', () => {
    it('should sort based on custom order', async () => {
        const sorter = await PreferenceSorter.create('no', ['c', 'b', 'a']);
        const sorted = await sorter.sort(['a', 'b', 'c'] as SplitString[]);
        expect(sorted).toEqual(['c', 'b', 'a']);
    });

    it('should use AI for sorting when specified', async () => {
        const sorter = await PreferenceSorter.create('yes', []);
        const sorted = await sorter.sort(['c', 'b', 'a'] as SplitString[]);
        expect(sorted).toEqual(['a', 'b', 'c']);
    });

    it('should use stable AI for sorting when specified', async () => {
        const sorter = await PreferenceSorter.create('stable', []);
        const sorted = await sorter.sort(['c', 'b', 'a'] as SplitString[]);
        expect(sorted.length).toBe(3);
    });
});
