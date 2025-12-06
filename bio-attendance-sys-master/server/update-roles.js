const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateRoles() {
  try {
    console.log('Updating database schema...');

    // Get all existing staff members
    const staffMembers = await prisma.staff.findMany();

    if (staffMembers.length === 0) {
      console.log('No staff members found. No updates needed.');
      return;
    }

    // Update all existing staff members to be admins
    const updatePromises = staffMembers.map(staff => 
      prisma.staff.update({
        where: { id: staff.id },
        data: { role: 'ADMIN' }
      })
    );

    await Promise.all(updatePromises);

    console.log(`Successfully updated ${staffMembers.length} staff members to ADMIN role.`);
    console.log('Database update completed.');
  } catch (error) {
    console.error('Error updating roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateRoles();
