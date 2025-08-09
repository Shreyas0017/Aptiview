const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'gehuchele@gmail.com' },
      include: { 
        candidateProfile: true, 
        recruiterProfile: true 
      }
    });

    console.log('Current gehuchele user:');
    if (user) {
      console.log('- ID:', user.id);
      console.log('- ClerkID:', user.clerkId);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Has Candidate Profile:', !!user.candidateProfile);
      console.log('- Has Recruiter Profile:', !!user.recruiterProfile);
      if (user.candidateProfile) {
        console.log('- Candidate Profile ID:', user.candidateProfile.id);
      }
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
