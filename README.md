# StocksAPI TypeScript

[![npm version](https://img.shields.io/npm/v/stocksapi-typescript.svg?style=flat-square)](https://www.npmjs.com/package/stocksapi-typescript)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](http://www.typescriptlang.org/)

Unified Stock Market Data API Client - Fetch data from multiple stock market APIs (prices, earnings, estimates, financials, historical, and more) in a single consistent schema with TypeScript support.

## Features

- **Unified API**: Single interface for multiple stock market data providers
- **Type Safety**: Fully typed responses with TypeScript
- **Multiple Providers**: Support for Alpha Vantage (more coming soon)
- **Comprehensive Data**:
  - Real-time and historical stock prices
  - Company profiles and financials
  - Dividend history
  - Earnings reports
  - Market news
  - And more!

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

## Supported Providers

- [x] Alpha Vantage (default)
- [x] Finnhub
- [x] Twelve Data
- [x] Marketstack
- [x] EODHD
- [x] Tiingo

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

## License

ISC © [Your Name]
