import { ApolloClient, InMemoryCache, createHttpLink, makeVar } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export const authTokenVar = makeVar<string | null>(
  typeof window !== 'undefined' ? localStorage.getItem('agromart_token') : null
);

export const currentUserVar = makeVar<any | null>(
  typeof window !== 'undefined'
    ? (() => {
        try {
          const userStr = localStorage.getItem('agromart_user');
          return userStr ? JSON.parse(userStr) : null;
        } catch {
          return null;
        }
      })()
    : null
);

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('agromart_token') : null;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Product: { keyFields: ['id'] },
      Order:   { keyFields: ['id'] },
      Payment: { keyFields: ['id'] },
      Review:  { keyFields: ['id'] },
      User:    { keyFields: ['id'] },
    },
  }),
  // Default: serve cache instantly, update in background (avoids full loading spinner on re-visits)
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy:  'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy:  'all',
    },
  },
});
