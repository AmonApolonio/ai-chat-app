import { CurrentTimeTool } from './current-time.tool';
import { WebSearchTool } from './web-search.tool';
import { ToolLogger } from './tool.interface';
import { DynamicTool } from 'langchain/tools';

export function createTools(logger: ToolLogger): DynamicTool[] {
  const currentTimeTool = new CurrentTimeTool().createTool(logger);
  const webSearchTool = new WebSearchTool().createTool(logger);
  
  return [currentTimeTool, webSearchTool];
}

export * from './tool.interface';
