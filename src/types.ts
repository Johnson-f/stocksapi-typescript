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
  roe?: number;
  
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
  currency?: number;
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
  currency?: string;
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
 * Types of economic indicators
 */
export type EconomicIndicator = 
  | 'interest_rate'           // Federal funds rate, ECB rate, etc.
  | 'inflation_cpi'           // Consumer Price Index
  | 'inflation_pce'           // Personal Consumption Expenditures
  | 'gdp'                     // Gross Domestic Product
  | 'gdp_growth'              // GDP Growth Rate
  | 'retail_sales'            // Retail Sales
  | 'manufacturing_pmi'       // Manufacturing PMI
  | 'services_pmi'            // Services PMI
  | 'composite_pmi'           // Composite PMI
  | 'trade_balance'           // Trade Balance / Current Account
  | 'consumer_confidence'     // Consumer Confidence Index
  | 'consumer_sentiment'      // University of Michigan Consumer Sentiment
  | 'housing_starts'          // Housing Starts
  | 'building_permits'        // Building Permits
  | 'existing_home_sales'     // Existing Home Sales
  | 'new_home_sales'          // New Home Sales
  | 'industrial_production'   // Industrial Production
  | 'capacity_utilization'    // Capacity Utilization Rate
  | 'unemployment_rate'       // Unemployment Rate
  | 'nonfarm_payrolls'        // Non-Farm Payrolls
  | 'jobless_claims'          // Initial/Continuing Jobless Claims
  | 'labor_participation'     // Labor Force Participation Rate
  | 'durable_goods'           // Durable Goods Orders
  | 'factory_orders'          // Factory Orders
  | 'business_inventories'    // Business Inventories
  | 'ism_manufacturing'       // ISM Manufacturing Index
  | 'ism_services'            // ISM Services Index
  | 'ppi'                     // Producer Price Index
  | 'import_export_prices'    // Import/Export Price Indices
  | 'fomc_minutes'            // FOMC Meeting Minutes
  | 'beige_book'              // Federal Reserve Beige Book
  | 'treasury_budget'         // Treasury Budget Statement
  | 'money_supply'            // M1, M2 Money Supply
  | 'crude_inventories'       // EIA Crude Oil Inventories
  | 'mortgage_applications'   // MBA Mortgage Applications
  | 'redbook'                 // Redbook Retail Sales Index;

/**
 * Importance level of economic events
 */
export type EconomicEventImportance = 'low' | 'medium' | 'high';

/**
 * Country/Region codes for economic data
 */
export type EconomicRegion = 
  | 'US'   // United States
  | 'EU'   // European Union
  | 'UK'   // United Kingdom
  | 'JP'   // Japan
  | 'CN'   // China
  | 'CA'   // Canada
  | 'AU'   // Australia
  | 'NZ'   // New Zealand
  | 'CH'   // Switzerland
  | 'SE'   // Sweden
  | 'NO'   // Norway
  | 'IN'   // India
  | 'BR'   // Brazil
  | 'MX'   // Mexico
  | 'KR'   // South Korea
  | 'SG'   // Singapore
  | 'HK'   // Hong Kong
  | 'ZA'   // South Africa
  | 'Global'; // Global/Multi-region

/**
 * Represents an economic event (past or future)
 */
export interface EconomicEvent {
  // Basic Information
  id: string;
  indicator: EconomicIndicator;
  name: string;                    // Human-readable name
  country: EconomicRegion;
  currency?: string;                // Relevant currency if applicable
  
  // Event Timing
  releaseDate: Date;                // When the data is/was released
  period: string;                   // Period covered (e.g., "Q3 2024", "September 2024")
  periodStart?: Date;               // Start of the period covered
  periodEnd?: Date;                 // End of the period covered
  
  // Data Values
  actual?: number;                  // Actual value (null for future events)
  forecast?: number;                // Consensus forecast
  previous?: number;                // Previous period's value
  revised?: number;                 // Revised previous value if applicable
  
  // Additional Metrics
  unit?: string;                    // Unit of measurement (%, billions, index, etc.)
  actualDisplay?: string;           // Formatted display value
  forecastDisplay?: string;         // Formatted forecast value
  previousDisplay?: string;         // Formatted previous value
  
  // Impact and Analysis
  importance: EconomicEventImportance;
  impact?: 'positive' | 'negative' | 'neutral' | 'mixed';  // Market impact
  surprise?: number;                // Actual vs Forecast difference
  surprisePercentage?: number;      // Surprise as percentage
  
  // Metadata
  source?: string;                  // Data source (BLS, Census, Fed, etc.)
  notes?: string;                   // Additional notes or context
  isFuture: boolean;                // True if this is a future event
  isPreliminary?: boolean;          // True if data is preliminary
  isRevised?: boolean;              // True if this updates previous data
  
  // Related Information
  relatedEvents?: string[];         // IDs of related events
  marketReaction?: {                // Optional market reaction data
    sp500Change?: number;
    dowChange?: number;
    nasdaqChange?: number;
    vixChange?: number;
    dollarIndexChange?: number;
    yieldChange10Y?: number;
  };
}

/**
 * Options for fetching economic events
 */
export interface EconomicEventOptions {
  indicators?: EconomicIndicator[];  // Filter by specific indicators
  countries?: EconomicRegion[];      // Filter by countries/regions
  importance?: EconomicEventImportance[]; // Filter by importance
  startDate?: Date;                  // Start date for the range
  endDate?: Date;                    // End date for the range
  includeFuture?: boolean;           // Include future events
  includeHistorical?: boolean;       // Include historical events
  limit?: number;                    // Maximum number of events
}

/**
 * Economic calendar entry (simplified view)
 */
export interface EconomicCalendarEntry {
  date: Date;
  events: Array<{
    time?: string;                  // Time of release (e.g., "08:30 ET")
    indicator: EconomicIndicator;
    name: string;
    country: EconomicRegion;
    importance: EconomicEventImportance;
    forecast?: number;
    previous?: number;
    actual?: number;                // Will be null for future events
  }>;
}

/**
 * Batch result for economic events
 */
export interface BatchEconomicEventResult {
  [indicator: string]: BatchResult<EconomicEvent[]>;
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
  
  // Economic data methods
  /**
   * Get economic events (historical and/or future)
   * @param options Options for filtering economic events
   */
  getEconomicEvents(
    options?: EconomicEventOptions
  ): Promise<EconomicEvent[]>;
  
  /**
   * Get upcoming economic events calendar
   * @param options Options for filtering the calendar
   */
  getEconomicCalendar(
    options?: {
      startDate?: Date;
      endDate?: Date;
      countries?: EconomicRegion[];
      importance?: EconomicEventImportance[];
    }
  ): Promise<EconomicCalendarEntry[]>;
  
  /**
   * Get historical data for a specific economic indicator
   * @param indicator The economic indicator to fetch
   * @param country The country/region
   * @param options Additional options
   */
  getEconomicIndicator(
    indicator: EconomicIndicator,
    country: EconomicRegion,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<EconomicEvent[]>;
}

