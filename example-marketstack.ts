import { StocksAPI } from './src/stocks-api';

/**
 * Example usage of the Marketstack provider
 * 
 * To run this example:
 * 1. Set your MARKETSTACK_API_KEY environment variable
 * 2. Run: npm run build && node dist/example-marketstack.js
 */

async function main() {
  // Initialize the API with Marketstack configuration
  const api = new StocksAPI({
    marketStack: {
      apiKey: process.env.MARKETSTACK_API_KEY || '',
      enabled: true,
      priority: 1, // Set as primary provider
      rateLimit: 100,
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: false,
        news: false,
        forex: true,
        crypto: false,
        technicals: false
      }
    }
  });

  try {
    console.log('🔍 Testing Marketstack Provider...\n');

    // Test 1: Get a stock quote
    console.log('1. Getting stock quote for AAPL...');
    const quote = await api.getQuote('AAPL');
    console.log(`✅ Quote: ${quote.symbol} - $${quote.price} (${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} | ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
    console.log(`   Volume: ${quote.volume.toLocaleString()}`);
    console.log(`   High: $${quote.high}, Low: $${quote.low}`);
    console.log(`   Timestamp: ${quote.timestamp.toISOString()}\n`);

    // Test 2: Search for symbols
    console.log('2. Searching for symbols containing "Apple"...');
    const symbols = await api.searchSymbols('Apple');
    console.log(`✅ Found ${symbols.length} symbols:`);
    symbols.slice(0, 5).forEach(symbol => {
      console.log(`   - ${symbol.symbol} (${symbol.name}) - ${symbol.exchange}`);
    });
    console.log('');

    // Test 3: Get time series data
    console.log('3. Getting 30-day historical data for AAPL...');
    const timeSeries = await api.getTimeSeries('AAPL', 'daily', 30);
    console.log(`✅ Retrieved ${timeSeries.length} data points`);
    if (timeSeries.length > 0) {
      const latest = timeSeries[timeSeries.length - 1];
      const oldest = timeSeries[0];
      console.log(`   Latest: $${latest.close} on ${latest.timestamp.toDateString()}`);
      console.log(`   Oldest: $${oldest.close} on ${oldest.timestamp.toDateString()}`);
    }
    console.log('');

    // Test 4: Get company profile
    console.log('4. Getting company profile for AAPL...');
    const profile = await api.getCompanyProfile('AAPL');
    console.log(`✅ Profile: ${profile.name} (${profile.symbol})`);
    console.log(`   Exchange: ${profile.exchange}`);
    console.log(`   Currency: ${profile.currency}`);
    console.log(`   Last Updated: ${profile.lastUpdated.toISOString()}\n`);

    // Test 5: Get dividends
    console.log('5. Getting dividend history for AAPL...');
    const dividends = await api.getDividends('AAPL');
    console.log(`✅ Found ${dividends.length} dividend payments`);
    if (dividends.length > 0) {
      const latest = dividends[0];
      console.log(`   Latest: $${latest.amount} on ${latest.exDate.toDateString()}`);
    }
    console.log('');

    // Test 6: Get financial metrics
    console.log('6. Getting financial metrics for AAPL...');
    const metrics = await api.getFinancialMetrics('AAPL');
    console.log(`✅ Financial Metrics for ${metrics.symbol}:`);
    console.log(`   52-Week High: $${metrics.fiftyTwoWeekHigh}`);
    console.log(`   52-Week Low: $${metrics.fiftyTwoWeekLow}`);
    console.log(`   As of Date: ${metrics.asOfDate.toDateString()}\n`);

    // Test 7: Get multiple quotes
    console.log('7. Getting quotes for multiple symbols...');
    const quotes = await api.getQuotes(['AAPL', 'MSFT', 'GOOGL']);
    console.log(`✅ Retrieved quotes for ${Object.keys(quotes).length} symbols:`);
    Object.entries(quotes).forEach(([symbol, result]) => {
      if (result.success && result.data) {
        console.log(`   ${symbol}: $${result.data.price} (${result.data.change >= 0 ? '+' : ''}${result.data.change.toFixed(2)})`);
      } else {
        console.log(`   ${symbol}: Failed to fetch`);
      }
    });

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Check if it's an API key issue
      if (error.message.includes('API key') || error.message.includes('access_key')) {
        console.error('\n💡 Make sure you have set the MARKETSTACK_API_KEY environment variable');
        console.error('   You can get a free API key from: https://marketstack.com/');
      }
    }
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main }; 