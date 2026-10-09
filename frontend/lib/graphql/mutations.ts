import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
        location
      }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $role: UserRole!) {
    register(name: $name, email: $email, password: $password, role: $role) {
      token
      user {
        id
        name
        email
        role
        location
      }
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
      id
      name
      category
      price
      priceUnit
      isRental
      stock
      description
    }
  }
`;

export const PLACE_ORDER = gql`
  mutation PlaceOrder($productId: ID!, $quantity: Int!, $rentalStartDate: String, $rentalEndDate: String) {
    placeOrder(
      productId: $productId
      quantity: $quantity
      rentalStartDate: $rentalStartDate
      rentalEndDate: $rentalEndDate
    ) {
      id
      quantity
      totalAmount
      status
      createdAt
    }
  }
`;

export const CANCEL_ORDER = gql`
  mutation CancelOrder($orderId: ID!) {
    cancelOrder(orderId: $orderId) {
      id
      status
    }
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: ID!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;

export const CREATE_PAYMENT_ORDER = gql`
  mutation CreatePaymentOrder($orderId: ID!) {
    createPaymentOrder(orderId: $orderId) {
      razorpayOrderId
      amount
      currency
      keyId
    }
  }
`;

export const VERIFY_PAYMENT = gql`
  mutation VerifyPayment($input: VerifyPaymentInput!) {
    verifyPayment(input: $input) {
      id
      razorpayOrderId
      razorpayPaymentId
      amount
      status
    }
  }
`;

export const ADD_REVIEW = gql`
  mutation AddReview($productId: ID!, $rating: Int!, $comment: String) {
    addReview(productId: $productId, rating: $rating, comment: $comment) {
      id
      rating
      comment
      createdAt
    }
  }
`;
