import { authResolvers } from './auth.resolver';
import { productResolvers } from './product.resolver';
import { orderResolvers } from './order.resolver';
import { paymentResolvers } from './payment.resolver';
import { reviewResolvers } from './review.resolver';

export const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...productResolvers.Query,
    ...orderResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...productResolvers.Mutation,
    ...orderResolvers.Mutation,
    ...paymentResolvers.Mutation,
    ...reviewResolvers.Mutation,
  },
};
