import { StocksAPI } from './src/stocks-api';

/**
 * Example usage of the EODHD provider
 * 
 * To run this example:
 * 1. Set your EODHD API key as an environment variable: EODHD_API_KEY=your_api_key_here
 * 2. Run: npx ts-node example-eodhd.ts
 */

async function main() {
  // Initialize the API with EODHD configuration
  const api = new StocksAPI({
    providers: {
      eodhd: {
        apiKey: process.env.EODHD_API_KEY || '',
        enabled: true,
        priority: 1, // Set as primary provider
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
    console.log('🔍 Testing EODHD Provider...\n');

    // Test 1: Get a stock quote
    console.log('1. Getting stock quote for AAPL...');
    const quote = await api.getQuote('AAPL');
    console.log(`   Symbol: ${quote.symbol}`);
    console.log(`   Price: $${quote.price}`);
    console.log(`   Change: ${quote.change} (${quote.changePercent}%)`);
    console.log(`   Volume: ${quote.volume.toLocaleString()}`);
    console.log(`   Timestamp: ${quote.timestamp.toISOString()}\n`);

    // Test 2: Get company profile
    console.log('2. Getting company profile for AAPL...');
    const profile = await api.getCompanyProfile('AAPL');
    console.log(`   Name: ${profile.name}`);
    console.log(`   Exchange: ${profile.exchange}`);
    console.log(`   Sector: ${profile.sector}`);
    console.log(`   Industry: ${profile.industry}`);
    console.log(`   Market Cap: $${profile.marketCap?.toLocaleString() || 'N/A'}`);
    console.log(`   Employees: ${profile.employees?.toLocaleString() || 'N/A'}\n`);

    // Test 3: Get financial metrics
    console.log('3. Getting financial metrics for AAPL...');
    const metrics = await api.getFinancialMetrics('AAPL');
    console.log(`   P/E Ratio: ${metrics.peRatio?.toFixed(2) || 'N/A'}`);
    console.log(`   Forward P/E: ${metrics.forwardPERatio?.toFixed(2) || 'N/A'}`);
    console.log(`   PEG Ratio: ${metrics.pegRatio?.toFixed(2) || 'N/A'}`);
    console.log(`   EPS: $${metrics.eps?.toFixed(2) || 'N/A'}`);
    console.log(`   Dividend Yield: ${metrics.dividendYield?.toFixed(2)}%`);
    console.log(`   Beta: ${metrics.beta?.toFixed(2) || 'N/A'}\n`);

    // Test 4: Get time series data
    console.log('4. Getting historical data for AAPL (last 30 days)...');
    const timeSeries = await api.getTimeSeries('AAPL', 'daily', 30);
    console.log(`   Data points: ${timeSeries.length}`);
    if (timeSeries.length > 0) {
      const latest = timeSeries[timeSeries.length - 1];
      console.log(`   Latest close: $${latest.close}`);
      console.log(`   Date range: ${timeSeries[0].timestamp.toDateString()} to ${latest.timestamp.toDateString()}\n`);
    }

    // Test 5: Search for symbols
    console.log('5. Searching for symbols containing "Apple"...');
    const searchResults = await api.searchSymbols('Apple');
    console.log(`   Found ${searchResults.length} symbols:`);
    searchResults.slice(0, 5).forEach(result => {
      console.log(`   - ${result.symbol}: ${result.name} (${result.exchange})`);
    });
    console.log('');

    // Test 6: Get dividends
    console.log('6. Getting dividend history for AAPL (last year)...');
    const dividends = await api.getDividends('AAPL');
    console.log(`   Found ${dividends.length} dividend payments:`);
    dividends.slice(0, 3).forEach(dividend => {
      console.log(`   - ${dividend.exDate.toDateString()}: $${dividend.amount} per share`);
    });
    console.log('');

    // Test 7: Get earnings
    console.log('7. Getting earnings history for AAPL...');
    const earnings = await api.getEarnings('AAPL', { limit: 4 });
    console.log(`   Found ${earnings.length} earnings reports:`);
    earnings.forEach(earning => {
      console.log(`   - ${earning.period} ${earning.year}: $${earning.reportedEPS} EPS (${earning.reportedDate.toDateString()})`);
    });
    console.log('');

    // Test 8: Get market news
    console.log('8. Getting market news for AAPL...');
    const news = await api.getMarketNews(['AAPL'], 3);
    console.log(`   Found ${news.length} news articles:`);
    news.forEach(article => {
      console.log(`   - ${article.title} (${article.source})`);
      console.log(`     ${article.publishedAt.toDateString()}`);
    });

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('\n💡 Make sure to set your EODHD API key as an environment variable:');
        console.log('   export EODHD_API_KEY=your_api_key_here');
        console.log('\n   You can get a free API key from: https://eodhd.com/');
      }
    }
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
} 