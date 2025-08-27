import { TwelveDataClient } from '../src/providers/twelve-data';

describe('TwelveDataClient', () => {
  let client: TwelveDataClient;
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    client = new TwelveDataClient(mockApiKey);
    // Mock the makeRequest method for testing
    (client as any).makeRequest = jest.fn();
    jest.clearAllMocks();
  });
  
  describe('getQuote', () => {
    it('should fetch and map a stock quote', async () => {
      const mockQuoteData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        mic_code: 'XNAS',
        currency: 'USD',
        datetime: '2023-05-15',
        timestamp: 1684166400,
        last_quote_at: 1684166400,
        open: '150.00',
        high: '151.50',
        low: '149.75',
        close: '150.25',
        volume: '1000000',
        previous_close: '149.00',
        change: '1.25',
        percent_change: '0.84',
        average_volume: '750000',
        is_market_open: true,
        fifty_two_week: {
          low: '120.00',
          high: '180.00',
          low_change: '30.25',
          high_change: '-29.75',
          low_change_percent: '25.21',
          high_change_percent: '-16.53',
          range: '120.00 - 180.00'
        }
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockQuoteData);
      
      const quote = await client.getQuote('AAPL', false); // Don't include historical data for this test
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(150.25);
      expect(quote.change).toBe(1.25);
      expect(quote.changePercent).toBe(0.84);
      expect(quote.high).toBe(151.50);
      expect(quote.low).toBe(149.75);
      expect(quote.open).toBe(150.00);
      expect(quote.previousClose).toBe(149.00);
      expect(quote.volume).toBe(1000000);
    });
    
    it('should handle API errors gracefully', async () => {
      (client as any).makeRequest.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(client.getQuote('INVALID')).rejects.toThrow('API Error');
    });
  });
  
  describe('getCompanyProfile', () => {
    it('should fetch and map company profile data', async () => {
      const mockProfile = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        mic_code: 'XNAS',
        currency: 'USD',
        country: 'US',
        type: 'Common Stock',
        description: 'Apple Inc. designs, manufactures, and markets smartphones.',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        employees: 164000,
        website: 'https://www.apple.com',
        logo: 'https://logo.clearbit.com/apple.com',
        market_cap: 2500000000000,
        shares_outstanding: 16000000000,
        float_shares: 15900000000,
        ipo_date: '1980-12-12'
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockProfile);
      
      const profile = await client.getCompanyProfile('AAPL');
      
      expect(profile.symbol).toBe('AAPL');
      expect(profile.name).toBe('Apple Inc.');
      expect(profile.exchange).toBe('NASDAQ');
      expect(profile.currency).toBe('USD');
      expect(profile.sector).toBe('Technology');
      expect(profile.industry).toBe('Consumer Electronics');
      expect(profile.website).toBe('https://www.apple.com');
      expect(profile.marketCap).toBe(2500000000000);
      expect(profile.ipoDate).toEqual(new Date('1980-12-12'));
    });
  });
  
  describe('searchSymbols', () => {
    it('should search for symbols and map results', async () => {
      const mockSearchResults = {
        data: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            currency: 'USD',
            exchange: 'NASDAQ',
            mic_code: 'XNAS',
            country: 'US',
            type: 'Common Stock'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockSearchResults);
      
      const results = await client.searchSymbols('apple');
      
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].name).toBe('Apple Inc.');
      expect(results[0].currency).toBe('USD');
    });
  });
}); 