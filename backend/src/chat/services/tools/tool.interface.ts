import { DynamicTool } from "langchain/tools";

export interface ToolLogger {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

export interface BaseTool {
  createTool(logger: ToolLogger): DynamicTool;
}
