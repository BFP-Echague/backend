// import { Prisma } from "@prisma/client";

// import { prismaClient } from "@src/global/apps";


// beforeAll(async () => {
//     prismaClient.$connect();
// });

// afterAll(async () => {
//     await prismaClient.$transaction([
//         prismaClient.schoolYear.deleteMany()
//     ]);

//     await prismaClient.$disconnect();
// });

// test("School Year Create", async () => {
//     prismaClient.schoolYear.deleteMany();
//     const schoolYear: Prisma.SchoolYearCreateInput = {
//         startDate: new Date(2069),
//         endDate: new Date(2070),
//     };

//     const result = await schoolYearCreate(schoolYear);
//     expect(result).toEqual({
//         id: expect.any(Number),
//         startDate: new Date(2069),
//         endDate: new Date(2070)
//     });
// });