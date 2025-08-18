import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Packaging materials inventory
const packagingMaterials = [
  { name: '24clear', stock: 500 },
  { name: '20clear', stock: 300 },
  { name: 'elote grande', stock: 200 },
  { name: 'elote chico', stock: 400 },
  { name: '16clear', stock: 300 },
  { name: 'charolas', stock: 150 },
  { name: 'chetos', stock: 100 },
  { name: 'conchitas', stock: 100 },
  { name: 'sopas', stock: 200 },
  { name: 'takis', stock: 100 },
  { name: 'tostitos', stock: 100 },
  { name: 'nievecup', stock: 250 },
  { name: 'elote', stock: 480 }, // 480 ounces per box
];

// Item to packaging mapping
const itemPackagingMapping = [
  // Bobas -> 24clear
  { itemName: 'Boba Coffee', packaging: '24clear' },
  { itemName: 'Boba Customized', packaging: '24clear' },
  { itemName: 'Boba Strawberry', packaging: '24clear' },
  { itemName: 'Boba Taro', packaging: '24clear' },
  { itemName: 'Tiger Milk', packaging: '24clear' },
  
  // Chamoyadas -> 20clear (changed from 24clear)
  { itemName: 'Chamoyada de Tamarindo', packaging: '20clear' },
  { itemName: 'Chamoyada Fresa', packaging: '20clear' },
  { itemName: 'Chamoyada Mango', packaging: '20clear' },
  { itemName: 'Chamoyada Sandía', packaging: '20clear' },
  
  // Refreshers -> 24clear
  { itemName: 'Coco Rosa', packaging: '24clear' },
  { itemName: 'Horchata Canela', packaging: '24clear' },
  { itemName: 'Horchata Fresa', packaging: '24clear' },
  { itemName: 'Limonada', packaging: '24clear' },
  { itemName: 'Mango Peach Dragonfruit', packaging: '24clear' },
  { itemName: 'Red Bull Preparado', packaging: '24clear' },
  { itemName: 'Strawberry Acai', packaging: '24clear' },
  
  // Milk Shakes -> 20clear
  { itemName: 'Caramel Frappuccino', packaging: '20clear' },
  { itemName: 'Cookies and Cream', packaging: '20clear' },
  { itemName: 'Malteada Chocolate', packaging: '20clear' },
  { itemName: 'Malteada de Taro', packaging: '20clear' }, // new item
  { itemName: 'Malteada de Fresa', packaging: '20clear' },
  { itemName: 'Malteada Vainilla', packaging: '20clear' },
  
  // Snacks with their own packaging
  { itemName: 'Cheetos', packaging: 'chetos' },
  { itemName: 'Conchitas', packaging: 'conchitas' },
  { itemName: 'Takis', packaging: 'takis' },
  { itemName: 'Tostitos', packaging: 'tostitos' },
  { itemName: 'Sopa', packaging: 'sopas' },
  
  // Crepas -> charolas
  { itemName: 'Crepas', packaging: 'charolas' },
  
  // Elotes in cups
  { itemName: 'Elote Chico', packaging: 'elote chico' },
  { itemName: 'Elote Grande', packaging: 'elote grande' },
  { itemName: 'Elote Entero', packaging: 'charolas' },
  
  // Fresa con crema
  { itemName: 'Fresa Con Crema 16 oz', packaging: '16clear' },
  
  // Ice cream - nievecup
  { itemName: 'Vaso Nieve 1 Scoop', packaging: 'nievecup' },
  { itemName: 'Vaso Nieve 2 Scoops', packaging: 'nievecup' },
  
  // Toppings and Discount (no packaging needed)
  { itemName: 'Queso Extra', packaging: null },
  { itemName: 'Toppings', packaging: null },
  { itemName: 'Discount', packaging: null },
];

// Elote inventory tracking (ounces)
const eloteInventoryMapping = [
  { itemName: 'Elote Chico', ouncesUsed: 8 },
  { itemName: 'Elote Grande', ouncesUsed: 14 },
];

async function main() {
  console.log('Seeding packaging materials...');
  
  // Create packaging materials
  for (const material of packagingMaterials) {
    await prisma.packagingMaterial.upsert({
      where: { name: material.name },
      update: { stock: material.stock },
      create: material,
    });
  }
  
  console.log('Updating items with packaging info...');
  
  // Update items with packaging information
  for (const mapping of itemPackagingMapping) {
    try {
      await prisma.item.update({
        where: { name: mapping.itemName },
        data: { packaging: mapping.packaging },
      });
    } catch (error) {
      console.log(`Item not found: ${mapping.itemName}`);
    }
  }
  
  console.log('Packaging setup complete!');
  console.log(`Seeded ${packagingMaterials.length} packaging materials`);
  console.log(`Updated ${itemPackagingMapping.length} item-packaging mappings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
