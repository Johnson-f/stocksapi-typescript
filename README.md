# StocksAPI TypeScript

[![npm version](https://img.shields.io/npm/v/stocksapi.svg?style=flat-square)](https://www.npmjs.com/package/stocksapi)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](http://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-137%20passing-brightgreen.svg?style=flat-square)]()
[![Coverage](https://img.shields.io/badge/coverage-44%25-orange.svg?style=flat-square)]()

**A unified, type-safe client for accessing comprehensive stock market and economic data from multiple providers with automatic fallback support.**

Fetch real-time quotes, historical data, company profiles, financial metrics, earnings reports, economic indicators, and market news from 8+ data providers through a single, consistent TypeScript interface.

## 🚀 Quick Start

```typescript
import { StocksAPI } from 'stocksapi';

// Initialize with provider configuration
const api = new StocksAPI({
  financialModelingPrep: { 
    apiKey: 'your-api-key',
    enabled: true 
  }
});

// Get real-time stock quote
const quote = await api.getQuote('AAPL');
console.log(`${quote.symbol}: $${quote.price} (${quote.changePercent}%)`);

// Get economic events
const events = await api.getEconomicEvents({
  countries: ['US'],
  importance: ['high']
});

console.log(`Found ${events.length} high-impact economic events`);
```

## 🎯 Features

### Core Features
- ✅ **Unified API** - Single interface for 8+ data providers
- ✅ **Type Safety** - Full TypeScript support with comprehensive types
- ✅ **Auto Fallback** - Automatic provider switching if one fails
- ✅ **Rate Limiting** - Built-in rate limit handling
- ✅ **Batch Operations** - Efficient bulk data retrieval
- ✅ **Error Handling** - Comprehensive error handling with clear messages

### Stock Market Data
- ✅ **Real-time Quotes** - Live stock prices with volume and performance metrics
- ✅ **Historical Data** - OHLCV data with multiple time intervals
- ✅ **Company Profiles** - Detailed company information and fundamentals
- ✅ **Financial Metrics** - P/E ratios, margins, growth metrics, and more
- ✅ **Earnings Reports** - Historical and upcoming earnings with estimates
- ✅ **Dividend History** - Dividend payments and yield information
- ✅ **Symbol Search** - Find stocks by company name or symbol
- ✅ **Market News** - Latest financial news by symbol or general market

### Economic Data (NEW!)
- ✅ **Economic Events** - 30+ economic indicators (GDP, CPI, unemployment, etc.)
- ✅ **Economic Calendar** - Upcoming economic releases by date
- ✅ **Historical Indicators** - Historical economic data trends
- ✅ **Multi-Country Support** - Data for US, EU, UK, Japan, and 15+ more regions
- ✅ **Impact Analysis** - Event importance and market impact assessment

## Installation

```bash
npm install stocksapi
# or
yarn add stocksapi
```

## Getting Started

1. Get an API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Create a new instance of the `StocksAPI` class with your API key

```typescript
import { StocksAPI } from 'stocksapi-typescript';

// Initialize with your Alpha Vantage API key
const stocksAPI = new StocksAPI('YOUR_ALPHA_VANTAGE_API_KEY');

// Or specify the provider (default is 'alpha-vantage')
// const stocksAPI = new StocksAPI('YOUR_API_KEY', 'alpha-vantage');
```

## Usage Examples

### Get a Stock Quote

```typescript
/**
 * Fetches and displays stock quote information for a given symbol
 * @param symbol - The stock symbol to fetch (e.g., 'AAPL', 'MSFT', 'GOOGL')
 */
async function getStockQuote(symbol: string) {
  try {
    const quote = await stocksAPI.getQuote(symbol);
    console.log(`\n${quote.symbol} - ${quote.companyName || 'Stock Quote'}`);
    console.log('----------------------------');
    console.log(`Price: $${quote.price.toFixed(2)}`);
    console.log(`Change: $${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)`);
    console.log(`Previous Close: $${quote.previousClose?.toFixed(2) || 'N/A'}`);
    console.log(`Volume: ${quote.volume?.toLocaleString() || 'N/A'}`);
    console.log(`Timestamp: ${quote.timestamp.toLocaleString()}`);
    return quote;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    throw error; // Re-throw to allow caller to handle the error
  }
}

// Example usage:
// getStockQuote('AAPL');  // Apple Inc.
// getStockQuote('MSFT');  // Microsoft
// getStockQuote('GOOGL'); // Alphabet (Google)

### Get Company Profile

```typescript
/**
 * Fetches and displays company profile information
 * @param symbol - The stock symbol to fetch profile for (e.g., 'MSFT', 'GOOGL')
 */
async function getCompanyProfile(symbol: string) {
  try {
    const profile = await stocksAPI.getCompanyProfile(symbol);
    console.log(`\n${profile.symbol} - ${profile.name}`);
    console.log('----------------------------');
    console.log('Sector:', profile.sector || 'N/A');
    console.log('Industry:', profile.industry || 'N/A');
    console.log('Market Cap: $' + (profile.marketCap ? profile.marketCap.toLocaleString() : 'N/A'));
    console.log('Employees:', profile.employees?.toLocaleString() || 'N/A');
    console.log('Website:', profile.website || 'N/A');
    console.log('\nDescription:');
    console.log('------------');
    console.log(profile.description || 'No description available');
    return profile;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error.message);
    throw error;
  }
}

// Example usage:
// getCompanyProfile('MSFT');    // Microsoft
// getCompanyProfile('GOOGL');   // Alphabet (Google)
```

### Get Historical Price Data

```typescript
/**
 * Fetches and displays historical price data
 * @param symbol - The stock symbol to fetch data for
 * @param interval - Time interval ('1d', '1wk', '1mo')
 * @param days - Number of days of historical data to fetch
 */
async function getHistoricalData(symbol: string, interval: string = '1d', days: number = 30) {
  try {
    console.log(`\nFetching ${days} days of ${interval} data for ${symbol}...\n`);
    
    const timeSeries = await stocksAPI.getTimeSeries(symbol, interval, days);
    
    if (timeSeries.length === 0) {
      console.log('No historical data available');
      return [];
    }
    
    // Display most recent 5 data points
    const displayCount = Math.min(5, timeSeries.length);
    console.log(`Latest ${displayCount} data points:`);
    console.log('--------------------------------');
    
    timeSeries.slice(0, displayCount).forEach(point => {
      const date = point.timestamp.toISOString().split('T')[0];
      console.log(`Date: ${date}`);
      console.log(`  Open:  $${point.open?.toFixed(2) || 'N/A'}`);
      console.log(`  High:  $${point.high?.toFixed(2) || 'N/A'}`);
      console.log(`  Low:   $${point.low?.toFixed(2) || 'N/A'}`);
      console.log(`  Close: $${point.close?.toFixed(2) || 'N/A'}`);
      console.log(`  Volume: ${point.volume?.toLocaleString() || 'N/A'}`);
      console.log('--------------------------------');
    });
    
    return timeSeries;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error.message);
    throw error;
  }
}

// Example usage:
// getHistoricalData('AAPL', '1d', 30);  // Daily data for last 30 days
// getHistoricalData('MSFT', '1wk', 12); // Weekly data for last 12 weeks
```

### Get Financial Metrics

```typescript
/**
 * Fetches and displays key financial metrics
 * @param symbol - The stock symbol to fetch metrics for
 */
async function getFinancials(symbol: string) {
  try {
    console.log(`\nFetching financial metrics for ${symbol}...\n`);
    const metrics = await stocksAPI.getFinancialMetrics(symbol);
    
    console.log(`${symbol} - Key Financial Metrics`);
    console.log('--------------------------------');
    console.log('Valuation Ratios:');
    console.log(`  P/E Ratio:         ${metrics.peRatio?.toFixed(2) || 'N/A'}`);
    console.log(`  P/E to Growth:     ${metrics.pegRatio?.toFixed(2) || 'N/A'}`);
    console.log(`  Price/Book:        ${metrics.priceToBook?.toFixed(2) || 'N/A'}`);
    console.log(`  Price/Sales:       ${metrics.priceToSales?.toFixed(2) || 'N/A'}`);
    
    console.log('\nProfitability:');
    console.log(`  Profit Margin:     ${(metrics.profitMargin * 100)?.toFixed(2)}%` || 'N/A');
    console.log(`  ROE:               ${(metrics.returnOnEquity * 100)?.toFixed(2)}%` || 'N/A');
    console.log(`  ROA:               ${(metrics.returnOnAssets * 100)?.toFixed(2)}%` || 'N/A');
    
    console.log('\nDividend Info:');
    console.log(`  Dividend Yield:    ${(metrics.dividendYield * 100)?.toFixed(2)}%` || 'N/A');
    console.log(`  Payout Ratio:      ${(metrics.payoutRatio * 100)?.toFixed(2)}%` || 'N/A');
    
    return metrics;
  } catch (error) {
    console.error(`Error fetching financials for ${symbol}:`, error.message);
    throw error;
  }
}

// Example usage:
// getFinancials('AAPL');  // Apple's financial metrics
// getFinancials('JPM');   // JPMorgan Chase financial metrics
```

### Search for Stock Symbols

```typescript
/**
 * Searches for stock symbols matching the query
 * @param query - Search term (company name or symbol)
 * @param maxResults - Maximum number of results to return (default: 10)
 */
async function searchSymbols(query: string, maxResults: number = 10) {
  try {
    console.log(`\nSearching for symbols matching: "${query}"\n`);
    const results = await stocksAPI.searchSymbols(query);
    
    if (results.length === 0) {
      console.log('No matching symbols found');
      return [];
    }
    
    // Display results in a table format
    console.log('Symbol'.padEnd(8) + '  ' + 'Company Name'.padEnd(40) + '  Exchange'.padEnd(12) + 'Type');
    console.log('-'.repeat(70));
    
    results.slice(0, maxResults).forEach((stock, index) => {
      const displayName = stock.name.length > 38 ? stock.name.substring(0, 35) + '...' : stock.name;
      console.log(
        `${stock.symbol.padEnd(8)}  ${displayName.padEnd(40)}  ${stock.exchange?.padEnd(12) || 'N/A'.padEnd(12)} ${stock.type || 'N/A'}`
      );
    });
    
    if (results.length > maxResults) {
      console.log(`\n...and ${results.length - maxResults} more results`);
    }
    
    return results;
  } catch (error) {
    console.error('Error searching symbols:', error.message);
    throw error;
  }
}

// Example usage:
// searchSymbols('apple');      // Search for Apple-related symbols
// searchSymbols('bank', 5);    // First 5 bank-related symbols
```

## API Reference

### StocksAPI

The main class for interacting with the StocksAPI library.

#### Constructor

```typescript
new StocksAPI(apiKey: string, provider?: ApiProvider)
```

- `apiKey`: Your API key for the specified provider
- `provider`: The data provider to use (default: `'alpha-vantage'`)

#### Methods

- `getQuote(symbol: string): Promise<StockQuote>` - Get current quote for a symbol
- `getCompanyProfile(symbol: string): Promise<CompanyProfile>` - Get company profile information
- `getTimeSeries(symbol: string, interval: TimeInterval, period?: number): Promise<TimeSeriesPoint[]>` - Get historical price data
- `getFinancialMetrics(symbol: string): Promise<FinancialMetrics>` - Get financial metrics
- `getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]>` - Get dividend history
- `getEarnings(symbol: string, limit?: number): Promise<EarningsReport[]>` - Get earnings reports
- `searchSymbols(query: string): Promise<StockSymbol[]>` - Search for stock symbols
- `getMarketNews(symbols?: string[], limit?: number): Promise<NewsArticle[]>` - Get market news
- `getEconomicEvents(options?: EconomicEventOptions): Promise<EconomicEvent[]>` - Get economic events
- `getEconomicCalendar(options?: EconomicEventOptions): Promise<EconomicCalendar[]>` - Get economic calendar
- `getEconomicIndicator(indicator: string, country: string, options?: EconomicIndicatorOptions): Promise<EconomicIndicator[]>` - Get economic indicators

## 🌍 Economic Data API Reference

### Economic Events

```typescript
// Get high-impact US economic events
const events = await api.getEconomicEvents({
  countries: ['US'],
  importance: ['high'],
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
  limit: 20
});

console.log(events[0]);
/*
{
  id: 'event-123',
  indicator: 'nonfarm_payrolls',
  name: 'Non-Farm Payrolls',
  country: 'US',
  releaseDate: 2024-01-05T13:30:00.000Z,
  period: 'December 2023',
  actual: 216000,
  forecast: 170000,
  previous: 199000,
  unit: 'jobs',
  importance: 'high',
  isFuture: false,
  surprise: 46000,
  surprisePercentage: 27.06,
  source: 'Bureau of Labor Statistics'
}
*/

// Available indicators
const indicators = [
  'interest_rate', 'inflation_cpi', 'gdp', 'unemployment_rate',
  'nonfarm_payrolls', 'retail_sales', 'manufacturing_pmi',
  'consumer_confidence', 'housing_starts', 'trade_balance'
  // ... and 20+ more
];

// Available countries
const countries = [
  'US', 'EU', 'UK', 'JP', 'CN', 'CA', 'AU', 'NZ', 'CH',
  'SE', 'NO', 'IN', 'BR', 'MX', 'KR', 'SG', 'HK', 'ZA'
];
```

### Economic Calendar

```typescript
const calendar = await api.getEconomicCalendar({
  countries: ['US', 'EU'],
  importance: ['high', 'medium'],
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
});

console.log(calendar[0]);
/*
{
  date: 2024-01-16T00:00:00.000Z,
  events: [
    {
      indicator: 'retail_sales',
      name: 'Retail Sales MoM',
      country: 'US',
      importance: 'high',
      forecast: 0.3,
      previous: 0.1,
      actual: null // Future event
    }
  ]
}
*/
```

### Economic Indicators

```typescript
// Get GDP data for the US
const gdpData = await api.getEconomicIndicator('gdp', 'US', {
  startDate: new Date('2020-01-01'),
  endDate: new Date(),
  limit: 12
});

console.log(gdpData[0]);
/*
{
  id: 'gdp-us-q3-2023',
  indicator: 'gdp',
  name: 'Gross Domestic Product',
  country: 'US',
  releaseDate: 2023-10-26T12:30:00.000Z,
  period: 'Q3 2023',
  actual: 26854.6,
  previous: 26840.1,
  unit: 'billions USD',
  importance: 'high',
  isFuture: false
}
*/
```

## 🏢 Supported Providers

| Provider | Stock Data | Economic Data | Rate Limits | Free Tier |
|----------|------------|---------------|-------------|-----------||
| **Financial Modeling Prep** | ✅ Full | ✅ Full | 250/day | Yes |
| **Alpha Vantage** | ✅ Full | ❌ No | 25/day | Yes |
| **Finnhub** | ✅ Full | ❌ No | 60/min | Yes |
| **Twelve Data** | ✅ Full | ❌ No | 8/min | Yes |
| **Polygon.io** | ✅ Full | ❌ No | 5/min | Yes |
| **EODHD** | ✅ Full | ❌ No | 1000/day | Yes |
| **Tiingo** | ✅ Full | ❌ No | 1000/day | Yes |
| **Marketstack** | ⚠️ Limited | ❌ No | 100/month | Yes |
| **Quodd** | ✅ Full | ❌ No | Custom | Premium |

### Twelve Data

[Twelve Data](https://twelvedata.com) provides comprehensive financial data including stocks, forex, crypto, ETFs, and commodities. They offer APIs, WebSocket, and SDKs with ultra-low latency real-time data streaming.

**Features:**
- Real-time and historical stock prices
- Company profiles and fundamentals
- Dividend and earnings data
- Market news
- Symbol search
- Support for 100,000+ symbols across 250+ exchanges

**Setup:**
1. Get your API key from [Twelve Data](https://twelvedata.com)
2. Configure the provider in your StocksAPI instance:

```typescript
import { StocksAPI } from 'stocksapi-typescript';

const api = new StocksAPI({
  twelveData: {
    apiKey: process.env.TWELVE_DATA_API_KEY || 'your-api-key-here',
    enabled: true,
    priority: 1,
    rateLimit: 8, // Free tier: 8 requests per minute
    features: {
      realtime: true,
      historical: true,
      fundamentals: true,
      news: true,
      forex: true,
      crypto: true,
      technicals: true
    }
  }
});
```

**Usage:**
```typescript
// Get stock quote
const quote = await api.getQuote('AAPL');

// Get company profile
const profile = await api.getCompanyProfile('AAPL');

// Get historical data
const timeSeries = await api.getTimeSeries('AAPL', 'daily', 30);

// Search symbols
const results = await api.searchSymbols('apple');

// Get market news
const news = await api.getMarketNews(['AAPL'], 10);
```

### Marketstack

[Marketstack](https://marketstack.com) provides real-time, intraday, and historical market data for over 30,000+ stock tickers worldwide. They offer a simple REST API with JSON responses and support for global exchanges.

**Features:**
- Real-time and historical stock prices
- End-of-day (EOD) data for 500,000+ tickers
- Support for 70+ stock exchanges worldwide
- Simple REST API with JSON responses
- Free tier with 100 monthly requests

**Setup:**
1. Get your API key from [Marketstack](https://marketstack.com)
2. Configure the provider in your StocksAPI instance:

```typescript
import { StocksAPI } from 'stocksapi-typescript';

const api = new StocksAPI({
  marketStack: {
    apiKey: process.env.MARKETSTACK_API_KEY || 'your-api-key-here',
    enabled: true,
    priority: 1,
    rateLimit: 100, // Free tier: 100 requests per month
    features: {
      realtime: true,
      historical: true,
      fundamentals: false, // Limited fundamental data
      news: false, // No news data
      forex: true,
      crypto: false,
      technicals: false
    }
  }
});
```

**Usage:**
```typescript
// Get stock quote
const quote = await api.getQuote('AAPL');

// Get company profile (basic information)
const profile = await api.getCompanyProfile('AAPL');

// Get historical data
const timeSeries = await api.getTimeSeries('AAPL', 'daily', 30);

// Search symbols
const results = await api.searchSymbols('apple');

// Get dividend history
const dividends = await api.getDividends('AAPL');

// Get financial metrics (basic calculations from price data)
const metrics = await api.getFinancialMetrics('AAPL');
```

**Note:** Marketstack provides limited fundamental data compared to other providers. Earnings reports and news data are not available through this provider.

### EODHD

[EODHD](https://eodhd.com) provides comprehensive financial data APIs covering worldwide markets, stocks, ETFs, bonds, financial news, Forex, delisted companies, and more. They offer 30+ years of historical and live data with institutional-level quality.

**Features:**
- Real-time and historical stock prices
- Comprehensive fundamental data and financial metrics
- Dividend and earnings data
- Market news and financial events
- Symbol search across 150,000+ tickers
- Support for 60+ stock exchanges
- 20,000+ ETFs and 600+ indices
- 1,100+ Forex pairs
- US Stock Options data

**Setup:**
1. Get your API key from [EODHD](https://eodhd.com)
2. Configure the provider in your StocksAPI instance:

```typescript
import { StocksAPI } from 'stocksapi-typescript';

const api = new StocksAPI({
  eodhd: {
    apiKey: process.env.EODHD_API_KEY || 'your-api-key-here',
    enabled: true,
    priority: 1,
    rateLimit: 1000, // Free tier: 1000 requests per day
    features: {
      realtime: true,
      historical: true,
      fundamentals: true,
      news: true,
      forex: true,
      crypto: true,
      technicals: true
    }
  }
});
```

**Usage:**
```typescript
// Get stock quote
const quote = await api.getQuote('AAPL');

// Get comprehensive company profile
const profile = await api.getCompanyProfile('AAPL');

// Get detailed financial metrics
const metrics = await api.getFinancialMetrics('AAPL');

// Get historical data
const timeSeries = await api.getTimeSeries('AAPL', 'daily', 30);

// Search symbols
const results = await api.searchSymbols('apple');

// Get dividend history
const dividends = await api.getDividends('AAPL');

// Get earnings reports
const earnings = await api.getEarnings('AAPL', { limit: 4 });

// Get upcoming earnings
const upcomingEarnings = await api.getUpcomingEarnings({ limit: 10 });

// Get market news
const news = await api.getMarketNews(['AAPL'], 10);
```

**Advantages:**
- Comprehensive fundamental data
- High-quality historical data (30+ years)
- Extensive coverage of global markets
- Real-time and delayed data options
- Rich financial metrics and ratios
- News and events data
- Competitive pricing with free tier

### Tiingo

[Tiingo](https://www.tiingo.com/) provides institutional-quality financial data APIs with a focus on simplicity and reliability. They offer comprehensive coverage of stocks, ETFs, mutual funds, and other financial instruments with clean, normalized data.

**Features:**
- Real-time and historical stock prices
- Comprehensive fundamental data and financial statements
- Dividend and earnings data
- Market news and financial events
- Symbol search across global markets
- Support for multiple exchanges and asset classes
- Clean, normalized data with consistent schemas
- RESTful API with JSON responses

**Setup:**
1. Get your API key from [Tiingo](https://api.tiingo.com/)
2. Configure the provider in your StocksAPI instance:

```typescript
import { StocksAPI } from 'stocksapi-typescript';

const api = new StocksAPI({
  tiingo: {
    apiKey: process.env.TIINGO_API_KEY || 'your-api-key-here',
    enabled: true,
    priority: 1,
    rateLimit: 1000, // Free tier: 1000 requests per day
    features: {
      realtime: true,
      historical: true,
      fundamentals: true,
      news: true,
      forex: true,
      crypto: false,
      technicals: false
    }
  }
});
```

**Usage:**
```typescript
// Get stock quote
const quote = await api.getQuote('AAPL');

// Get company profile
const profile = await api.getCompanyProfile('AAPL');

// Get detailed financial metrics
const metrics = await api.getFinancialMetrics('AAPL');

// Get historical data
const timeSeries = await api.getTimeSeries('AAPL', 'daily', 30);

// Search symbols
const results = await api.searchSymbols('apple');

// Get dividend history
const dividends = await api.getDividends('AAPL');

// Get earnings reports
const earnings = await api.getEarnings('AAPL', { limit: 4 });

// Get market news
const news = await api.getMarketNews(['AAPL'], 10);
```

**Advantages:**
- Clean, normalized data with consistent schemas
- Comprehensive fundamental data coverage
- Reliable API with good uptime
- Simple REST API design
- Good documentation and support
- Competitive pricing with free tier
- Focus on data quality and reliability

## 🎭 TypeScript Types

All interfaces are fully typed for IntelliSense support:

```typescript
import { 
  StockQuote, 
  CompanyProfile, 
  FinancialMetrics,
  TimeSeriesPoint,
  EarningsReport,
  Dividend,
  NewsArticle,
  EconomicEvent,
  EconomicIndicator,
  EconomicRegion,
  EconomicEventOptions 
} from 'stocksapi';

// Type-safe API calls
const quote: StockQuote = await api.getQuote('AAPL');
const events: EconomicEvent[] = await api.getEconomicEvents();
```

## 🚨 Error Handling

```typescript
try {
  const quote = await api.getQuote('INVALID');
} catch (error) {
  console.error('Error:', error.message);
  // Handle specific error types
  if (error.message.includes('All providers failed')) {
    // All configured providers failed
  }
}

// Graceful degradation for optional data
const earnings = await api.getEarnings('AAPL').catch(() => []);
const news = await api.getMarketNews(['AAPL']).catch(() => []);
```

## ⚡ Performance & Best Practices

### Batch Operations
```typescript
// Efficient: Single batch call
const quotes = await api.getQuotes(['AAPL', 'MSFT', 'GOOGL']);

// Inefficient: Multiple individual calls
const appl = await api.getQuote('AAPL');
const msft = await api.getQuote('MSFT');
const googl = await api.getQuote('GOOGL');
```

### Rate Limiting
```typescript
// The library handles rate limiting automatically
// Use appropriate limits for bulk operations
const quotes = await api.getQuotes(symbols.slice(0, 100)); // Process in chunks
```

### Caching
```typescript
// Consider implementing caching for frequently accessed data
const cache = new Map();
const getCachedQuote = async (symbol: string) => {
  if (cache.has(symbol)) return cache.get(symbol);
  const quote = await api.getQuote(symbol);
  cache.set(symbol, quote);
  return quote;
};
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:providers
npm run test:economic

# Test with your API keys
FINANCIAL_MODELING_PREP_API_KEY=your_key npm run test:economic
```

## 📝 Examples

### Portfolio Tracker
```typescript
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
const quotes = await api.getQuotes(symbols);
const totalValue = Object.values(quotes)
  .filter(q => q.success)
  .reduce((sum, q) => sum + q.data!.price, 0);
```

### Economic Dashboard
```typescript
const todayEvents = await api.getEconomicCalendar({
  startDate: new Date(),
  endDate: new Date(),
  importance: ['high']
});

const gdpTrend = await api.getEconomicIndicator('gdp', 'US', {
  limit: 8 // Last 8 quarters
});
```

### Earnings Calendar
```typescript
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const upcomingEarnings = await api.getUpcomingEarnings({
  startDate: new Date(),
  endDate: nextWeek,
  symbols: ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN']
});
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## ⭐ Support

If you find this library useful, please give it a star! It helps others discover the project.

For issues and questions:
- 🐛 [Report bugs](https://github.com/Johnson-f/stocksapi-typescript/issues)
- 💡 [Request features](https://github.com/Johnson-f/stocksapi-typescript/issues)
- 📖 [Documentation](./ECONOMIC_INDICATORS_README.md)

---

Made with ❤️ by [Johnson-f](https://github.com/Johnson-f)
