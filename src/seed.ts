import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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
    bedrooms: 0,
    bathrooms: 1,
    amenities: ['wifi', 'laundry', 'ac', 'kitchen', 'hardwood'],
    size: 450,
    balconies: 0,
    floor: 3,
    totalFloors: 5,
    furnishing: 'unfurnished' as const,
    condition: 'good' as const,
    utilities: ['water', 'gas'],
    parking: 'none' as const,
    internet: true,
    securityDeposit: 2200,
    advancePayment: 1100,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'not-allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking indoors. Quiet hours after 10pm. No pets allowed.',
    fullAddress: '248 Bedford Ave, Brooklyn, NY 11211',
    lat: 40.7142,
    lng: -73.9614,
    availableFrom: new Date('2026-08-01'),
  },
  {
    title: 'Modern 2BR Apartment with Manhattan Views',
    description: 'Stunning two-bedroom apartment with panoramic Manhattan skyline views. Floor-to-ceiling windows flood the space with natural light. Updated kitchen with granite countertops and stainless steel appliances. Building amenities include rooftop deck, gym, and 24/7 doorman.',
    price: 3800,
    location: 'Manhattan, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
    status: 'active' as const,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ['wifi', 'gym', 'doorman', 'elevator', 'ac', 'kitchen', 'dishwasher', 'views'],
    size: 950,
    balconies: 1,
    floor: 12,
    totalFloors: 20,
    furnishing: 'semi-furnished' as const,
    condition: 'excellent' as const,
    utilities: ['electricity', 'water', 'gas', 'internet'],
    parking: 'available' as const,
    internet: true,
    securityDeposit: 3800,
    advancePayment: 3800,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'case-by-case' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking. Quiet hours 10pm-8am. Guest policy: max 2 overnight guests.',
    fullAddress: '350 W 42nd St, Manhattan, NY 10036',
    lat: 40.7580,
    lng: -73.9920,
    availableFrom: new Date('2026-09-01'),
  },
  {
    title: 'Cozy Room in Shared Brownstone',
    description: 'Private room in a charming Brooklyn brownstone. Shared kitchen and living areas with friendly roommates. Quiet tree-lined street, close to Prospect Park. Includes all utilities and high-speed WiFi. Great for students or remote workers.',
    price: 1100,
    location: 'Brooklyn, NY',
    propertyType: 'room' as const,
    images: ['https://images.unsplash.com/photo-1598928506311-c55ez637a4c1?w=800'],
    status: 'active' as const,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['wifi', 'laundry', 'kitchen', 'furnished'],
    size: 200,
    balconies: 0,
    floor: 2,
    totalFloors: 3,
    furnishing: 'furnished' as const,
    condition: 'good' as const,
    utilities: ['electricity', 'water', 'gas', 'internet'],
    parking: 'none' as const,
    internet: true,
    securityDeposit: 1100,
    advancePayment: 550,
    leaseDuration: 6,
    minStay: 3,
    rentFrequency: 'monthly' as const,
    petPolicy: 'not-allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'Shared spaces must be kept clean. No overnight guests without notice.',
    fullAddress: '112 Prospect Pl, Brooklyn, NY 11238',
    lat: 40.6782,
    lng: -73.9698,
    availableFrom: new Date('2026-07-15'),
  },
  {
    title: 'Luxury Villa with Private Garden',
    description: 'Exclusive four-bedroom villa in Riverdale with a private garden and patio. Spacious open-plan living, chef\'s kitchen, and home office. Two-car garage, washer/dryer, and central air. Perfect for families seeking suburban tranquility within city limits.',
    price: 6500,
    location: 'Riverdale, NY',
    propertyType: 'villa' as const,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'],
    status: 'active' as const,
    bedrooms: 4,
    bathrooms: 3,
    amenities: ['wifi', 'parking', 'pool', 'gym', 'ac', 'balcony', 'fireplace', 'kitchen', 'garage', 'garden', 'patio', 'washer/dryer'],
    size: 3200,
    balconies: 2,
    floor: 1,
    totalFloors: 2,
    furnishing: 'furnished' as const,
    condition: 'excellent' as const,
    utilities: ['electricity', 'water', 'gas', 'internet'],
    parking: 'included' as const,
    internet: true,
    securityDeposit: 13000,
    advancePayment: 6500,
    leaseDuration: 24,
    minStay: 12,
    rentFrequency: 'monthly' as const,
    petPolicy: 'allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking inside. Pets welcome with deposit. Pool hours: 8am-10pm.',
    fullAddress: '45 Riverdale Ave, Bronx, NY 10463',
    lat: 40.8955,
    lng: -73.9143,
    availableFrom: new Date('2026-08-15'),
  },
  {
    title: 'Charming House near Central Park',
    description: 'Beautiful three-story townhouse steps from Central Park. Original details meet modern updates — crown molding, fireplace, renovated bathrooms. Private backyard with mature trees. Ideal for those who want park access without leaving the city.',
    price: 5200,
    location: 'Manhattan, NY',
    propertyType: 'house' as const,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    status: 'active' as const,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ['wifi', 'parking', 'fireplace', 'hardwood', 'balcony', 'kitchen', 'garden', 'furnished'],
    size: 2100,
    balconies: 1,
    floor: 1,
    totalFloors: 3,
    furnishing: 'furnished' as const,
    condition: 'excellent' as const,
    utilities: ['electricity', 'water', 'gas', 'internet'],
    parking: 'included' as const,
    internet: true,
    securityDeposit: 5200,
    advancePayment: 5200,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking. Well-behaved pets welcome. Please respect quiet hours after 9pm.',
    fullAddress: '210 W 81st St, Manhattan, NY 10024',
    lat: 40.7831,
    lng: -73.9762,
    availableFrom: new Date('2026-09-01'),
  },
  {
    title: 'Affordable Apartment in Astoria',
    description: 'Well-maintained one-bedroom apartment in vibrant Astoria. Near N/W trains, diverse restaurants, and Astoria Park. Features updated kitchen, good closet space, and laundry in building. Heat and hot water included in rent.',
    price: 1800,
    location: 'Queens, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
    status: 'active' as const,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['wifi', 'laundry', 'ac', 'kitchen'],
    size: 650,
    balconies: 0,
    floor: 4,
    totalFloors: 6,
    furnishing: 'unfurnished' as const,
    condition: 'good' as const,
    utilities: ['water', 'gas'],
    parking: 'none' as const,
    internet: true,
    securityDeposit: 1800,
    advancePayment: 900,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'not-allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking. Heat and hot water included. Laundry in basement.',
    fullAddress: '31-15 Ditmars Blvd, Queens, NY 11105',
    lat: 40.7723,
    lng: -73.9196,
    availableFrom: new Date('2026-07-01'),
  },
  {
    title: 'Penthouse Loft in SoHo',
    description: 'Spectacular penthouse loft with 14-foot ceilings and skylights in prime SoHo. Open floor plan with chef\'s kitchen, spa-like bathroom, and private terrace with city views. Building has elevator, bike storage, and roof access.',
    price: 8500,
    location: 'Manhattan, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'],
    status: 'active' as const,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ['wifi', 'elevator', 'balcony', 'hardwood', 'ac', 'bike', 'kitchen', 'dishwasher', 'views', 'patio'],
    size: 1800,
    balconies: 1,
    floor: 6,
    totalFloors: 6,
    furnishing: 'furnished' as const,
    condition: 'new' as const,
    utilities: ['electricity', 'water', 'gas', 'internet'],
    parking: 'available' as const,
    internet: true,
    securityDeposit: 8500,
    advancePayment: 8500,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'case-by-case' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking. No shoes on hardwood floors. Bike storage in basement.',
    fullAddress: '78 Greene St, Manhattan, NY 10012',
    lat: 40.7247,
    lng: -74.0010,
    availableFrom: new Date('2026-10-01'),
  },
  {
    title: 'Quiet Studio near Columbia University',
    description: 'Compact but efficient studio apartment near Columbia University campus. Perfect for graduate students or faculty. Recently renovated with new appliances. Close to M4 bus, 1 train, and Riverside Park.',
    price: 1650,
    location: 'Manhattan, NY',
    propertyType: 'studio' as const,
    images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
    status: 'active' as const,
    bedrooms: 0,
    bathrooms: 1,
    amenities: ['wifi', 'laundry', 'kitchen', 'furnished'],
    size: 380,
    balconies: 0,
    floor: 2,
    totalFloors: 5,
    furnishing: 'furnished' as const,
    condition: 'good' as const,
    utilities: ['water', 'gas'],
    parking: 'none' as const,
    internet: true,
    securityDeposit: 1650,
    advancePayment: 825,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'not-allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking. No pets. Quiet building — please keep noise down.',
    fullAddress: '520 W 114th St, Manhattan, NY 10025',
    lat: 40.8065,
    lng: -73.9629,
    availableFrom: new Date('2026-08-01'),
  },
  {
    title: 'Spacious 3BR in Park Slope',
    description: 'Generous three-bedroom apartment on a beautiful tree-lined block in Park Slope. Original hardwood floors, eat-in kitchen, and large living room. Walking distance to Prospect Park, the farmers market, and top-rated schools.',
    price: 4200,
    location: 'Brooklyn, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'],
    status: 'active' as const,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ['wifi', 'laundry', 'hardwood', 'dishwasher', 'storage', 'kitchen', 'garden'],
    size: 1400,
    balconies: 1,
    floor: 2,
    totalFloors: 4,
    furnishing: 'unfurnished' as const,
    condition: 'good' as const,
    utilities: ['electricity', 'water', 'gas'],
    parking: 'available' as const,
    internet: true,
    securityDeposit: 4200,
    advancePayment: 2100,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking. Pets allowed with additional deposit. Shared backyard.',
    fullAddress: '345 7th Ave, Brooklyn, NY 11215',
    lat: 40.6681,
    lng: -73.9822,
    availableFrom: new Date('2026-09-01'),
  },
  {
    title: 'Bright Room in Harlem Brownstone',
    description: 'Sunny room available in a shared brownstone in Harlem. Full bathroom, shared kitchen with all essentials, and access to a lovely garden. Close to A/B/C/D trains, Sylvia\'s, and the Apollo Theater. Diverse and welcoming neighborhood.',
    price: 950,
    location: 'Manhattan, NY',
    propertyType: 'room' as const,
    images: ['https://images.unsplash.com/photo-1595514535415-dae8580c416c?w=800'],
    status: 'active' as const,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['wifi', 'balcony', 'kitchen', 'garden', 'furnished'],
    size: 180,
    balconies: 0,
    floor: 1,
    totalFloors: 3,
    furnishing: 'furnished' as const,
    condition: 'good' as const,
    utilities: ['electricity', 'water', 'gas', 'internet'],
    parking: 'none' as const,
    internet: true,
    securityDeposit: 950,
    advancePayment: 475,
    leaseDuration: 6,
    minStay: 3,
    rentFrequency: 'monthly' as const,
    petPolicy: 'not-allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'Shared spaces. Keep kitchen clean after use. No overnight guests.',
    fullAddress: '207 W 133rd St, Manhattan, NY 10027',
    lat: 40.8115,
    lng: -73.9465,
    availableFrom: new Date('2026-07-01'),
  },
  {
    title: 'Waterfront Condo in Long Island City',
    description: 'Modern waterfront condominium with stunning East River views. Floor-to-ceiling windows, in-unit washer/dryer, and gourmet kitchen. Building amenities include pool, fitness center, concierge, and parking garage.',
    price: 3400,
    location: 'Queens, NY',
    propertyType: 'apartment' as const,
    images: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800'],
    status: 'active' as const,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ['wifi', 'parking', 'pool', 'gym', 'laundry', 'doorman', 'elevator', 'kitchen', 'dishwasher', 'views', 'washer/dryer'],
    size: 1100,
    balconies: 1,
    floor: 8,
    totalFloors: 15,
    furnishing: 'semi-furnished' as const,
    condition: 'excellent' as const,
    utilities: ['electricity', 'water', 'internet'],
    parking: 'included' as const,
    internet: true,
    securityDeposit: 3400,
    advancePayment: 3400,
    leaseDuration: 12,
    minStay: 6,
    rentFrequency: 'monthly' as const,
    petPolicy: 'case-by-case' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking. Pool hours: 6am-10pm. Concierge available 24/7.',
    fullAddress: '46-30 Center Blvd, Queens, NY 11109',
    lat: 40.7473,
    lng: -73.9530,
    availableFrom: new Date('2026-08-01'),
  },
  {
    title: 'Renovated House in Staten Island',
    description: 'Fully renovated four-bedroom colonial in a quiet Staten Island neighborhood. New kitchen, bathrooms, and roof. Large backyard with deck, perfect for entertaining. Two-car driveway, finished basement, and central air conditioning.',
    price: 3200,
    location: 'Staten Island, NY',
    propertyType: 'house' as const,
    images: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'],
    status: 'active' as const,
    bedrooms: 4,
    bathrooms: 3,
    amenities: ['wifi', 'parking', 'ac', 'balcony', 'fireplace', 'storage', 'kitchen', 'garage', 'garden', 'patio'],
    size: 2400,
    balconies: 1,
    floor: 1,
    totalFloors: 2,
    furnishing: 'unfurnished' as const,
    condition: 'new' as const,
    utilities: ['electricity', 'water', 'gas'],
    parking: 'included' as const,
    internet: false,
    securityDeposit: 3200,
    advancePayment: 3200,
    leaseDuration: 24,
    minStay: 12,
    rentFrequency: 'monthly' as const,
    petPolicy: 'allowed' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking inside. Pets welcome. Maintain the garden. Two-car garage included.',
    fullAddress: '89 Clove Rd, Staten Island, NY 10301',
    lat: 40.6105,
    lng: -74.1157,
    availableFrom: new Date('2026-09-15'),
  },
  {
    title: 'Luxury Penthouse with Panoramic City Views',
    description: 'Experience unparalleled luxury in this stunning penthouse apartment perched on the top floor of a premier building in the Upper East Side. Floor-to-ceiling windows wrap around the entire residence, offering breathtaking 360-degree views of Central Park, the Manhattan skyline, and the East River. The open-concept living space features imported Italian marble floors, a gourmet chef\'s kitchen with Sub-Zero and Wolf appliances, and a private terrace perfect for al fresco dining. The primary suite includes a spa-like bathroom with heated floors, a soaking tub, and a walk-in closet. Additional highlights include a home office, wine cellar, and smart home automation throughout.',
    price: 12500,
    location: 'Manhattan, NY',
    propertyType: 'apartment' as const,
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
    status: 'active' as const,
    bedrooms: 3,
    bathrooms: 3,
    amenities: ['wifi', 'gym', 'pool', 'doorman', 'elevator', 'ac', 'balcony', 'fireplace', 'kitchen', 'dishwasher', 'hardwood', 'laundry', 'storage', 'bike', 'views', 'patio', 'washer/dryer'],
    size: 2800,
    balconies: 2,
    floor: 42,
    totalFloors: 42,
    furnishing: 'furnished' as const,
    condition: 'excellent' as const,
    utilities: ['electricity', 'water', 'gas', 'internet'],
    parking: 'included' as const,
    internet: true,
    securityDeposit: 25000,
    advancePayment: 12500,
    leaseDuration: 24,
    minStay: 12,
    rentFrequency: 'monthly' as const,
    petPolicy: 'case-by-case' as const,
    smokingPolicy: 'not-allowed' as const,
    houseRules: 'No smoking inside the property. Quiet hours observed from 10pm to 8am. Maximum 2 overnight guests without prior approval. No short-term subletting. All guests must be registered with the doorman. Building amenities available 6am-10pm. Please respect neighbors and keep noise to a minimum in common areas.',
    rentalTerms: 'Lease requires first month rent, security deposit (2 months), and advance payment (1 month). Tenant responsible for electricity and internet utilities. Water and gas included. Annual rent escalation of 3% applies. Early termination requires 90-day written notice and penalty of 2 months rent. Tenant insurance required. Background and credit check mandatory. Minimum household income requirement: 40x monthly rent.',
    fullAddress: '1000 Fifth Avenue, Penthouse A, New York, NY 10028',
    lat: 40.7831,
    lng: -73.9654,
    availableFrom: new Date('2026-10-01'),
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
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('rentivo');

    // Clear existing data
    await db.collection('user').deleteMany({});
    await db.collection('properties').deleteMany({});
    await db.collection('interactions').deleteMany({});
    await db.collection('reviews').deleteMany({});
    await db.collection('rentals').deleteMany({});
    await db.collection('session').deleteMany({});
    console.log('Cleared existing data');

    // Create demo users
    const ownerPassword = await bcrypt.hash('owner1234', SALT_ROUNDS);
    const renterPassword = await bcrypt.hash('demo1234', SALT_ROUNDS);

    const ownerResult = await db.collection('user').insertOne({
      email: 'owner@demo.com',
      password: ownerPassword,
      role: 'owner',
      name: 'Sarah Chen',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const renterResult = await db.collection('user').insertOne({
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

    await db.collection('interactions').insertMany(interactions);
    console.log(`Created ${interactions.length} interactions for demo renter`);

    // Create reviews (from a third user for variety)
    const reviewerResult = await db.collection('user').insertOne({
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
