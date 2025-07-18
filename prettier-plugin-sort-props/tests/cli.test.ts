import path from 'node:path';

const mockParseArgs = jest.fn();

jest.mock('node:util', () => ({
    ...jest.requireActual('node:util'),
    parseArgs: (config: any) => mockParseArgs(config)
}));

const mockReadFileSync = jest.fn();
const mockGlobSync = jest.fn();

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    readFileSync: (path: string, options: any) => mockReadFileSync(path, options),
    globSync: (pattern: string, options: any) => mockGlobSync(pattern, options)
}));

const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockProcessExit = jest.fn();

global.console = {
    ...global.console,
    log: mockConsoleLog,
    error: mockConsoleError
};

const originalProcess = process;
global.process = {
    ...global.process,
    exit: mockProcessExit as (code?: number) => never,
    cwd: () => path.resolve(__dirname)
};

describe('CLI', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should extract order from files', async () => {
        mockParseArgs.mockReturnValue({
            positionals: ['extract-order', 'src/**/*.tsx'],
            values: { exclude: [] }
        });
        mockGlobSync.mockReturnValue(['src/component.tsx']);
        mockReadFileSync.mockReturnValue('<div b="2" a="1" />');

        await import('../src/cli');

        expect(mockConsoleLog).toHaveBeenCalledWith('"sortPropsCustomOrder":', expect.any(String));
    });

    it('should show help if no command is provided', async () => {
        mockParseArgs.mockReturnValue({
            positionals: [],
            values: { exclude: [] }
        });

        await import('../src/cli');

        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
        expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
});
