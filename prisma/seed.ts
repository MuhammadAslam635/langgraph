const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function main() {
  // Delete data in the proper order to avoid foreign key errors.
  await prisma.transaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users
  for (let i = 0; i < 20; i++) {
    await prisma.user.create({
      data: {
        name: faker.person.fullName().toLowerCase(),
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password(),
        emailVerifiedAt: faker.date.past(),
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Seed Flights with updated date and time fields
  for (let i = 0; i < 20; i++) {
    // Generate a future flight date and set its time to midnight (date-only)
    const futureDate = faker.date.future();
    const flightDateOnly = new Date(futureDate.toDateString()); // time is 00:00

    // Generate random departure time (HH:mm) as a time-only value.
    const randomHour = faker.number.int({ min: 0, max: 23 });
    const randomMinute = faker.number.int({ min: 0, max: 59 });
    // Create a Date object with a fixed base date (1970-01-01) for time-only values.
    const departureTime = new Date(`1970-01-01T${String(randomHour).padStart(2, '0')}:${String(randomMinute).padStart(2, '0')}:00Z`);

    // Generate arrival time: add 1 to 5 hours to departureTime.
    const additionalHours = faker.number.int({ min: 1, max: 5 });
    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + additionalHours);

    await prisma.flight.create({
      data: {
        name: faker.company.name().toLowerCase(),
        slug: faker.lorem.slug().toLowerCase(),
        destination: faker.address.city().toLowerCase(),
        departure: faker.address.city().toLowerCase(),
        company: 'emirates',
        flightDate: flightDateOnly,    // stored as DATE (YYYY-MM-DD)
        departureTime: departureTime,    // stored as TIME (HH:mm:ss)
        arrivalTime: arrivalTime,        // stored as TIME (HH:mm:ss)
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }


  // Seed Tickets
  const flights = await prisma.flight.findMany();
  for (let i = 0; i < 20; i++) {
    await prisma.ticket.create({
      data: {
        type: 'economy',
        price: faker.commerce.price({ min: 50, max: 500, dec: 2 }),
        flightId: flights[Math.floor(Math.random() * flights.length)].id,
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Seed Bookings (each ticket booked only once)
  const users = await prisma.user.findMany();
  const tickets = await prisma.ticket.findMany();
  for (const ticket of tickets) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    await prisma.booking.create({
      data: {
        userId: randomUser.id,
        ticketId: ticket.id,
        status: 'booked',
        bookedBy: 'AI',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Seed Transactions
  const bookings = await prisma.booking.findMany();
  for (let i = 0; i < 20; i++) {
    await prisma.transaction.create({
      data: {
        userId: users[Math.floor(Math.random() * users.length)].id,
        bookingId: bookings[Math.floor(Math.random() * bookings.length)].id,
      },
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
