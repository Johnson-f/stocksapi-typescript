/**
 * Unified Stock Market Data API Types
 * 
 * This file contains all the TypeScript interfaces and types used across the library.
 */

/**
 * Represents a stock symbol with its basic information
 */
/*
This file is a dictionary 
that defines what different stock market data should look like
*/


export interface StockSymbol {
  symbol: string;
  name: string;
  currency?: string;
  exchange?: string;
  mic_code?: string;
  country?: string;
  type?: string;
}

/**
 * Represents a single data point in a time series
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export { StocksApiConfig } from './config';
/**
 * Represents a company's profile information
 */
export interface CompanyProfile {
  symbol: string;
  name: string;
  description: string;
  exchange: string;
  currency: string;
  sector?: string;
  industry?: string;
  website?: string;
  logo?: string;
  marketCap?: number;
  employees?: number;
  ipoDate?: Date;
}

/**
 * Represents a company's financial metrics
 */
export interface FinancialMetrics {
  symbol: string;
  marketCap?: number;
  peRatio?: number;
  pegRatio?: number;
  eps?: number;
  revenue?: number;
  profitMargin?: number;
  dividendYield?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

/**
 * Represents a stock quote
 */
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: Date;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
}

/**
 * Represents a dividend payment
 */
export interface Dividend {
  symbol: string;
  amount: number;
  exDate: Date;
  paymentDate: Date;
  recordDate: Date;
  declarationDate?: Date;
}

/**
 * Represents an earnings report
 */
export interface EarningsReport {
  symbol: string;
  fiscalDateEnding: Date;
  reportedDate: Date;
  reportedEPS: number;
  estimatedEPS?: number;
  surprise?: number;
  surprisePercentage?: number;
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
  year: number;
}


/**
 * Represents a news article about a stock
 */
export interface NewsArticle {
  id: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  imageUrl?: string;
  relatedSymbols: string[];
}

/**
 * Time interval for time series data
 */
export type TimeInterval = 
  | '1min' | '5min' | '15min' | '30min' | '60min' 
  | 'daily' | 'weekly' | 'monthly';

/**
 * Base interface for API clients
 */
export interface BatchResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  symbol: string;
}

export interface BatchQuoteResult {
  [symbol: string]: BatchResult<StockQuote>;
}

export interface BatchCompanyProfileResult {
  [symbol: string]: BatchResult<CompanyProfile>;
}

export interface StockApiClient {
  // Stock data methods
  getQuote(symbol: string): Promise<StockQuote>;
  getQuotes(symbols: string[]): Promise<BatchQuoteResult>;
  getCompanyProfile(symbol: string): Promise<CompanyProfile>;
  getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult>;
  getTimeSeries(
    symbol: string, 
    interval: TimeInterval,
    period?: number
  ): Promise<TimeSeriesPoint[]>;
  
  // Financial data methods
  getFinancialMetrics(symbol: string): Promise<FinancialMetrics>;
  getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]>;
  getEarnings(symbol: string, limit?: number): Promise<EarningsReport[]>;
  
  // Market data methods
  searchSymbols(query: string): Promise<StockSymbol[]>;
  getMarketNews(symbols?: string[], limit?: number): Promise<NewsArticle[]>;
}

