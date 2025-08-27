import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addEloteEntero() {
  try {
    console.log('Adding elote entero packaging material...');
    
    // Add elote entero packaging material
    await prisma.packagingMaterial.upsert({
      where: { name: 'elote entero' },
      update: { stock: 200 },
      create: { name: 'elote entero', stock: 200 },
    });
    
    console.log('Updating Elote Entero item packaging...');
    
    // Update Elote Entero item to use elote entero packaging
    await prisma.item.update({
      where: { name: 'Elote Entero' },
      data: { packaging: 'elote entero' },
    });
    
    console.log('Elote entero setup complete!');
    
    // Verify the changes
    const eloteEnteroPackaging = await prisma.packagingMaterial.findUnique({
      where: { name: 'elote entero' }
    });
    
    const eloteEnteroItem = await prisma.item.findUnique({
      where: { name: 'Elote Entero' }
    });
    
    console.log('Verification:');
    console.log('Elote entero packaging:', eloteEnteroPackaging);
    console.log('Elote Entero item:', eloteEnteroItem);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addEloteEntero();
