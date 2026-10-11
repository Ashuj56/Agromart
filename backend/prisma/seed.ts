import { PrismaClient, UserRole, Category } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AgroMart database seeding...');

  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const buyer = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'buyer@agromart.com',
      password: hashedPassword,
      role: UserRole.BUYER,
      location: 'Ludhiana, Punjab',
    },
  });

  const seller = await prisma.user.create({
    data: {
      name: 'Suresh Patel',
      email: 'seller@agromart.com',
      password: hashedPassword,
      role: UserRole.SELLER,
      location: 'Anand, Gujarat',
    },
  });

  const bothUser = await prisma.user.create({
    data: {
      name: 'Anil Sharma',
      email: 'both@agromart.com',
      password: hashedPassword,
      role: UserRole.BOTH,
      location: 'Karnal, Haryana',
    },
  });

  console.log('✅ Created 3 users: buyer, seller, both');

  // 3. Create 15 products
  const products = [
    // 6 Crops
    {
      sellerId: seller.id,
      name: 'Premium Sharbati Wheat',
      category: Category.CROP,
      price: 3200.0,
      priceUnit: 'quintal',
      isRental: false,
      stock: 50,
      description: 'Golden-hued Sharbati wheat grains from Madhya Pradesh black soil. Rich in protein and ideal for soft chapatis.',
      images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: seller.id,
      name: 'Basmati Rice 1121 Extra Long',
      category: Category.CROP,
      price: 4500.0,
      priceUnit: 'quintal',
      isRental: false,
      stock: 40,
      description: 'Aromatic 1121 steamed basmati rice with exquisite grain elongation and pleasant aroma.',
      images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: bothUser.id,
      name: 'Organic Yellow Mustard Seeds',
      category: Category.CROP,
      price: 5400.0,
      priceUnit: 'quintal',
      isRental: false,
      stock: 25,
      description: 'High oil content yellow sarson grown without synthetic chemical sprays.',
      images: ['https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: seller.id,
      name: 'Farm Fresh Desi Tomatoes',
      category: Category.CROP,
      price: 25.0,
      priceUnit: 'kg',
      isRental: false,
      stock: 500,
      description: 'Sun-ripened, tangy desi variety harvested fresh this morning.',
      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: bothUser.id,
      name: 'Cold Storage Seed Potatoes',
      category: Category.CROP,
      price: 18.0,
      priceUnit: 'kg',
      isRental: false,
      stock: 800,
      description: 'Kufri Jyoti variety, graded and treated for high germination rate.',
      images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: seller.id,
      name: 'Nagpur Sweet Oranges',
      category: Category.CROP,
      price: 60.0,
      priceUnit: 'kg',
      isRental: false,
      stock: 300,
      description: 'Sweet, juicy GI-tagged Nagpur mandarin oranges directly from orchard.',
      images: ['https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=800&q=80'],
    },

    // 5 Fertilizers
    {
      sellerId: bothUser.id,
      name: 'Neem Coated Urea (45kg)',
      category: Category.FERTILIZER,
      price: 266.5,
      priceUnit: 'bag',
      isRental: false,
      stock: 200,
      description: 'Government certified Neem-coated slow release nitrogen fertilizer for high yield.',
      images: ['https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: seller.id,
      name: 'DAP (Di-Ammonium Phosphate) 50kg',
      category: Category.FERTILIZER,
      price: 1350.0,
      priceUnit: 'bag',
      isRental: false,
      stock: 150,
      description: 'High phosphorus content fertilizer (18-46-0) essential for early root development.',
      images: ['https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: seller.id,
      name: 'Muriate of Potash - MOP (50kg)',
      category: Category.FERTILIZER,
      price: 1700.0,
      priceUnit: 'bag',
      isRental: false,
      stock: 100,
      description: 'Water soluble potassium fertilizer to enhance pest resistance and fruit quality.',
      images: ['https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: bothUser.id,
      name: 'Bio NPK Organic Liquid (1 Litre)',
      category: Category.FERTILIZER,
      price: 450.0,
      priceUnit: 'bottle',
      isRental: false,
      stock: 80,
      description: 'Consortium of beneficial microbes for natural soil enrichment and organic certification.',
      images: ['https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: bothUser.id,
      name: 'Chlorpyrifos 20% EC Insecticide (1L)',
      category: Category.FERTILIZER,
      price: 380.0,
      priceUnit: 'bottle',
      isRental: false,
      stock: 120,
      description: 'Broad-spectrum organophosphate insecticide against soil pests and stem borers.',
      images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'],
    },

    // 4 Equipment (2 Rentals, 2 Purchases)
    {
      sellerId: seller.id,
      name: 'Mahindra 575 DI 45 HP Tractor',
      category: Category.EQUIPMENT,
      price: 1500.0,
      priceUnit: 'day',
      isRental: true,
      stock: 3,
      description: 'Fuel efficient 4-cylinder engine, fitted with cultivator and reversible plough. Operator included if requested.',
      images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: bothUser.id,
      name: 'Paddy & Wheat Combine Harvester',
      category: Category.EQUIPMENT,
      price: 3500.0,
      priceUnit: 'day',
      isRental: true,
      stock: 2,
      description: 'Track-type combine harvester with low grain loss rate. Capable of harvesting in moist conditions.',
      images: ['https://images.unsplash.com/photo-1595053826286-2e59ef79224b?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: seller.id,
      name: 'Solar Powered Submersible Pump 5HP',
      category: Category.EQUIPMENT,
      price: 85000.0,
      priceUnit: 'unit',
      isRental: false,
      stock: 5,
      description: 'MNRE compliant solar irrigation pump with MPPT controller and mono-crystalline panels.',
      images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'],
    },
    {
      sellerId: bothUser.id,
      name: 'Heavy Duty 16-Disc Harrow',
      category: Category.EQUIPMENT,
      price: 45000.0,
      priceUnit: 'unit',
      isRental: false,
      stock: 4,
      description: 'Notched boron steel discs with sealed heavy-duty bearings for secondary tillage.',
      images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'],
    },
  ];

  for (const item of products) {
    await prisma.product.create({ data: item });
  }

  console.log('✅ Seeded 15 products across CROP, FERTILIZER, and EQUIPMENT (with 2 rentals)');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
