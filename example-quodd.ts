/**
 * Example usage of the Quodd provider
 * 
 * To use this example:
 * 1. Set your QUODD_API_KEY environment variable
 * 2. Run: npx ts-node example-quodd.ts
 */

import { StocksAPI } from './src/stocks-api';
import { QuoddClient } from './src/providers/quodd';

// Example 1: Using Quodd through the unified StocksAPI
async function unifiedApiExample() {
  console.log('\n=== Using Quodd through Unified StocksAPI ===\n');
  
  const api = new StocksAPI({
    providers: {
      quodd: {
        name: 'Quodd',
        baseUrl: 'https://api.quodd.com/v1',
        apiKey: process.env.QUODD_API_KEY || '',
        enabled: true,
        priority: 1, // Set as highest priority
        rateLimit: 1000,
        isPremium: false,
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
    }
  });

  try {
    // Get a stock quote
    const quote = await api.getQuote('AAPL');
    console.log('Stock Quote:', {
      symbol: quote.symbol,
      name: quote.companyName,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume
    });

    // Get company profile
    const profile = await api.getCompanyProfile('AAPL');
    console.log('\nCompany Profile:', {
      name: profile.name,
      sector: profile.sector,
      industry: profile.industry,
      marketCap: profile.marketCap,
      website: profile.website
    });

    // Get historical data
    const timeSeries = await api.getTimeSeries('AAPL', 'daily', 30);
    console.log('\nHistorical Data (last 5 days):');
    timeSeries.slice(0, 5).forEach(point => {
      console.log(`  ${point.timestamp.toDateString()}: Close: ${point.close}, Volume: ${point.volume}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Using Quodd client directly
async function directClientExample() {
  console.log('\n=== Using Quodd Client Directly ===\n');
  
  const apiKey = process.env.QUODD_API_KEY || '';
  
  if (!apiKey) {
    console.error('Please set QUODD_API_KEY environment variable');
    return;
  }

  const quoddClient = new QuoddClient(apiKey);

  try {
    // Get multiple quotes at once
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN'];
    const quotes = await quoddClient.getQuotes(symbols);
    
    console.log('Batch Quotes:');
    for (const symbol of symbols) {
      const result = quotes[symbol];
      if (result.success && result.data) {
        console.log(`  ${symbol}: $${result.data.price} (${result.data.changePercent}%)`);
      } else {
        console.log(`  ${symbol}: Failed to fetch`);
      }
    }

    // Get financial metrics
    const metrics = await quoddClient.getFinancialMetrics('AAPL');
    console.log('\nFinancial Metrics:', {
      peRatio: metrics.peRatio,
      marketCap: metrics.marketCap,
      dividendYield: metrics.dividendYield,
      beta: metrics.beta,
      profitMargin: metrics.profitMargin
    });

    // Get dividends
    const dividends = await quoddClient.getDividends('AAPL');
    console.log('\nRecent Dividends:');
    dividends.slice(0, 3).forEach(div => {
      console.log(`  Ex-Date: ${div.exDate.toDateString()}, Amount: $${div.amount}`);
    });

    // Get earnings
    const earnings = await quoddClient.getEarnings('AAPL', { limit: 4 });
    console.log('\nRecent Earnings:');
    earnings.forEach(earning => {
      console.log(`  ${earning.period} ${earning.year}: EPS: ${earning.reportedEPS}, Est: ${earning.estimatedEPS}`);
    });

    // Search for symbols
    const searchResults = await quoddClient.searchSymbols('Tesla');
    console.log('\nSearch Results for "Tesla":');
    searchResults.slice(0, 3).forEach(result => {
      console.log(`  ${result.symbol}: ${result.name} (${result.exchange})`);
    });

    // Get market news
    const news = await quoddClient.getMarketNews(['AAPL'], 5);
    console.log('\nMarket News:');
    news.forEach(article => {
      console.log(`  - ${article.title}`);
      console.log(`    Source: ${article.source}, Published: ${article.publishedAt.toDateString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run examples
async function main() {
  console.log('Quodd Provider Examples');
  console.log('=======================');
  
  // Check if API key is set
  if (!process.env.QUODD_API_KEY) {
    console.error('\n❌ Please set QUODD_API_KEY environment variable to run these examples');
    console.log('\nExample:');
    console.log('  export QUODD_API_KEY="your_api_key_here"');
    console.log('  npx ts-node example-quodd.ts\n');
    return;
  }

  await unifiedApiExample();
  await directClientExample();
}

// Run the main function
main().catch(console.error);
