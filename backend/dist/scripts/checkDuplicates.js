"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanupDuplicateUsers() {
    console.log('Checking for duplicate users...');
    // Find all users
    const allUsers = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            clerkId: true,
            createdAt: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    console.log(`Found ${allUsers.length} users total`);
    // Group by email to find duplicates
    const emailGroups = allUsers.reduce((acc, user) => {
        if (!acc[user.email]) {
            acc[user.email] = [];
        }
        acc[user.email].push(user);
        return acc;
    }, {});
    // Find duplicate emails
    const duplicateEmails = Object.entries(emailGroups).filter(([email, users]) => users.length > 1);
    if (duplicateEmails.length > 0) {
        console.log('\nFound duplicate emails:');
        duplicateEmails.forEach(([email, users]) => {
            console.log(`Email: ${email}`);
            users.forEach(user => {
                console.log(`  - ID: ${user.id}, ClerkID: ${user.clerkId}, Created: ${user.createdAt}`);
            });
        });
        // Ask if user wants to clean up
        console.log('\nTo clean up duplicates, you can manually delete the unwanted records.');
        console.log('Keep the oldest record for each email address.');
    }
    else {
        console.log('No duplicate emails found.');
    }
    // Group by clerkId to find duplicates
    const clerkIdGroups = allUsers.reduce((acc, user) => {
        if (!acc[user.clerkId]) {
            acc[user.clerkId] = [];
        }
        acc[user.clerkId].push(user);
        return acc;
    }, {});
    const duplicateClerkIds = Object.entries(clerkIdGroups).filter(([clerkId, users]) => users.length > 1);
    if (duplicateClerkIds.length > 0) {
        console.log('\nFound duplicate Clerk IDs:');
        duplicateClerkIds.forEach(([clerkId, users]) => {
            console.log(`ClerkID: ${clerkId}`);
            users.forEach(user => {
                console.log(`  - ID: ${user.id}, Email: ${user.email}, Created: ${user.createdAt}`);
            });
        });
    }
    else {
        console.log('No duplicate Clerk IDs found.');
    }
    await prisma.$disconnect();
}
cleanupDuplicateUsers().catch(console.error);
