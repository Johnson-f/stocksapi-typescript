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
npm install stocksapi-typescript
# or
yarn add stocksapi-typescript
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
async function getStockQuote() {
  try {
    const quote = await stocksAPI.getQuote('AAPL');
    console.log('Apple Inc. stock price:', quote.price);
    console.log('Change:', quote.change);
    console.log('Change %:', quote.changePercent);
  } catch (error) {
    console.error('Error fetching stock quote:', error);
  }
}
```

### Get Company Profile

```typescript
async function getCompanyProfile() {
  try {
    const profile = await stocksAPI.getCompanyProfile('MSFT');
    console.log('Company Name:', profile.name);
    console.log('Description:', profile.description);
    console.log('Market Cap:', profile.marketCap);
  } catch (error) {
    console.error('Error fetching company profile:', error);
  }
}
```

### Get Historical Price Data

```typescript
async function getHistoricalData() {
  try {
    const timeSeries = await stocksAPI.getTimeSeries('GOOGL', 'daily', 30);
    timeSeries.forEach(point => {
      console.log(`Date: ${point.timestamp.toISOString().split('T')[0]}`);
      console.log(`  Open: ${point.open}, Close: ${point.close}`);
      console.log(`  High: ${point.high}, Low: ${point.low}`);
      console.log(`  Volume: ${point.volume}`);
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
  }
}
```

### Get Financial Metrics

```typescript
async function getFinancials() {
  try {
    const metrics = await stocksAPI.getFinancialMetrics('AMZN');
    console.log('P/E Ratio:', metrics.peRatio);
    console.log('PEG Ratio:', metrics.pegRatio);
    console.log('EPS:', metrics.eps);
    console.log('Dividend Yield:', metrics.dividendYield);
  } catch (error) {
    console.error('Error fetching financial metrics:', error);
  }
}
```

### Search for Symbols

```typescript
async function searchSymbols() {
  try {
    const results = await stocksAPI.searchSymbols('apple');
    results.forEach(stock => {
      console.log(`${stock.symbol} - ${stock.name}`);
    });
  } catch (error) {
    console.error('Error searching symbols:', error);
  }
}
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
