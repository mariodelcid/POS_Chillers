import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed items with correct pricing and items
const items = [
  // SNACKS (should be first category)
  { name: 'Elote Chico', category: 'SNACKS', priceCents: 499 },
  { name: 'Elote Grande', category: 'SNACKS', priceCents: 699 },
  { name: 'Elote Entero', category: 'SNACKS', priceCents: 499 },
  { name: 'Takis', category: 'SNACKS', priceCents: 699 },
  { name: 'Cheetos', category: 'SNACKS', priceCents: 699 },
  { name: 'Conchitas', category: 'SNACKS', priceCents: 699 },
  { name: 'Tostitos', category: 'SNACKS', priceCents: 699 },
  { name: 'Crepas', category: 'SNACKS', priceCents: 799 },
  { name: 'Fresa Con Crema 16 oz', category: 'SNACKS', priceCents: 699 },
  { name: 'Sopa', category: 'SNACKS', priceCents: 499 },
  { name: 'Vaso Nieve 1 Scoop', category: 'SNACKS', priceCents: 249 },
  { name: 'Vaso Nieve 2 Scoops', category: 'SNACKS', priceCents: 499 },
  { name: 'Queso Extra', category: 'SNACKS', priceCents: 25 },
  { name: 'Toppings', category: 'SNACKS', priceCents: 50 },
  { name: 'Discount', category: 'SNACKS', priceCents: -50 },

  // CHAMOYADAS (light yellow background) - $6.99
  { name: 'Chamoyada de Tamarindo', category: 'CHAMOYADAS', priceCents: 699 },
  { name: 'Chamoyada Fresa', category: 'CHAMOYADAS', priceCents: 699 },
  { name: 'Chamoyada Mango', category: 'CHAMOYADAS', priceCents: 699 },
  { name: 'Chamoyada Sandía', category: 'CHAMOYADAS', priceCents: 699 },

  // REFRESHERS (light blue background) - $4.99
  { name: 'Coco Rosa', category: 'REFRESHERS', priceCents: 499 },
  { name: 'Horchata Canela', category: 'REFRESHERS', priceCents: 499 },
  { name: 'Horchata Fresa', category: 'REFRESHERS', priceCents: 499 },
  { name: 'Mango Peach Dragonfruit', category: 'REFRESHERS', priceCents: 499 },
  { name: 'Red Bull Preparado', category: 'REFRESHERS', priceCents: 499 },
  { name: 'Strawberry Acai', category: 'REFRESHERS', priceCents: 499 },
  { name: 'Taro', category: 'REFRESHERS', priceCents: 499 },

  // MILK SHAKES (light red background)
  { name: 'Cookies and Cream', category: 'MILK SHAKES', priceCents: 699 },
  { name: 'Caramel Frappuccino', category: 'MILK SHAKES', priceCents: 699 },
  { name: 'Malteada de Fresa', category: 'MILK SHAKES', priceCents: 699 },
  { name: 'Malteada Vainilla', category: 'MILK SHAKES', priceCents: 699 },
  { name: 'Malteada Chocolate', category: 'MILK SHAKES', priceCents: 699 },

  // BOBAS (light pink background) - $4.99
  { name: 'Boba Coffee', category: 'BOBAS', priceCents: 499 },
  { name: 'Boba Strawberry', category: 'BOBAS', priceCents: 499 },
  { name: 'Boba Taro', category: 'BOBAS', priceCents: 499 },
  { name: 'BobaTiger Milk', category: 'BOBAS', priceCents: 499 },
  { name: 'Tiger Milk', category: 'BOBAS', priceCents: 499 },
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


