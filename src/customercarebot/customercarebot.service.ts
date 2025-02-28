import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import * as tslab from "tslab";
import { config } from "dotenv";
config();

@Injectable()
export class CustomercarebotService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || "openai-api_key",
      modelName: "gpt-4o-mini",
    });
  }

  async myChatBot(messages: BaseMessage[]): Promise<AIMessageChunk> {
    const systemMessage = new SystemMessage({
      content: "You are a customer support agent for an airline."
    });
    const allMessages = [systemMessage, ...messages];
    const response = await this.llm.invoke(allMessages);
    return response;
  }

  async createSimulatedUser(): Promise<Runnable<{ messages: BaseMessage[] }, AIMessageChunk>> {
    const systemPromptTemplate = `You are a customer of an airline company. You are interacting with a customer support agent.
    {instructions}
    If you have nothing more to add to the conversation, you must respond only with a single word: "FINISHED"`;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPromptTemplate],
      ['placeholder', '{messages}'],
    ]);
    const instructions = `Your name is Harrison. You are trying to get a refund for the trip you took to Alaska.
                          You want them to give you ALL the money back. Be extremely persistent. This trip happened 5 years ago.`;

    const partialPrompt = await prompt.partial({ instructions });
    const simulatedUser = partialPrompt.pipe(this.llm);
    return simulatedUser;
  }
  swapRoles(messages: BaseMessage[]): BaseMessage[] {
    return messages.map((m) =>
      m instanceof AIMessage
        ? new HumanMessage({ content: m.content })
        : new AIMessage({ content: m.content }),
    );
  }
  async chatBotNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const chatBotResponse = await this.myChatBot(messages);
    return { messages: [new AIMessage({ content: chatBotResponse.content })] };
  }
  async simulatedUserNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const newMessages = this.swapRoles(messages);
    const simulateUser = await this.createSimulatedUser();
    const response = await simulateUser.invoke({ messages: newMessages });
    return { messages: [new HumanMessage({ content: response.content })] };
  }
  shouldContinue(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    if (messages.length > 6 || messages[messages.length - 1].content === 'FINISHED') {
      return '__end__';
    }
    return 'continue';
  }
  createSimulation() {
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode('user', this.simulatedUserNode.bind(this))
      .addNode('chatbot', this.chatBotNode.bind(this))
      .addEdge('chatbot', 'user')
      .addConditionalEdges('user', this.shouldContinue.bind(this), {
        [END]: END,
        continue: 'chatbot',
      })
      .addEdge(START, 'chatbot');

    return workflow.compile();
  }
  async renderGraph() {
    const drawableGraph = this.createSimulation().getGraph();
    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    await tslab.display.png(new Uint8Array(arrayBuffer));
  }
  async runSimulation(initialMessages: BaseMessage[]): Promise<{ messages: BaseMessage[] }> {
    const simulation = this.createSimulation();
    const finalState = await simulation.invoke({ messages: initialMessages });
    return finalState;
  }
  async startSimulation(prompt: string): Promise<BaseMessage[]> {
    const initialState = { messages: [new HumanMessage({ content: prompt })] };
    const finalState = await this.runSimulation(initialState.messages);
    console.log("Final Simulation Output:", finalState.messages.map(m => m.content));
    return finalState.messages;
  }
}
