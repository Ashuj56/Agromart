import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts($category: Category, $search: String, $page: Int, $limit: Int) {
    products(category: $category, search: $search, page: $page, limit: $limit) {
      items {
        id
        name
        category
        price
        priceUnit
        isRental
        stock
        description
        images
        avgRating
        createdAt
        seller {
          id
          name
          location
        }
      }
      totalCount
      totalPages
      page
    }
  }
`;

export const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts {
    featuredProducts {
      id
      name
      category
      price
      priceUnit
      isRental
      stock
      images
      avgRating
      seller {
        id
        name
        location
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      category
      price
      priceUnit
      isRental
      stock
      description
      images
      avgRating
      createdAt
      seller {
        id
        name
        email
        location
      }
      reviews {
        id
        rating
        comment
        createdAt
        reviewer {
          id
          name
        }
      }
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      role
      location
      createdAt
    }
  }
`;

export const GET_MY_ORDERS = gql`
  query GetMyOrders {
    myOrders {
      id
      quantity
      totalAmount
      status
      rentalStartDate
      rentalEndDate
      createdAt
      product {
        id
        name
        category
        price
        priceUnit
        images
      }
      payment {
        id
        razorpayOrderId
        amount
        status
      }
    }
  }
`;

export const GET_MY_LISTINGS = gql`
  query GetMyListings {
    myListings {
      id
      name
      category
      price
      priceUnit
      isRental
      stock
      images
      createdAt
    }
  }
`;
