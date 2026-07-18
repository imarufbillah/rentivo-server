import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentivo';
const SALT_ROUNDS = 10;

const demoProperties = [
  {
    title: 'Sunlit Studio in Williamsburg',
    description: 'Bright and airy studio apartment in the heart of Williamsburg. Features exposed brick walls, hardwood floors, and floor-to-ceiling windows. Walking distance to L train, cafes, and boutiques. Perfect for young professionals who love the Brooklyn vibe.',
    price: 2200,
    location: 'Brooklyn, NY',
    propertyType: 'studio' as const,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Modern 2BR Apartment with Manhattan Views',
    description: 'Stunning two-bedroom apartment with panoramic Manhattan skyline views. Floor-to-ceiling windows flood the space with natural light. Updated kitchen with granite countertops and stainless steel appliances. Building amenities include rooftop deck, gym, and 24/7 doorman.',
    price: 3800,
    location: 'Manhattan, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Cozy Room in Shared Brownstone',
    description: 'Private room in a charming Brooklyn brownstone. Shared kitchen and living areas with friendly roommates. Quiet tree-lined street, close to Prospect Park. Includes all utilities and high-speed WiFi. Great for students or remote workers.',
    price: 1100,
    location: 'Brooklyn, NY',
    propertyType: 'room' as const,
    images: ['https://images.unsplash.com/photo-1598928506311-c55ez637a4c1?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Luxury Villa with Private Garden',
    description: 'Exclusive four-bedroom villa in Riverdale with a private garden and patio. Spacious open-plan living, chef\'s kitchen, and home office. Two-car garage, washer/dryer, and central air. Perfect for families seeking suburban tranquility within city limits.',
    price: 6500,
    location: 'Riverdale, NY',
    propertyType: 'villa' as const,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Charming House near Central Park',
    description: 'Beautiful three-story townhouse steps from Central Park. Original details meet modern updates — crown molding, fireplace, renovated bathrooms. Private backyard with mature trees. Ideal for those who want park access without leaving the city.',
    price: 5200,
    location: 'Manhattan, NY',
    propertyType: 'house' as const,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Affordable Apartment in Astoria',
    description: 'Well-maintained one-bedroom apartment in vibrant Astoria. Near N/W trains, diverse restaurants, and Astoria Park. Features updated kitchen, good closet space, and laundry in building. Heat and hot water included in rent.',
    price: 1800,
    location: 'Queens, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Penthouse Loft in SoHo',
    description: 'Spectacular penthouse loft with 14-foot ceilings and skylights in prime SoHo. Open floor plan with chef\'s kitchen, spa-like bathroom, and private terrace with city views. Building has elevator, bike storage, and roof access.',
    price: 8500,
    location: 'Manhattan, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Quiet Studio near Columbia University',
    description: 'Compact but efficient studio apartment near Columbia University campus. Perfect for graduate students or faculty. Recently renovated with new appliances. Close to M4 bus, 1 train, and Riverside Park.',
    price: 1650,
    location: 'Manhattan, NY',
    propertyType: 'studio' as const,
    images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Spacious 3BR in Park Slope',
    description: 'Generous three-bedroom apartment on a beautiful tree-lined block in Park Slope. Original hardwood floors, eat-in kitchen, and large living room. Walking distance to Prospect Park, the farmers market, and top-rated schools.',
    price: 4200,
    location: 'Brooklyn, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Bright Room in Harlem Brownstone',
    description: 'Sunny room available in a shared brownstone in Harlem. Full bathroom, shared kitchen with all essentials, and access to a lovely garden. Close to A/B/C/D trains, Sylvia\'s, and the Apollo Theater. Diverse and welcoming neighborhood.',
    price: 950,
    location: 'Manhattan, NY',
    propertyType: 'room' as const,
    images: ['https://images.unsplash.com/photo-1595514535415-dae8580c416c?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Waterfront Condo in Long Island City',
    description: 'Modern waterfront condominium with stunning East River views. Floor-to-ceiling windows, in-unit washer/dryer, and gourmet kitchen. Building amenities include pool, fitness center, concierge, and parking garage.',
    price: 3400,
    location: 'Queens, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800'],
    status: 'active' as const,
  },
  {
    title: 'Renovated House in Staten Island',
    description: 'Fully renovated four-bedroom colonial in a quiet Staten Island neighborhood. New kitchen, bathrooms, and roof. Large backyard with deck, perfect for entertaining. Two-car driveway, finished basement, and central air conditioning.',
    price: 3200,
    location: 'Staten Island, NY',
    propertyType: 'house' as const,
    images: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'],
    status: 'active' as const,
  },
];

const reviewComments = [
  { rating: 5, comment: 'Amazing place! The location is perfect and the apartment is exactly as described. Would definitely recommend.' },
  { rating: 4, comment: 'Great apartment overall. The neighborhood is fantastic with lots of restaurants and shops nearby. Only minor issue was noisy neighbors.' },
  { rating: 5, comment: 'Loved living here! The natural light is incredible and the building management is very responsive.' },
  { rating: 3, comment: 'Decent place for the price. Some wear and tear but nothing major. Good location for the commute.' },
  { rating: 4, comment: 'Beautiful space with lots of character. The kitchen could use some updating but overall a great find.' },
  { rating: 5, comment: 'Best apartment I have ever had in the city. Spacious, quiet, and well-maintained. The landlord is excellent.' },
  { rating: 4, comment: 'Solid choice in a great neighborhood. The apartment has good natural light and the closets are spacious.' },
  { rating: 3, comment: 'Okay for the price point. The walls are thin but the location makes up for it. Would consider again.' },
  { rating: 5, comment: 'Perfect for a young professional. Close to everything, safe neighborhood, and the apartment itself is charming.' },
  { rating: 4, comment: 'Really enjoyed my time here. The apartment is well-maintained and the area has a great community feel.' },
  { rating: 5, comment: 'Exceeded my expectations! The photos do not do it justice. Moving in was seamless and the space is wonderful.' },
  { rating: 3, comment: 'Good location but the apartment needs some updates. The heating works well though and the rent is reasonable.' },
];

const seed = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('rentivo');

    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('properties').deleteMany({});
    await db.collection('interactions').deleteMany({});
    await db.collection('reviews').deleteMany({});
    await db.collection('sessions').deleteMany({});
    console.log('Cleared existing data');

    // Create demo users
    const ownerPassword = await bcrypt.hash('owner1234', SALT_ROUNDS);
    const renterPassword = await bcrypt.hash('demo1234', SALT_ROUNDS);

    const ownerResult = await db.collection('users').insertOne({
      email: 'owner@demo.com',
      password: ownerPassword,
      role: 'owner',
      name: 'Sarah Chen',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const renterResult = await db.collection('users').insertOne({
      email: 'renter@demo.com',
      password: renterPassword,
      role: 'renter',
      name: 'Alex Rivera',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ownerId = ownerResult.insertedId;
    const renterId = renterResult.insertedId;

    console.log(`Created owner: owner@demo.com (id: ${ownerId})`);
    console.log(`Created renter: renter@demo.com (id: ${renterId})`);

    // Create properties (owned by the demo owner)
    const propertyResults = await db.collection('properties').insertMany(
      demoProperties.map((p) => ({
        ...p,
        ownerId,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }))
    );

    const propertyIds = Object.values(propertyResults.insertedIds);
    console.log(`Created ${propertyIds.length} properties`);

    // Create interaction history for the renter
    const interactions: any[] = [];

    // View all properties
    for (const propertyId of propertyIds) {
      interactions.push({
        userId: renterId,
        propertyId,
        type: 'view',
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      });
    }

    // Save some properties (indices 0, 1, 4, 6, 8)
    const savedIndices = [0, 1, 4, 6, 8];
    for (const idx of savedIndices) {
      interactions.push({
        userId: renterId,
        propertyId: propertyIds[idx],
        type: 'save',
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
    }

    // Dismiss some properties (indices 2, 5, 9)
    const dismissedIndices = [2, 5, 9];
    for (const idx of dismissedIndices) {
      interactions.push({
        userId: renterId,
        propertyId: propertyIds[idx],
        type: 'dismiss',
        createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      });
    }

    await db.collection('interactions').insertMany(interactions);
    console.log(`Created ${interactions.length} interactions for demo renter`);

    // Create reviews (from a third user for variety)
    const reviewerResult = await db.collection('users').insertOne({
      email: 'reviewer@demo.com',
      password: await bcrypt.hash('review1234', SALT_ROUNDS),
      role: 'renter',
      name: 'Jordan Park',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const reviewerId = reviewerResult.insertedId;
    console.log(`Created reviewer: reviewer@demo.com (id: ${reviewerId})`);

    // Add reviews to the first 8 properties
    const reviews: any[] = [];
    for (let i = 0; i < 8 && i < propertyIds.length; i++) {
      const reviewData = reviewComments[i];
      reviews.push({
        userId: reviewerId,
        propertyId: propertyIds[i],
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
    }

    await db.collection('reviews').insertMany(reviews);
    console.log(`Created ${reviews.length} reviews`);

    console.log('\n--- Seed Complete ---');
    console.log('Demo accounts:');
    console.log('  Owner:  owner@demo.com  / owner1234');
    console.log('  Renter: renter@demo.com / demo1234');
    console.log(`  Properties: ${propertyIds.length}`);
    console.log(`  Interactions: ${interactions.length}`);
    console.log(`  Reviews: ${reviews.length}`);
  } finally {
    await client.close();
  }
};

seed().catch(console.error);
