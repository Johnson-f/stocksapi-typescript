# Economic Indicators Implementation

This document describes the newly implemented Economic Indicator functionality in the StocksAPI library.

## Overview

The library now supports comprehensive economic data retrieval through three main methods:
- `getEconomicEvents()` - Get economic events with filtering options
- `getEconomicCalendar()` - Get calendar view of economic events  
- `getEconomicIndicator()` - Get historical data for specific indicators

## Types and Interfaces

### EconomicIndicator Types
The library supports 30+ economic indicators:

```typescript
type EconomicIndicator = 
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
  | 'redbook';                // Redbook Retail Sales Index
```

### EconomicEvent Interface
```typescript
interface EconomicEvent {
  // Basic Information
  id: string;
  indicator: EconomicIndicator;
  name: string;                    // Human-readable name
  country: EconomicRegion;
  currency?: string;               // Relevant currency if applicable
  
  // Event Timing
  releaseDate: Date;               // When the data is/was released
  period: string;                  // Period covered (e.g., "Q3 2024", "September 2024")
  periodStart?: Date;              // Start of the period covered
  periodEnd?: Date;                // End of the period covered
  
  // Data Values
  actual?: number;                 // Actual value (null for future events)
  forecast?: number;               // Consensus forecast
  previous?: number;               // Previous period's value
  revised?: number;                // Revised previous value if applicable
  
  // Additional Metrics
  unit?: string;                   // Unit of measurement (%, billions, index, etc.)
  actualDisplay?: string;          // Formatted display value
  forecastDisplay?: string;        // Formatted forecast value
  previousDisplay?: string;        // Formatted previous value
  
  // Impact and Analysis
  importance: EconomicEventImportance; // 'low' | 'medium' | 'high'
  impact?: 'positive' | 'negative' | 'neutral' | 'mixed';
  surprise?: number;               // Actual vs Forecast difference
  surprisePercentage?: number;     // Surprise as percentage
  
  // Metadata
  source?: string;                 // Data source (BLS, Census, Fed, etc.)
  notes?: string;                  // Additional notes or context
  isFuture: boolean;               // True if this is a future event
  isPreliminary?: boolean;         // True if data is preliminary
  isRevised?: boolean;             // True if this updates previous data
  
  // Related Information
  relatedEvents?: string[];        // IDs of related events
  marketReaction?: {               // Optional market reaction data
    sp500Change?: number;
    dowChange?: number;
    nasdaqChange?: number;
    vixChange?: number;
    dollarIndexChange?: number;
    yieldChange10Y?: number;
  };
}
```

### EconomicRegion Types
```typescript
type EconomicRegion = 
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
```

## API Methods

### getEconomicEvents(options?: EconomicEventOptions)

Get economic events with comprehensive filtering options.

```typescript
interface EconomicEventOptions {
  indicators?: EconomicIndicator[];  // Filter by specific indicators
  countries?: EconomicRegion[];      // Filter by countries/regions
  importance?: EconomicEventImportance[]; // Filter by importance
  startDate?: Date;                  // Start date for the range
  endDate?: Date;                    // End date for the range
  includeFuture?: boolean;           // Include future events
  includeHistorical?: boolean;       // Include historical events
  limit?: number;                    // Maximum number of events
}
```

**Example Usage:**
```typescript
import { StocksAPI } from 'stocksapi';

const api = new StocksAPI({
  financialModelingPrep: { apiKey: 'your-api-key' }
});

// Get high-importance US economic events for the next 30 days
const events = await api.getEconomicEvents({
  countries: ['US'],
  importance: ['high'],
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  includeFuture: true,
  limit: 50
});

console.log(`Found ${events.length} upcoming economic events`);
events.forEach(event => {
  console.log(`${event.name}: ${event.releaseDate.toDateString()}`);
  if (event.forecast) {
    console.log(`  Forecast: ${event.forecast}${event.unit || ''}`);
  }
});
```

### getEconomicCalendar(options?)

Get a calendar view of economic events grouped by date.

```typescript
const calendar = await api.getEconomicCalendar({
  countries: ['US', 'EU'],
  importance: ['high', 'medium'],
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
});

calendar.forEach(day => {
  console.log(`\n${day.date.toDateString()}:`);
  day.events.forEach(event => {
    console.log(`  ${event.name} (${event.country}) - ${event.importance}`);
  });
});
```

### getEconomicIndicator(indicator, country, options?)

Get historical data for a specific economic indicator.

```typescript
// Get GDP data for the US for the last year
const gdpData = await api.getEconomicIndicator('gdp', 'US', {
  startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  endDate: new Date(),
  limit: 10
});

console.log(`GDP Historical Data:`);
gdpData.forEach(event => {
  console.log(`${event.period}: ${event.actual}${event.unit || ''}`);
});
```

## Provider Support

### Financial Modeling Prep (Full Support)
- ✅ `getEconomicEvents()`
- ✅ `getEconomicCalendar()`
- ✅ `getEconomicIndicator()`
- Provides comprehensive economic calendar data
- Maps 30+ economic indicators
- Supports filtering by country, importance, and date range

### Other Providers (Placeholder Implementation)
All other providers (Alpha Vantage, Finnhub, EODHD, etc.) return empty arrays for economic methods with appropriate warning messages. This ensures:
- No breaking changes to existing code
- Clear indication when economic data is not available
- Consistent API interface across all providers

## Configuration

Enable economic features in your provider configuration:

```typescript
const api = new StocksAPI({
  providers: {
    financialModelingPrep: {
      apiKey: 'your-api-key',
      enabled: true,
      features: {
        // ... other features
        economic: true  // Enable economic data
      }
    }
  }
});
```

## Error Handling

Economic methods follow the same error handling patterns as other API methods:

```typescript
try {
  const events = await api.getEconomicEvents({
    countries: ['US'],
    importance: ['high']
  });
  
  if (events.length === 0) {
    console.log('No economic events found for the specified criteria');
  }
} catch (error) {
  console.error('Error fetching economic events:', error.message);
}
```

## Best Practices

### 1. Use Appropriate Date Ranges
```typescript
// Good: Reasonable date range
const events = await api.getEconomicEvents({
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  limit: 100
});

// Avoid: Very large date ranges without limits
```

### 2. Filter by Importance
```typescript
// Get only high-impact events to reduce noise
const importantEvents = await api.getEconomicEvents({
  importance: ['high'],
  countries: ['US', 'EU']
});
```

### 3. Use Specific Indicators When Possible
```typescript
// More efficient than fetching all events
const gdpEvents = await api.getEconomicIndicator('gdp', 'US', {
  limit: 5
});
```

### 4. Handle Empty Results Gracefully
```typescript
const events = await api.getEconomicEvents(options);

if (events.length === 0) {
  console.log('No economic events found. This could mean:');
  console.log('- No events match your criteria');
  console.log('- The provider doesn\'t support economic data');
  console.log('- API rate limits may have been exceeded');
}
```

## Testing

A test file is included to verify economic functionality:

```bash
# Run the economic functionality test
cd src/tests
npx ts-node economic-test.ts
```

Or import and use the test function:

```typescript
import { testEconomicMethods } from './src/tests/economic-test';
await testEconomicMethods();
```

## Future Enhancements

Planned improvements include:
- Additional provider support (Alpha Vantage Premium, Quandl)
- More granular filtering options
- Historical economic data trends and analysis
- Integration with market data for correlation analysis
- Webhook support for real-time economic event notifications

## Troubleshooting

### No Economic Data Returned
1. **Check Provider Support**: Only Financial Modeling Prep currently supports economic data
2. **Verify API Key**: Ensure your FMP API key is valid and has sufficient quota
3. **Check Date Ranges**: Ensure your date range includes relevant periods
4. **Review Filters**: Your filters may be too restrictive

### API Rate Limits
- FMP free tier: 250 requests per day
- Consider implementing caching for frequently accessed data
- Use appropriate limits to avoid excessive API calls

### TypeScript Issues
Ensure you're importing the correct types:

```typescript
import { 
  EconomicEvent, 
  EconomicIndicator, 
  EconomicRegion,
  EconomicEventOptions 
} from 'stocksapi';
```

## Support

For issues or questions about economic data functionality:
1. Check this documentation first
2. Review the test file for usage examples
3. Check the provider's API documentation
4. File an issue with detailed error messages and code samples
