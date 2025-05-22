import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import * as tslab from "tslab";
import { config } from "dotenv";
import { tool } from '@langchain/core/tools';

import { FlightService } from 'src/flight/flight.service';
import { CreateFlightDto } from 'src/flight/dto/create-flight.dto';
import { CreateTicketDto } from 'src/ticket/dto/create-ticket.dto';
import { TicketService } from 'src/ticket/ticket.service';
import { z } from 'zod';
import { BookingService } from 'src/booking/booking.service';
import { CreateBookingDto } from 'src/booking/dto/create-booking.dto';
import { CreateTransactionDto } from 'src/transaction/dto/create-transaction.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { UpdateTicketDto } from 'src/ticket/dto/update-ticket.dto';
config();

@Injectable()
export class CustomercarebotService {
  private llm: ChatOpenAI;

  private tools: any[];
  private toolsByName: Record<string, any>;
  private llmWithTools: any;
  constructor(private readonly flightService: FlightService,
    private readonly ticketService: TicketService,
    private readonly bookingService: BookingService,
    private readonly transactionService: TransactionService
  ) {
    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || "openai-api_key",
      modelName: "gpt-4o-mini",
    });
    const createFlight = tool(
      async (createFlightDto: CreateFlightDto) => {
        console.log("Creating new flight");
        const response = await this.flightService.create(createFlightDto);
        if (response && response.status === 'success') {
          return `Flight created successfully: ${response.data.name} to ${response.data.destination}`;
        }
        return `Failed to create flight: ${response.message}`;
      },
      {
        name: "createFlight",
        description: "Create a new flight with name, destination, and company details",
        schema: z.object({
          name: z.string().describe("name of the flight"),
          destination: z.string().describe("destination city/airport"),
          company: z.string().describe("airline company name"),
        }),
      }
    );
  
    const createTicket = tool(
      async (createTicketDto: CreateTicketDto) => {
        console.log("Creating new ticket");
        const response = await this.ticketService.create(createTicketDto);
        if (response && response.status === 'success') {
          return `Ticket created successfully: ${response.data.type} ticket at price ${response.data.price} for flight ID ${response.data.flightId}`;
        }
        return `Failed to create ticket: ${response.message}`;
      },
      {
        name: "createTicket",
        description: "Create a new ticket for a flight",
        schema: z.object({
          type: z.string().describe("type of ticket (economy, business, first-class)"),
          price: z.number().positive().describe("ticket price"),
          flightId: z.string().describe("ID of the flight this ticket is for"),
          status: z.string().describe("status of the ticket"),
        }),
      }
    );
    const createBooking = tool(
      async (createBookingDto: CreateBookingDto) => {
        console.log("Creating new booking");
        const response = await this.bookingService.create(createBookingDto);
        if (response && response.status === 'success') {
          return `Booking created successfully: ${response.data.id}`;
        }
        return `Failed to create booking: ${response.message}`;
      },
      {
        name: "createBooking",
        description: "Create a new booking for a flight",
        schema: z.object({
          flightId: z.string().describe("ID of the flight this booking is for"),
          customerName: z.string().describe("name of the customer making the booking"),
          numberOfTickets: z.number().positive().describe("number of tickets to book"),
        }),
      }
    );
    const getAvailableTickets = tool(
      async (flightId) => {
        console.log("Getting available tickets for flight", flightId);
        const response = await this.ticketService.findAllByFlightId(flightId);
        if (response && response.status === 'success') {
          return `Available tickets for flight ${flightId}: ${response.data.map(ticket => ticket.id).join(', ')}`;
        }
        return `No available tickets for flight ${flightId}`;
      },
      {
        name: "getAvailableTickets",
        description: "Get all available tickets for a flight",
        schema: z.object({ flightId: z.string().describe("ID of the flight to get tickets for") }),
      }
    );
    const updateTicketStatus = tool(
      async (ticketId,updateTicketDto:UpdateTicketDto) => {
        console.log("Updating ticket status");
        const response = await this.ticketService.update(ticketId,updateTicketDto);
        if (response && response.status === 'success') {
          return `Ticket updated successfully: ${response.data.id}`;
        }
        return `Failed to update ticket: ${response.message}`;
      },
      {
        name: "updateTicketStatus",
        description: "Update the status of a ticket",
        schema: z.object({ ticketId: z.string().describe("ID of the ticket to update") }),
        status: z.string().describe("status of the ticket"),
      }
    );
    const makeTransaction = tool(
      async (makeTransactionDto: CreateTransactionDto) => {
        console.log("Making new transaction"  );
        const response = await this.transactionService.create(makeTransactionDto);
        if (response && response.status === 'success') {
          return `Transaction created successfully: ${response.data.id}`;
        }
        return `Failed to create transaction: ${response.message}`;
      },
      {
        name: "makeTransaction",
        description: "Create a new transaction for a booking",
        schema: z.object({
          bookingId: z.string().describe("ID of the booking this transaction is for"),
          userId: z.string().describe("ID of the user making the transaction"),
          charges: z.number().positive().describe("amount of money to charge"),
          status: z.string().describe("status of the transaction"),
        }),
      }
    );
    const getBookingDetails = tool(
      async (bookingId) => {
        console.log("Getting booking details");
        const response = await this.bookingService.findById(bookingId);
        if (response && response.status === 'success') {
          return `Booking details: ${response.data.id}`;
        }
        return `Failed to get booking details: ${response.message}`;
      },
      {
        name: "getBookingDetails",
        description: "Get the details of a booking",
        schema: z.object({ bookingId: z.string().describe("ID of the booking to get details for") }),
      }
    );
    this.tools = [createFlight, createTicket, createBooking, getAvailableTickets, updateTicketStatus, makeTransaction, getBookingDetails];
    this.toolsByName = Object.fromEntries(this.tools.map((tool) => [tool.name, tool]));
    this.llmWithTools = this.llm.bindTools(this.tools);
  }
  

  async myChatBot(messages: BaseMessage[]): Promise<AIMessageChunk> {
    const systemMessage = new SystemMessage({
      content: "You are a helpful assistant tasked with performing customer support agent for an airline."
    });
    const allMessages = [systemMessage, ...messages];
    const response = await this.llmWithTools.invoke(allMessages);
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
    const results:  ToolMessage[] =[];
    const messages = state.messages;
    const lastMessage = messages.at(-1);
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
    // const chatBotResponse = await this.myChatBot(messages);
    // return { messages: [new AIMessage({ content: chatBotResponse.content })] };
  }
  async simulatedUserNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const newMessages = this.swapRoles(messages);
    const simulateUser = await this.createSimulatedUser();
    const response = await simulateUser.invoke({ messages: newMessages });
    return { messages: [new HumanMessage({ content: response.content })] };
  }
  shouldContinue(state: typeof MessagesAnnotation.State) {
    // const messages = state.messages;
    // if (messages.length > 6 || messages[messages.length - 1].content === 'FINISHED') {
    //   return '__end__';
    // }
    // return 'continue';
    const messages = state.messages;
    const lastMessage = messages.at(-1);

    // If the last message contains any tool calls, route to the "tools" node.
    if (lastMessage  instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    }

    // Otherwise, end the graph.
    return "__end__";
  }
  createAgent() {
    const agentBuilder = new StateGraph(MessagesAnnotation)
      .addNode('chatbot', this.myChatBot.bind(this))
      .addNode('tools', this.chatBotNode.bind(this))
      .addEdge("__start__", 'chatbot')
      .addConditionalEdges(
        'chatbot',
         this.shouldContinue.bind(this), {
          tools: "tools",
          __end__: "__end__",
      })
      .addEdge("tools", "chatbot")
      .compile();

    return agentBuilder;
  }
  // async renderGraph() {
  //   const drawableGraph = this.createAgent().getGraph();
  //   const image = await drawableGraph.drawMermaidPng();
  //   const arrayBuffer = await image.arrayBuffer();
  //   await tslab.display.png(new Uint8Array(arrayBuffer));
  // }
  async runSimulation(prompt: string) {
    const simulation = this.createAgent();
   const messages = [
    {
      role: "user",
      content: prompt,
    },
   ]
   const result = await simulation.invoke({ messages });
   console.log("OutPut:", result.messages);
   return result.messages[result.messages.length - 1].content;
  }
  // async startChat(prompt: string): Promise<BaseMessage[]> {
  //   const initialState = { messages: [new HumanMessage({ content: prompt })] };
  //   const finalState = await this.runSimulation(initialState.messages);
  //   console.log("Final Simulation Output:", finalState.messages.map(m => m.content));
  //   return finalState.messages;
  // }
}
