import { CurrentTimeTool } from '../services/tools/current-time.tool';
import { WebSearchTool } from '../services/tools/web-search.tool';
import { ToolLogger } from '../services/tools/tool.interface';
import { createTools } from '../services/tools';

describe('Tools', () => {
  const mockLogger: ToolLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('CurrentTimeTool', () => {
    it('should create a tool with the correct name and description', () => {
      const tool = new CurrentTimeTool().createTool(mockLogger);
      
      expect(tool.name).toBe('get_current_time');
      expect(tool.description).toContain('current server time');
    });
    
    it('should return ISO formatted date', async () => {
      const tool = new CurrentTimeTool().createTool(mockLogger);
      
      // Mock Date to ensure consistent test
      const mockDate = new Date('2025-06-20T12:00:00Z');
      const spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
        try {
        const result = await tool.func('');
        expect(result).toBe('2025-06-20T12:00:00.000Z');
      } finally {
        spy.mockRestore();
      }
    });
  });
  
  describe('WebSearchTool', () => {
    const mockFetch = jest.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch;
      
      // Setup mock for fetch
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`
            <html>
              <body>
                <div class="result__body">
                  <div class="result__title"><a href="/url?uddg=https%3A%2F%2Fexample.com">Test Result</a></div>
                  <div class="result__snippet">This is a test result snippet.</div>
                  <div class="result__url">example.com</div>
                </div>
              </body>
            </html>
          `),
        });
      });
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });
    
    it('should create a tool with the correct name and description', () => {
      const tool = new WebSearchTool().createTool(mockLogger);
      
      expect(tool.name).toBe('web_search');
      expect(tool.description).toContain('Search the web');
    });
    
    it('should fetch and parse search results', async () => {
      const tool = new WebSearchTool().createTool(mockLogger);
      const result = await tool.func('test query');
      
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('q=test%20query'));
      expect(mockLogger.log).toHaveBeenCalledWith('Performing web search for: test query');
      expect(result).toContain('Test Result');
      expect(result).toContain('This is a test result snippet.');
    });
    
    it('should handle fetch errors', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      });
      
      const tool = new WebSearchTool().createTool(mockLogger);
      const result = await tool.func('test query');
      
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toContain('Error performing web search');
    });
  });
  
  describe('createTools', () => {
    it('should return an array of tools', () => {
      const tools = createTools(mockLogger);
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe('get_current_time');
      expect(tools[1].name).toBe('web_search');
    });
  });
});
