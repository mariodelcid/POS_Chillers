import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed items with correct pricing and items
const items = [
  // SNACKS (should be first category)
  { name: 'Elote Chico', category: 'SNACKS', priceCents: 500 },
  { name: 'Elote Grande', category: 'SNACKS', priceCents: 700 },
  { name: 'Elote Entero', category: 'SNACKS', priceCents: 500 },
  { name: 'Takis', category: 'SNACKS', priceCents: 700 },
  { name: 'Cheetos', category: 'SNACKS', priceCents: 700 },
  { name: 'Conchitas', category: 'SNACKS', priceCents: 700 },
  { name: 'Tostitos', category: 'SNACKS', priceCents: 700 },
  { name: 'Crepas', category: 'SNACKS', priceCents: 800 },
  { name: 'Fresa Con Crema 16 oz', category: 'SNACKS', priceCents: 700 },
  { name: 'Sopa', category: 'SNACKS', priceCents: 500 },
  { name: 'Vaso Nieve 1 Scoop', category: 'SNACKS', priceCents: 250 },
  { name: 'Vaso Nieve 2 Scoops', category: 'SNACKS', priceCents: 500 },
  { name: 'Queso Extra', category: 'SNACKS', priceCents: 25 },
  { name: 'Toppings', category: 'SNACKS', priceCents: 50 },
  { name: 'Discount', category: 'SNACKS', priceCents: -50 },

  // CHAMOYADAS (light yellow background) - $7.00
  { name: 'Chamoyada de Tamarindo', category: 'CHAMOYADAS', priceCents: 700 },
  { name: 'Chamoyada Fresa', category: 'CHAMOYADAS', priceCents: 700 },
  { name: 'Chamoyada Mango', category: 'CHAMOYADAS', priceCents: 700 },
  { name: 'Chamoyada Sandía', category: 'CHAMOYADAS', priceCents: 700 },

  // REFRESHERS (light blue background) - $5.00
  { name: 'Coco Rosa', category: 'REFRESHERS', priceCents: 500 },
  { name: 'Horchata Canela', category: 'REFRESHERS', priceCents: 500 },
  { name: 'Horchata Fresa', category: 'REFRESHERS', priceCents: 500 },
  { name: 'Limonada', category: 'REFRESHERS', priceCents: 500 },
  { name: 'Mango Peach Dragonfruit', category: 'REFRESHERS', priceCents: 500 },
  { name: 'Red Bull Preparado', category: 'REFRESHERS', priceCents: 500 },
  { name: 'Strawberry Acai', category: 'REFRESHERS', priceCents: 500 },

  // MILK SHAKES (light red background) - $7.00
  { name: 'Cookies and Cream', category: 'MILK SHAKES', priceCents: 700 },
  { name: 'Caramel Frappuccino', category: 'MILK SHAKES', priceCents: 700 },
  { name: 'Malteada de Fresa', category: 'MILK SHAKES', priceCents: 700 },
  { name: 'Malteada Vainilla', category: 'MILK SHAKES', priceCents: 700 },
  { name: 'Malteada Chocolate', category: 'MILK SHAKES', priceCents: 700 },
  { name: 'Malteada de Taro', category: 'MILK SHAKES', priceCents: 700 },

  // BOBAS (light pink background) - $5.00
  { name: 'Boba Coffee', category: 'BOBAS', priceCents: 500 },
  { name: 'Boba Strawberry', category: 'BOBAS', priceCents: 500 },
  { name: 'Boba Customized', category: 'BOBAS', priceCents: 500 },
  { name: 'Boba Taro', category: 'BOBAS', priceCents: 500 },
  { name: 'Tiger Milk', category: 'BOBAS', priceCents: 500 },
];

async function main() {
  for (const item of items) {
    await prisma.item.upsert({
      where: { name: item.name },
      update: item,
      create: { ...item, stock: 100 },
    });
  }
  console.log('Seeded items:', items.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


