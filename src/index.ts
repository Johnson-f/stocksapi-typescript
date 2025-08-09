/**
 * Unified Stock Market Data API Client
 * 
 * This package provides a consistent interface for fetching stock market data
 * from multiple sources, with TypeScript support out of the box.
 * 
 * The Front Door
 * This is like the reception desk of the library
 * It makes all the important stuff available when someone imports the library
 * It keeps the complex stuff hidden away
 * 
 * 
 */

// Re-export all types and the main StocksAPI class from stocks-api.ts
export * from './stocks-api';

// Export the base client interface and types for advanced usage
export * from './clients';