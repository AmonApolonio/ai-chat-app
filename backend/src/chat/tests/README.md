# NestJS Chat App Testing

This repository includes comprehensive test mocking for the LLM, agent, tools, and rate-limit implementations using Jest.

## Testing Structure

The tests are located in the `src/chat/tests` directory with the following structure:

- `mocks/`: Contains mock implementations of external dependencies
  - `agent.config.mock.ts`: Mocks for agent configuration
  - `agent.factory.mock.ts`: Mocks for agent factory
  - `agent.llm.mock.ts`: Mocks for LLM streaming and formatting
  - `chat-openai.mock.ts`: Mock implementation of ChatOpenAI from Langchain
  - `rate-limit.guard.mock.ts`: Mock for rate-limit guard
  - `tools.mock.ts`: Mocks for agent tools

- Test files:
  - `agent.config.spec.ts`: Tests for agent configuration
  - `agent.factory.spec.ts`: Tests for agent factory
  - `agent.llm.spec.ts`: Tests for LLM implementation
  - `agent.service.spec.ts`: Tests for agent service
  - `rate-limit.guard.spec.ts`: Tests for rate-limit guard
  - `tools.spec.ts`: Tests for tools implementation

## Running Tests

To run all tests:

```bash
npm test -- --config=jest.config.ts
```

To run tests with coverage:

```bash
npm run test:cov -- --config=jest.config.ts
```

To run tests in watch mode:

```bash
npm run test:watch -- --config=jest.config.ts
```

## Testing Approach

### LLM Mocking

The LLM functionality is mocked to simulate streaming responses without making actual API calls. This includes:

1. Mocking `ChatOpenAI` class to simulate both regular and streaming responses
2. Mocking `streamLlmResponse` function to generate events similar to real streaming
3. Testing token handling and event triggering

### Agent Mocking

The agent implementation is mocked to simulate tool execution and response generation:

1. Mocking `createAgent` to return a mock executor
2. Mocking tool execution and intermediate steps
3. Testing proper handling of system prompts and chat history

### Tools Mocking

Tools are mocked to simulate specific functionality:

1. Current Time Tool: Returns mock timestamps
2. Web Search Tool: Returns mock search results without making actual web requests
3. Testing proper tool registration and execution

### Rate Limiting Mocking

The rate-limit guard is tested for:

1. Proper handling of requests under the limit
2. Correct rejection of requests over the limit
3. Resetting limits after the time window expires