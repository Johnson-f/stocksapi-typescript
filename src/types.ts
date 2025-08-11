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
  
  // New fields
  sharesOutstanding?: number;
  floatShares?: number;
  lastUpdated: Date;
  
  // Additional financial metrics that might be useful
  beta?: number;
  dividendPerShare?: number;
  dividendYield?: number;
  peRatio?: number;
  eps?: number;
}

/**
 * Represents a company's financial metrics
 */
export interface FinancialMetrics {
  // Basic Info
  symbol: string;
  asOfDate: Date;
  
  // Valuation Metrics
  marketCap?: number;
  enterpriseValue?: number;
  peRatio?: number;
  forwardPERatio?: number;
  pegRatio?: number;
  eps?: number;
  priceToBookRatio?: number;
  evToEbitda?: number;
  evToRevenue?: number;
  
  // Profitability
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  ebitda?: number;
  
  // Margins
  grossMargin?: number;
  operatingMargin?: number;
  profitMargin?: number;
  ebitdaMargin?: number;
  
  // Balance Sheet
  totalDebt?: number;
  totalEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
  
  // Cash Flow
  operatingCashFlow?: number;
  freeCashFlow?: number;
  freeCashFlowPerShare?: number;
  
  // Efficiency & Returns
  returnOnEquity?: number;
  returnOnAssets?: number;
  returnOnCapitalEmployed?: number;
  
  // Growth Metrics
  revenueGrowthYOY?: number;
  revenueGrowthQOQ?: number;
  epsGrowthYOY?: number;
  epsGrowthQOQ?: number;
  
  // Dividends
  dividendYield?: number;
  dividendPerShare?: number;
  dividendPayoutRatio?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  
  
  // Shares
  sharesOutstanding?: number;
  floatShares?: number;
  
  // Metadata
  reportPeriod?: 'annual' | 'quarterly';
  fiscalYearEnd?: string;
}

/**
 * Represents a stock quote
 */
export interface VolumeMetrics {
  avgDailyVolume: number;
  avgDailyVolumeDollar: number;
  currentVolume: number;
  avgVolume30Day?: number;
  avgVolume90Day?: number;
  avgVolume1Year?: number;
}

export interface PerformanceMetrics {
  oneWeek?: number;
  oneMonth?: number;
  threeMonth?: number;
  oneYear?: number;
  yearToDate?: number;
  [key: string]: number | undefined;
}

export interface StockQuote {
  symbol: string;
  companyName?: string;  // Optional company name
  price: number;
  change: number;
  changePercent: number;
  timestamp: Date;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  
  // New metrics
  volumeMetrics?: VolumeMetrics;
  performance?: PerformanceMetrics;
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
  // Basic Information
  symbol: string;
  fiscalDateEnding: Date;
  reportedDate: Date;
  
  // EPS Data
  reportedEPS: number;
  estimatedEPS?: number;
  surprise?: number;
  surprisePercentage?: number;
  
  // Revenue Data
  reportedRevenue?: number;
  estimatedRevenue?: number;
  revenueSurprise?: number;
  revenueSurprisePercentage?: number;
  
  // Period Information
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
  year: number;
  
  // Future Earnings Support
  isFutureReport?: boolean;  // True if this is a future/upcoming earnings report
  time?: string;            // e.g., "amc" (after market close), "bmo" (before market open)
  currency?: string;        // Currency of the reported values
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
  | '1d' | 'daily' | 'weekly' | 'monthly';

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
  getQuote(symbol: string, includeHistorical?: boolean): Promise<StockQuote>;
  getQuotes(symbols: string[]): Promise<BatchQuoteResult>;
  getCompanyProfile(symbol: string): Promise<CompanyProfile>;
  getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult>;
  getTimeSeries(
    symbol: string, 
    interval?: TimeInterval,
    period?: number,
    startDate?: Date,
    endDate?: Date,
    outputSize?: 'compact' | 'full'
  ): Promise<TimeSeriesPoint[]>;
  
  // Financial data methods
  getFinancialMetrics(
    symbol: string, 
    asOfDate?: Date,
    period?: 'annual' | 'quarterly' | 'ttm',
    includeGrowthMetrics?: boolean
  ): Promise<FinancialMetrics>;
  getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]>;
  getEarnings(
    symbol: string, 
    options?: {
      limit?: number;
      includeFutureReports?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<EarningsReport[]>;
  
  /**
   * Get upcoming earnings reports for stocks
   * @param options Options for fetching upcoming earnings
   * @param options.limit Maximum number of reports to return
   * @param options.startDate Start date for filtering (default: today)
   * @param options.endDate End date for filtering (default: 3 months from now)
   * @param options.symbols Array of symbols to filter by (if not provided, returns all stocks)
   */
  getUpcomingEarnings(
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      symbols?: string[];
    }
  ): Promise<EarningsReport[]>;
  
  // Market data methods
  searchSymbols(query: string): Promise<StockSymbol[]>;
  getMarketNews(symbols?: string[], limit?: number): Promise<NewsArticle[]>;
}

