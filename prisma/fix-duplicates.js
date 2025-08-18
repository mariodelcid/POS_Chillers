import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log('🔧 Fixing duplicate items...');
  
  try {
    // Remove the duplicate "Malteada Taro" item
    const deletedItem = await prisma.item.deleteMany({
      where: {
        name: 'Malteada Taro'
      }
    });
    
    console.log(`✅ Removed ${deletedItem.count} duplicate "Malteada Taro" items`);
    
    // Verify the correct item exists
    const correctItem = await prisma.item.findFirst({
      where: {
        name: 'Malteada de Taro'
      }
    });
    
    if (correctItem) {
      console.log('✅ "Malteada de Taro" exists correctly');
    } else {
      console.log('❌ "Malteada de Taro" not found');
    }
    
    // List all milk shake items
    const milkShakes = await prisma.item.findMany({
      where: {
        category: 'MILK SHAKES'
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('📋 Current Milk Shakes:');
    milkShakes.forEach(item => {
      console.log(`  - ${item.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates();
