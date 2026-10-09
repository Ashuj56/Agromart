export type UserRole = 'BUYER' | 'SELLER' | 'BOTH';
export type Category = 'CROP' | 'FERTILIZER' | 'EQUIPMENT';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'CREATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location?: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer?: User;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  priceUnit: string;
  isRental: boolean;
  stock: number;
  description?: string | null;
  images: string[];
  seller?: User;
  reviews?: Review[];
  avgRating?: number | null;
  createdAt: string;
}

export interface Order {
  id: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  rentalStartDate?: string | null;
  rentalEndDate?: string | null;
  createdAt: string;
  product?: Product;
  buyer?: User;
  payment?: Payment | null;
}

export interface Payment {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface ProductList {
  items: Product[];
  totalCount: number;
  totalPages: number;
  page: number;
}
