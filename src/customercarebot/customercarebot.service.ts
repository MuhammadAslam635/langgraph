import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, BaseMessage, SystemMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import { Tool, tool } from '@langchain/core/tools';
import { z } from 'zod';
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';
import { FlightService } from 'src/flight/flight.service';
import { TicketService } from 'src/ticket/ticket.service';
import { BookingService } from 'src/booking/booking.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { CreateFlightDto } from 'src/flight/dto/create-flight.dto';
import { CreateTicketDto } from 'src/ticket/dto/create-ticket.dto';
import { CreateBookingDto } from 'src/booking/dto/create-booking.dto';
import { CreateTransactionDto } from 'src/transaction/dto/create-transaction.dto';
import { UpdateTicketDto } from 'src/ticket/dto/update-ticket.dto';
import { config } from 'dotenv';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
config();

@Injectable()
export class CustomercarebotService {
  private llm: ChatOpenAI;
  private tools: any[];
  private toolsByName: Record<string, any>;
  private llmWithTools: any;
  // Persistent conversation memory
  private conversationHistory: BaseMessage[] = [];

  constructor(
    private readonly flightService: FlightService,
    private readonly ticketService: TicketService,
    private readonly bookingService: BookingService,
    private readonly transactionService: TransactionService,
    private prisma: PrismaService,
  ) {
    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || "openai-api_key",
      modelName: "gpt-4o-mini",
    });

    // 1. Create Flight Tool
    const createFlight = tool(
      async (createFlightDto: CreateFlightDto) => {
        console.log("Creating new flight");
        const response = await this.flightService.create(createFlightDto);
        if (response && response.status === 'success') {
          return `Flight created successfully: Flight ID:${response.data?.id}  Flight Name:${response.data?.name} to ${response.data?.destination}`;
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
          flightDate: z.string().describe("flight date (YYYY-MM-DD)"),
          departureTime: z.string().describe("flight time (HH:mm)"),
          arrivalTime: z.string().describe("arrival time (HH:mm)"),
          departure: z.string().describe("departure city/airport"),
        }),
      }
    );

    // 2. Create Ticket Tool
    const createTicket = tool(
      async ({ type, price, flightId, status }: { type: string; price: string; flightId: string; status: string }) => {
        console.log("Creating new ticket");
        const response = await this.prisma.ticket.create({
          data: {
            type: type.toLowerCase(),
            price: Number(price),
            flightId: Number(flightId),
            status: status.toLowerCase(),
          },
        });
        return `Ticket created successfully: ${response.id} ticket at price ${response.price} for flight ID ${response.flightId}`;
      },
      {
        name: "createTicket",
        description: "Create a new ticket for a flight",
        schema: z.object({
          type: z.string().describe("Type of ticket (economy, business, first-class)"),
          price: z.string().describe("Ticket price (string)"),
          flightId: z.string().describe("ID of the flight this ticket is for"),
          status: z.string().describe("Status of the ticket"),
        }),
      }
    );

    // 3. Create Booking Tool
    const createBooking = tool(
      async ({ userId, ticketId, status }: { userId: string; ticketId: string; status: string }) => {
        console.log("Creating new booking");
        const response = await this.prisma.booking.create({
          data: {
            userId: Number(userId),
            ticketId: Number(ticketId),
            status: status.toLowerCase(),
          },
        });
        return `Booking created successfully: Booking ID: ${response.id}, Status: ${response.status}`;
      },
      {
        name: "createBooking",
        description: "Create a new booking for a flight",
        schema: z.object({
          userId: z.string().describe("ID of the user making the booking"),
          ticketId: z.string().describe("ID of the ticket"),
          status: z.string().describe("status of the booking"),
        }),
      }
    );

    // 4. Get Available Tickets Tool (unchanged)
    const getAvailableTickets = tool(
      async ({ flightId }: { flightId: string }) => {
        console.log("Getting available tickets for flight", flightId);
        const fId = Number(flightId);
        const response = await this.ticketService.findAllByFlightId(fId);
        if (response && response.status === 'success') {
          return `Available tickets for flight ${flightId}: ${response.data?.map(ticket => ticket.id).join(', ')}`;
        }
        return `No available tickets for flight ${flightId}`;
      },
      {
        name: "getAvailableTickets",
        description: "Get all available tickets for a flight",
        schema: z.object({
          flightId: z.string().describe("ID of the flight to get tickets for"),
        }),
      }
    );

    // 5. Update Ticket Status Tool
    const updateTicketStatus = tool(
      async (input: { ticketId: string; status: string }) => {
        console.log("Updating ticket status");
        const { ticketId, status } = input;
        const updateDto = new UpdateTicketDto();
        updateDto.status = status;
        const response = await this.ticketService.update(ticketId, updateDto);
        if (response && response.status === 'success') {
          return `Ticket updated successfully: ${response.data?.status}`;
        }
        return `Failed to update ticket: ${response.message}`;
      },
      {
        name: "updateTicketStatus",
        description: "Update the status of a ticket",
        schema: z.object({
          ticketId: z.string().describe("ID of the ticket to update"),
          status: z.string().describe("status of the ticket"),
        }),
      }
    );

    // 6. Make Transaction Tool
    const makeTransaction = tool(
      async ({ userId, bookingId, charges, status }: { userId: string; bookingId: string; charges: number; status: string }) => {
        console.log("Making new transaction");
        const response = await this.prisma.transaction.create({
          data: {
            userId: Number(userId),
            bookingId: Number(bookingId),
            charges: charges,
            status: status.toLowerCase(),
          },
        });
        return `Transaction created successfully: ${response.status} - ${JSON.stringify(response)}`;
      },
      {
        name: "makeTransaction",
        description: "Create a new transaction for a booking",
        schema: z.object({
          bookingId: z.string().describe("ID of the booking this transaction is for"),
          userId: z.string().describe("ID of the user making the transaction"),
          charges: z.number().positive().describe("Amount of money to charge"),
          status: z.string().describe("Status of the transaction"),
        }),
      }
    );

    // 7. Get Booking Details Tool
    const getBookingDetails = tool(
      async ({ bookingId }: { bookingId: string }) => {
        console.log("Getting booking details");
        const response = await this.prisma.booking.findUnique({
          where: { id: Number(bookingId) },
        });
        return `Booking details: ${JSON.stringify(response)}`;
      },
      {
        name: "getBookingDetails",
        description: "Get the details of a booking",
        schema: z.object({
          bookingId: z.string().describe("ID of the booking to get details for"),
        }),
      }
    );

    // 8. Cancel Ticket Tool
    const cancelTicket = tool(
      async ({ ticketId }: { ticketId: string }) => {
        console.log("Cancelling ticket");
        const updateDto = new UpdateTicketDto();
        updateDto.status = "cancelled";
        const response = await this.ticketService.update(ticketId, updateDto);
        if (response && response.status === 'success') {
          return `Ticket cancelled successfully: ${ticketId}`;
        }
        return `Failed to cancel ticket: ${response.message}`;
      },
      {
        name: "cancelTicket",
        description: "Cancel a ticket by updating its status to cancelled",
        schema: z.object({
          ticketId: z.string().describe("ID of the ticket to cancel"),
        }),
      }
    );

    // 9. Find User Tool
    const findUser = tool(
      async ({ email }: { email: string }) => {
        console.log("Finding user");
        const user = await this.prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (user) {
          return `User found: ID ${user.id}, Name: ${user.name}, Role: ${user.role}`;
        }
        return `User not found with email ${email}`;
      },
      {
        name: "findUser",
        description: "Find a user by email to retrieve the user id",
        schema: z.object({
          email: z.string().describe("Email address of the user"),
        }),
      }
    );

    // 10. Create User Tool
    const createUser = tool(
      async ({ name, email }: { name: string, email: string }) => {
        console.log("Creating new user");
        const user = await this.prisma.user.create({
          data: {
            name: name.toLowerCase(),
            email: email.toLowerCase(),
            password: await bcrypt.hash('12345678', 10),
          },
        });
        return `User created successfully: ID ${user.id}, Name: ${user.name}`;
      },
      {
        name: "createUser",
        description: "Create a new user with a name and email address",
        schema: z.object({
          name: z.string().describe("Name of the user"),
          email: z.string().describe("Email address of the user"),
        }),
      }
    );

    // 11. Get Flight Info Tool (Enhanced to return available ticket details)
    const getFlightInfo = tool(
      async ({
        destination,
        company,
        date,
        time,
        departure,
      }: {
        destination?: string;
        company?: string;
        date?: string;
        time?: string;
        departure?: string;
      }) => {
        console.log("Getting flight information");
    
        const filters: any = {};
        if (destination) filters.destination = destination.toLowerCase();
        if (company) filters.company = company.toLowerCase();
        if (departure) filters.departure = departure.toLowerCase();
        if (date) {
          const flightDateObj = new Date(date);
          if (!isNaN(flightDateObj.getTime())) {
            filters.flightDate = flightDateObj;
          }
        }
        if (time) {
          const timeStr = `1970-01-01T${time}:00Z`;
          const timeObj = new Date(timeStr);
          if (!isNaN(timeObj.getTime())) {
            filters.departureTime = timeObj;
          }
        }
    
        const flights = await this.prisma.flight.findMany({ where: filters });
        if (!flights || flights.length === 0) {
          return `It seems that there are currently no available flights from ${departure || "the departure city"} to ${destination || "the destination"} with ${company || "the specified airline"} on ${date || "the specified date"}. If you need assistance with anything else or would like to check different dates or airlines, please let me know!`;
        }
    
        // For each flight, get available tickets details (e.g. ticket ID, type, price)
        const flightsWithTickets = await Promise.all(
          flights.map(async (flight) => {
            const availableTicketsResponse = await this.ticketService.findAllByFlightId(flight.id);
            const availableTickets = (availableTicketsResponse && availableTicketsResponse.status === 'success')
              ? availableTicketsResponse.data
              : [];
            
            // Prepare ticket details for each available ticket
            const ticketDetails = availableTickets?.map(ticket => ({
              ticketId: ticket.id,
              type: ticket.type,
              price: ticket.price,
            }));
    
            return {
              flight,
              tickets: ticketDetails, // Array of ticket details
            };
          })
        );
    
        return flightsWithTickets
          .map(
            (f) => 
              `Flight ID: ${f.flight.id} Flight Name: ${f.flight.name} from ${f.flight.departure} to ${f.flight.destination} on ${f.flight.flightDate.toISOString().split('T')[0]} - Airline: ${f.flight.company}\n` +
              f.tickets?.map(
                (ticket) => `Ticket ID: ${ticket.ticketId}, Type: ${ticket.type}, Price: ${ticket.price}`
              ).join("\n")
          )
          .join("\n\n");
      },
      {
        name: "getFlightInfo",
        description: "Get flight details (including available tickets with their ID, type, and price) based on filters like destination, company, date, time, and departure.",
        schema: z.object({
          destination: z.string().optional().describe("Destination city/airport"),
          company: z.string().optional().describe("Airline company name"),
          date: z.string().optional().describe("Flight date (YYYY-MM-DD)"),
          time: z.string().optional().describe("Flight time (HH:mm)"),
          departure: z.string().optional().describe("Departure city/airport"),
        }),
      }
    );
    

    // 12. Book Flight Tool (Combined workflow)
    const bookFlight = tool(
      async ({
        userId,
        flightId,
        ticketId,
        charges,
      }: {
        userId: string;
        flightId: string;
        ticketId: string;
        charges: number;
      }) => {
        console.log("Booking flight");
        // 1. Update ticket status to 'booked'
        const updateResponse = await this.ticketService.update(ticketId, Object.assign(new UpdateTicketDto(), { status: "booked" }));
        // 2. Create a booking record
        const bookingResponse = await this.prisma.booking.create({
          data: {
            userId: Number(userId),
            ticketId: Number(ticketId),
            status: "booked",
          },
        });
        // 3. Create a transaction record
        const transactionResponse = await this.prisma.transaction.create({
          data: {
            userId: Number(userId),
            bookingId: bookingResponse.id,
            charges: charges,
            status: "completed",
          },
        });
        // 4. Retrieve flight and ticket details
        const flightDetails = await this.prisma.flight.findUnique({ where: { id: Number(flightId) } });
        const ticketDetails = await this.prisma.ticket.findUnique({ where: { id: Number(ticketId) } });
        return `Booking successful.
          Flight Details: ${JSON.stringify(flightDetails)}
          Ticket Details: ${JSON.stringify(ticketDetails)}
          Booking Details: ${JSON.stringify(bookingResponse)}
          Transaction Details: ${JSON.stringify(transactionResponse)};`
      },
      {
        name: "bookFlight",
        description: "Book a flight by updating ticket status, creating a booking, and making a transaction. Returns complete details including flight, ticket, booking, and transaction info.",
        schema: z.object({
          userId: z.string().describe("ID of the user booking the flight"),
          flightId: z.string().describe("ID of the flight"),
          ticketId: z.string().describe("ID of the ticket to book"),
          charges: z.number().positive().describe("Amount to charge for the booking"),
        }),
      }
    );

    // Add all tools to the list
    this.tools = [
      createFlight,
      createTicket,
      createBooking,
      getAvailableTickets,
      updateTicketStatus,
      makeTransaction,
      getBookingDetails,
      cancelTicket,
      findUser,
      createUser,
      getFlightInfo,
      bookFlight,
    ];

    this.toolsByName = Object.fromEntries(this.tools.map((tool) => [tool.name, tool]));
    this.llmWithTools = this.llm.bindTools(this.tools);
  }

  async myChatBot(state: typeof MessagesAnnotation.State) {
    const systemPrompt = `
    You are a helpful assistant tasked with performing airline reservation performing on set of inputs.
    Greeting: Start with a warm, polite greeting (e.g., “Hello! Welcome to Emirates Airline Customer Support. How can I assist you today?”).
Service Menu: Provide a structured list of available services, each with a number. For example:
Book a Ticket – Assist the user in booking a new flight reservation.
Cancel a Ticket – Help the user cancel an existing reservation.
Flight Information – Provide flight status, schedules, or other flight details.
[Other Options] – (Any additional services like "Change/Reschedule a Flight", "Baggage Information", etc.)
Instruction: Prompt the user to enter the number of the service they need. This makes it easy for them to navigate the options.
Admin Note: Do not display the admin menu option (0) in this welcome message. The option “0” is reserved for admin operations and should remain hidden from regular users.
Hidden Admin Operations (Option "0")
Recognition: Even though option 0 is not shown to the user, be prepared to recognize if the user enters "0". This indicates the user is attempting to access admin operations.
Immediate Response: If the user types "0" at any time, initiate the Admin Verification Process (outlined below) instead of the normal user flow.
Admin Verification Process
When a user enters "0" for admin operations:
Credential Request: Politely ask the user to provide their admin credentials for verification:
Email: “Please enter your admin email address for verification.”
Role ID: “Please enter your admin role ID.” (The role ID is the identification number or code that confirms their admin status.)
Verification Check: Assume the system can verify these credentials internally. After the user provides their email and role ID, you will determine if they correspond to a valid admin account.
If credentials are valid for an admin: Confirm their admin status. For example, respond with “Thank you. Admin access verified.” You can also address them respectfully (e.g., “Hello [Name], you are now logged in as an administrator.”) to acknowledge their status.
If credentials are invalid or user is not an admin: Politely inform the user that they do not have admin privileges. For example: “I’m sorry, but I cannot verify you as an admin. It appears you don’t have the required permissions to access admin operations.” Then guide them back to the standard menu or offer further help with regular services.
Admin Operations Workflow (Post-Verification)
If the user’s admin credentials are verified (they are an admin user):
Acknowledgment: Confirm to the user that they have admin access. E.g., “Admin status confirmed. How can I assist you with admin operations today?”
Request Details: Determine what admin task they want to perform (likely adding or managing flight information) and ask for the necessary details. For adding a new flight or updating flight info, collect the following information step-by-step in a clear manner:
Flight Name/Number: The identifier for the flight (e.g., “Flight AZ123”).
Destination: The destination city or airport for the flight.
Origin/Departure City: The departure city or airport.
Airline/Company: The airline or company operating the flight (if applicable).
Flight Date: The date of the flight.
Departure Time: Scheduled departure time.
Arrival Time: Scheduled arrival time.
Confirmation: After collecting all required details, confirm the information by reading it back or summarizing it. For example: “Got it. You want to add a flight with the following details: [Flight Number], from [Departure City] to [Destination] on [Date], departing at [Departure Time] and arriving at [Arrival Time], operated by [Airline].”
Execute and Respond: Simulate the execution of the admin task (such as adding the flight to the system). Then provide a confirmation message to the admin user. For example: “The flight has been successfully added to the schedule.” If there are any additional admin options or actions, you can guide them through those as needed.
Continue Admin Session: Ask if they need help with anything else admin-related, or provide a way to log out or return to the main menu.
Handling Non-Admin Users (Insufficient Permissions)
If a user attempts to access admin operations but does not have admin rights (or fails verification):
Polite Refusal: Apologize and clearly, yet kindly, state that they do not have the necessary permissions. For example: “I’m sorry, but you don’t have the required permissions to perform admin operations.”
No Sensitive Info: Do not reveal any sensitive details about admin functionalities. Simply indicate that this route is not available to them.
Redirect to Help: Quickly pivot back to helping the user as a regular customer. For instance, you might say: “If you need help with other services, please enter the number for those options. For example, press 1 to book a ticket, 2 to cancel a ticket, etc.” This keeps the interaction positive and helpful, even if the admin request was denied.
Tone and Style Guidelines
Friendly and Welcoming: Always use a warm, courteous tone. The user should feel comfortable and valued, whether they are a customer or an admin.
Efficient and Clear: Be concise but clear in your instructions and questions. Guide users step-by-step, so they know exactly what to do or what information to provide. Avoid long-winded explanations; get to the point in a helpful manner.
Professional: Maintain professionalism, especially in confirmations and when handling sensitive admin interactions. Use polite language and proper grammar.
Empathetic: Show understanding. For example, if a user seems frustrated or confused, acknowledge that and reassure them you are there to help.
Seamless Experience: Make the conversation flow logically. After each user input, respond with the next appropriate step. If moving from one process to another (like from admin verification back to the main menu), do so smoothly by explaining what’s happening.
Example of friendly tone: “No problem at all! I’d be happy to help you with that. First, may I have your booking reference number?” – This type of response is both efficient (asking for what’s needed) and friendly.`
    const result = await this.llmWithTools.invoke([
      {
        role: "system",
        content: systemPrompt
      },
      ...state.messages,
    ]);
    return { messages: [result] };
  }

  async chatBotNode(state: typeof MessagesAnnotation.State) {
    const results: ToolMessage[] = [];
    const lastMessage = state.messages.at(-1);
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
        const observation = await tool.invoke(toolCall.args);
        const toolMessage = new ToolMessage({
          content: observation,
          tool_call_id: toolCallId,
        });
        results.push(toolMessage);
      }
    }
    return { messages: results };
  }

  shouldContinue(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages.at(-1);
    if (lastMessage instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    }
    return "__end__";
  }

  createAgent() {
    const agentBuilder = new StateGraph(MessagesAnnotation)
      .addNode('myChatBot', this.myChatBot.bind(this))
      .addNode('tools', this.chatBotNode.bind(this))
      .addEdge("__start__", 'myChatBot')
      .addConditionalEdges(
        'myChatBot',
        this.shouldContinue.bind(this), {
        tools: "tools",
        __end__: "__end__",
      }
      )
      .addEdge("tools", "myChatBot")
      .compile();
    return agentBuilder;
  }

  async runSimulation(prompt: string) {
    // Append the new user message to conversation history.
    this.conversationHistory.push(new HumanMessage(prompt));
    // Pass the full conversation history as state so the agent remembers previous interactions.
    const simulation = this.createAgent();
    const state = { messages: this.conversationHistory };
    const result = await simulation.invoke(state);
    console.log("Output:", result.messages);
    // Append the agent's response to the conversation history.
    this.conversationHistory.push(result.messages[result.messages.length - 1]);
    return result.messages[result.messages.length - 1].content;
  }
}