export const typeDefs = `#graphql
type User {
  id:        ID!
  name:      String!
  email:     String!
  role:      UserRole!
  location:  String
  products:  [Product!]!
  orders:    [Order!]!
  createdAt: String!
}

type Product {
  id:          ID!
  name:        String!
  category:    Category!
  price:       Float!
  priceUnit:   String!
  isRental:    Boolean!
  stock:       Int!
  description: String
  images:      [String!]!
  seller:      User!
  reviews:     [Review!]!
  avgRating:   Float
  createdAt:   String!
}

type Order {
  id:              ID!
  buyer:           User!
  product:         Product!
  quantity:        Int!
  totalAmount:     Float!
  status:          OrderStatus!
  payment:         Payment
  rentalStartDate: String
  rentalEndDate:   String
  createdAt:       String!
}

type Payment {
  id:                ID!
  razorpayOrderId:   String!
  razorpayPaymentId: String
  amount:            Int!
  currency:          String!
  status:            PaymentStatus!
  createdAt:         String!
}

type Review {
  id:        ID!
  product:   Product!
  reviewer:  User!
  rating:    Int!
  comment:   String
  createdAt: String!
}

type AuthPayload {
  token: String!
  user:  User!
}

type ProductList {
  items:      [Product!]!
  totalCount: Int!
  totalPages: Int!
  page:       Int!
}

type PaymentOrderResult {
  razorpayOrderId: String!
  amount:          Int!
  currency:        String!
  keyId:           String!
}

enum UserRole    { BUYER SELLER BOTH }
enum Category    { CROP FERTILIZER EQUIPMENT }
enum OrderStatus { PENDING CONFIRMED SHIPPED DELIVERED CANCELLED }
enum PaymentStatus { CREATED SUCCESS FAILED REFUNDED }

input ProductInput {
  name:        String!
  category:    Category!
  price:       Float!
  priceUnit:   String!
  isRental:    Boolean!
  stock:       Int!
  description: String
  images:      [String!]
}

input VerifyPaymentInput {
  razorpayOrderId:   String!
  razorpayPaymentId: String!
  razorpaySignature: String!
  orderId:           ID!
}

type Query {
  # Public
  products(category: Category, search: String, page: Int, limit: Int): ProductList!
  product(id: ID!): Product
  featuredProducts: [Product!]!

  # Authenticated
  me: User
  myOrders: [Order!]!
  myListings: [Product!]!
}

type Mutation {
  # Auth
  register(name: String!, email: String!, password: String!, role: UserRole!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!

  # Products (Seller only)
  createProduct(input: ProductInput!): Product!
  updateProduct(id: ID!, input: ProductInput!): Product!
  deleteProduct(id: ID!): Boolean!

  # Orders (Buyer only)
  placeOrder(productId: ID!, quantity: Int!, rentalStartDate: String, rentalEndDate: String): Order!
  cancelOrder(orderId: ID!): Order!

  # Orders (Seller only)
  updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!

  # Reviews (Buyer only — must have DELIVERED order for this product)
  addReview(productId: ID!, rating: Int!, comment: String): Review!

  # Payments
  createPaymentOrder(orderId: ID!): PaymentOrderResult!
  verifyPayment(input: VerifyPaymentInput!): Payment!
}
`;
