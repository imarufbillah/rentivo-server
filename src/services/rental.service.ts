import { ObjectId } from 'mongodb';
import { getCollections } from '../lib/db/collections';
import { stripe } from '../lib/stripe';
import { Rental, Property, RentalStatus } from '../types';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

export const createCheckoutSession = async (
  propertyId: string,
  renterId: string
): Promise<{ checkoutUrl: string; rentalId: string }> => {
  const { properties, rentals } = await getCollections();

  const property = await properties.findOne({ _id: new ObjectId(propertyId) });
  console.log('[Rental] findOne result:', !!property, 'propertyId:', propertyId, 'ownerId:', property?.ownerId?.toString());
  if (!property) {
    const count = await properties.countDocuments();
    console.log('[Rental] total properties in collection:', count);
    throw new Error('Property not found');
  }

  if (property.status !== 'active') {
    throw new Error('Property is not available for rent');
  }

  if (property.ownerId.toString() === renterId) {
    throw new Error('Cannot rent your own property');
  }

  const existingRental = await rentals.findOne({
    propertyId: new ObjectId(propertyId),
    status: { $in: ['pending', 'active'] },
  });
  if (existingRental) {
    throw new Error('Property is already rented or has a pending rental');
  }

  const monthlyRent = property.price;
  const securityDeposit = property.securityDeposit || 0;
  const advancePayment = property.advancePayment || 0;
  const totalPaid = monthlyRent + securityDeposit + advancePayment;

  const leaseDuration = property.leaseDuration || 12;
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + leaseDuration);

  const rental = await rentals.insertOne({
    propertyId: new ObjectId(propertyId),
    renterId: new ObjectId(renterId),
    ownerId: property.ownerId,
    status: 'pending',
    monthlyRent,
    securityDeposit,
    advancePayment,
    totalPaid,
    leaseDuration,
    startDate,
    endDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const lineItems: Array<{
    price_data: {
      currency: string;
      product_data: { name: string; description?: string };
      unit_amount: number;
    };
    quantity: number;
  }> = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'First Month Rent',
          description: `${property.title} — ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
        },
        unit_amount: monthlyRent * 100,
      },
      quantity: 1,
    },
  ];

  if (securityDeposit > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Security Deposit',
          description: 'Refundable security deposit',
        },
        unit_amount: securityDeposit * 100,
      },
      quantity: 1,
    });
  }

  if (advancePayment > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Advance Payment',
          description: 'Upfront advance payment',
        },
        unit_amount: advancePayment * 100,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${CLIENT_URL}/rental/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${CLIENT_URL}/rental/cancel?property_id=${propertyId}`,
    metadata: {
      rentalId: rental.insertedId.toString(),
      propertyId,
      renterId,
      ownerId: property.ownerId.toString(),
    },
  });

  await rentals.updateOne(
    { _id: rental.insertedId },
    { $set: { stripeSessionId: session.id, updatedAt: new Date() } }
  );

  return {
    checkoutUrl: session.url!,
    rentalId: rental.insertedId.toString(),
  };
};

export const handleWebhook = async (
  event: Stripe.Event
): Promise<{ processed: boolean }> => {
  const { rentals, properties } = await getCollections();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { rentalId, propertyId } = session.metadata || {};

    if (!rentalId || !propertyId) {
      return { processed: false };
    }

    await rentals.updateOne(
      { _id: new ObjectId(rentalId) },
      {
        $set: {
          status: 'active',
          stripePaymentIntentId: session.payment_intent as string,
          updatedAt: new Date(),
        },
      }
    );

    await properties.updateOne(
      { _id: new ObjectId(propertyId) },
      { $set: { status: 'rented', updatedAt: new Date() } }
    );

    return { processed: true };
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { rentalId } = session.metadata || {};

    if (rentalId) {
      await rentals.deleteOne({ _id: new ObjectId(rentalId) });
    }

    return { processed: true };
  }

  return { processed: false };
};

export const getRentalById = async (rentalId: string): Promise<Rental | null> => {
  const { rentals } = await getCollections();
  return rentals.findOne({ _id: new ObjectId(rentalId) });
};

export const getPropertyRentalStatus = async (
  propertyId: string
): Promise<{ isRented: boolean; rental: Rental | null }> => {
  const { rentals } = await getCollections();
  const rental = await rentals.findOne({
    propertyId: new ObjectId(propertyId),
    status: { $in: ['pending', 'active'] },
  });
  return { isRented: !!rental, rental };
};

export const getUserRentals = async (userId: string): Promise<Rental[]> => {
  const { rentals } = await getCollections();
  return rentals
    .find({ renterId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
};

export const getOwnerRentals = async (ownerId: string): Promise<Rental[]> => {
  const { rentals } = await getCollections();
  return rentals
    .find({ ownerId: new ObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .toArray();
};

export const ensureRentalIndexes = async (): Promise<void> => {
  const { rentals } = await getCollections();
  await Promise.all([
    rentals.createIndex({ propertyId: 1 }),
    rentals.createIndex({ renterId: 1 }),
    rentals.createIndex({ ownerId: 1 }),
    rentals.createIndex({ renterId: 1, status: 1 }),
    rentals.createIndex({ stripeSessionId: 1 }, { sparse: true }),
  ]);
};
