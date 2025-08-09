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
- [ ] Finnhub (coming soon)
- [ ] Yahoo Finance (coming soon)

## License

ISC © [Your Name]
