import { DynamicTool } from "langchain/tools";
import { ToolLogger, BaseTool } from './tool.interface';

export class CurrentTimeTool implements BaseTool {
  createTool(logger: ToolLogger): DynamicTool {
    return new DynamicTool({
      name: "get_current_time",
      description: "Returns the current server time in ISO format.",
      func: async () => {
        return new Date().toISOString();
      },
    });
  }
}
