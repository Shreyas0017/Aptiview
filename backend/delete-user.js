const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
  try {
    // Find the user first
    const user = await prisma.user.findFirst({
      where: { email: 'gehuchele@gmail.com' },
      include: {
        candidateProfile: true,
        recruiterProfile: true
      }
    });
    
    if (!user) {
      console.log('User gehuchele@gmail.com not found');
      return;
    }
    
    console.log('Found user:', user.clerkId, user.email);
    
    // Delete related records first if they exist
    if (user.candidateProfile) {
      await prisma.candidateProfile.delete({
        where: { id: user.candidateProfile.id }
      });
      console.log('Deleted candidate profile');
    }
    
    if (user.recruiterProfile) {
      await prisma.recruiterProfile.delete({
        where: { id: user.recruiterProfile.id }
      });
      console.log('Deleted recruiter profile');
    }
    
    // Delete the user
    await prisma.user.delete({
      where: { id: user.id }
    });
    
    console.log('Successfully deleted user gehuchele@gmail.com from database');
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
