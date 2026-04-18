import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Update all existing BOBAS items to Drinks category
  const updated = await prisma.item.updateMany({
    where: { category: 'BOBAS' },
    data: { category: 'Drinks' },
  });
  console.log('Updated BOBAS -> Drinks:', updated.count, 'items');

  // Add new Drinks items
  const newItems = [
    { name: 'Chocolate Cafe', category: 'Drinks', priceCents: 500 },
    { name: 'Hot Taro', category: 'Drinks', priceCents: 500 },
  ];

  for (const item of newItems) {
    const result = await prisma.item.upsert({
      where: { name: item.name },
      update: item,
      create: { ...item, stock: 100 },
    });
    console.log('Upserted:', result.name, 'id:', result.id);
  }

  console.log('Done! Category renamed to Drinks and new items added.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
