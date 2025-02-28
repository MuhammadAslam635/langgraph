import { tool } from '@langchain/core/tools';
import { ChatOpenAI, OpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import {
  SystemMessage,
  ToolMessage,
  AIMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { config } from "dotenv";

config();

@Injectable()
export class AppService {
  private llm: ChatOpenAI;
  private tools: any[];
  private toolsByName: Record<string, any>;
  private llmWithTools: any;

  constructor() {
    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || "your-api-key",
      modelName: "gpt-4o-mini",
    });

    // Define the tools
    const multiply = tool(
      async ({ a, b }: { a: number; b: number }) => {
        console.log("Multiplication");
        return `The product of ${a} and ${b} is ${a * b}`;
      },
      {
        name: "multiply",
        description: "Multiply two numbers together",
        schema: z.object({
          a: z.number().describe("first number"),
          b: z.number().describe("second number"),
        }),
      }
    );

    const factorial = tool(
      async ({ a }: { a: number }) => {
        console.log("Factorial");
        let result = 1;
        for (let i = 1; i <= a; i++) {
          result *= i;
        }
        return `The factorial of ${a} is ${result}`;
      },
      {
        name: "factorial",
        description: "Calculate the factorial of a number",
        schema: z.object({
          a: z.number().min(0).describe("The number to calculate the factorial of"),
        }),
      }
    );

    const add = tool(
      async ({ a, b }: { a: number; b: number }) => {
        console.log("Addition");
        return `The sum of ${a} and ${b} is ${a + b}`;
      },
      {
        name: "add",
        description: "Add two numbers together",
        schema: z.object({
          a: z.number().describe("first number"),
          b: z.number().describe("second number"),
        }),
      }
    );

    const divide = tool(
      async ({ a, b }: { a: number; b: number }) => {
        console.log("Division");
        return `The result of dividing ${a} by ${b} is ${a / b}`;
      },
      {
        name: "divide",
        description: "Divide two numbers",
        schema: z.object({
          a: z.number().describe("first number"),
          b: z.number().describe("second number"),
        }),
      }
    );

    this.tools = [add, multiply, divide, factorial];
    this.toolsByName = Object.fromEntries(this.tools.map((tool) => [tool.name, tool]));
    // Bind tools to the LLM so it knows about tool capabilities.
    this.llmWithTools = this.llm.bindTools(this.tools);
  }

  async llmCall(state: typeof MessagesAnnotation.State) {
    // Use the bound LLM (llmWithTools) so tool calls are enabled.
    const result = await this.llmWithTools.invoke([
      {
        role: "system",
        content: "You are a helpful assistant tasked with performing arithmetic on a set of inputs.",
      },
      ...state.messages,
    ]);
    return { messages: [result] };
  }

  async toolNode(state: typeof MessagesAnnotation.State) {
    const results: ToolMessage[] = [];
    const lastMessage = state.messages.at(-1);

    // Check if the last message contains tool calls.
    if (lastMessage instanceof AIMessage && lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
      for (const toolCall of lastMessage.tool_calls) {
        if (!toolCall) {
          throw new Error("Tool call is missing or invalid.");
        }

        const toolCallId = String(toolCall.id);
        const tool = this.toolsByName[toolCall.name];

        if (!tool) {
          throw new Error(`Tool "${toolCall.name}" not found.`);
        }

        // Invoke the tool with the provided arguments.
        const observation = await tool.invoke(toolCall.args);

        // Create a ToolMessage with the tool's output,
        // using the tool call ID to correctly link the response.
        const toolMessage = new ToolMessage({
          content: observation,
          tool_call_id: toolCallId,
        });
        results.push(toolMessage);
      }
    }

    return { messages: results };
  }

  // Determines whether we should route to the tools node.
  shouldContinue(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages.at(-1);

    // If the last message contains any tool calls, route to the "tools" node.
    if (lastMessage  instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    }

    // Otherwise, end the graph.
    return "__end__";
  }

  // Build the state graph (workflow) for our agent.
  async buildAgent() {
    const agentBuilder = new StateGraph(MessagesAnnotation)
      .addNode("llmCall", this.llmCall.bind(this))
      .addNode("tools", this.toolNode.bind(this))
      .addEdge("__start__", "llmCall")
      .addConditionalEdges(
        "llmCall",
        this.shouldContinue.bind(this),
        {
          tools: "tools",
          __end__: "__end__",
        }
      )
      .addEdge("tools", "llmCall")
      .compile();

    return agentBuilder;
  }

  async runAgent(prompt: string) {
    const agent = await this.buildAgent();

    // Invoke the agent with a user prompt.
    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];
    const result = await agent.invoke({ messages });
    console.log("OutPut:", result.messages);
    return result.messages[result.messages.length - 1].content;
  }

  getHello(): string {
    return "Hello World";
  }
}
