import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEloteEntero() {
  try {
    console.log('🔧 Fixing elote entero packaging material...');
    
    // Ensure elote entero packaging material exists
    const eloteEnteroPackaging = await prisma.packagingMaterial.upsert({
      where: { name: 'elote entero' },
      update: { stock: 200 },
      create: { name: 'elote entero', stock: 200 },
    });
    console.log('✅ Elote entero packaging material:', eloteEnteroPackaging);
    
    // Ensure charolas packaging material exists
    const charolasPackaging = await prisma.packagingMaterial.upsert({
      where: { name: 'charolas' },
      update: { stock: 150 },
      create: { name: 'charolas', stock: 150 },
    });
    console.log('✅ Charolas packaging material:', charolasPackaging);
    
    // Check if Elote Entero item exists and has no packaging (since it deducts from both)
    const eloteEnteroItem = await prisma.item.findUnique({
      where: { name: 'Elote Entero' }
    });
    
    if (eloteEnteroItem) {
      // Remove any packaging mapping for Elote Entero
      await prisma.item.update({
        where: { name: 'Elote Entero' },
        data: { packaging: null }
      });
      console.log('✅ Removed packaging mapping from Elote Entero item');
    } else {
      console.log('⚠️ Elote Entero item not found in menu items');
    }
    
    // List all packaging materials to verify
    const allPackaging = await prisma.packagingMaterial.findMany({
      orderBy: { name: 'asc' }
    });
    console.log('📦 All packaging materials:', allPackaging.map(p => `${p.name}: ${p.stock}`));
    
    console.log('🎉 Elote entero setup complete!');
    
  } catch (error) {
    console.error('❌ Error fixing elote entero:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEloteEntero();
