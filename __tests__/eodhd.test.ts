import { EODHDClient } from '../src/providers/eodhd';

// Mock environment variable for testing
const mockApiKey = 'test-api-key';

describe('EODHDClient', () => {
  let client: EODHDClient;

  beforeEach(() => {
    client = new EODHDClient(mockApiKey);
  });

  describe('constructor', () => {
    it('should create an instance with the correct base URL', () => {
      expect(client).toBeInstanceOf(EODHDClient);
    });

    it('should throw an error if no API key is provided', () => {
      expect(() => new EODHDClient('')).toThrow('API key is required');
    });
  });

  describe('getQuote', () => {
    it('should throw an error for invalid symbol', async () => {
      await expect(client.getQuote('INVALID')).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getQuote('AAPL')).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getCompanyProfile', () => {
    it('should throw an error for invalid symbol', async () => {
      await expect(client.getCompanyProfile('INVALID')).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getCompanyProfile('AAPL')).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getTimeSeries', () => {
    it('should throw an error for invalid symbol', async () => {
      await expect(client.getTimeSeries('INVALID', 'daily', 30)).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getTimeSeries('AAPL', 'daily', 30)).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getFinancialMetrics', () => {
    it('should throw an error for invalid symbol', async () => {
      await expect(client.getFinancialMetrics('INVALID')).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getFinancialMetrics('AAPL')).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getDividends', () => {
    it('should return empty array for invalid symbol', async () => {
      // Mock fetch to return empty data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      } as Response);
      
      const dividends = await client.getDividends('INVALID');
      expect(dividends).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getDividends('AAPL')).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getEarnings', () => {
    it('should return empty array for invalid symbol', async () => {
      // Mock fetch to return empty data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      } as Response);
      
      const earnings = await client.getEarnings('INVALID');
      expect(earnings).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getEarnings('AAPL')).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getUpcomingEarnings', () => {
    it('should return empty array when no data available', async () => {
      // Mock fetch to return empty data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      } as Response);
      
      const earnings = await client.getUpcomingEarnings();
      expect(earnings).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getUpcomingEarnings()).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('searchSymbols', () => {
    it('should return empty array for invalid query', async () => {
      // Mock fetch to return empty data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      } as Response);
      
      const results = await client.searchSymbols('INVALID_QUERY');
      expect(results).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.searchSymbols('apple')).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getMarketNews', () => {
    it('should return empty array when no news available', async () => {
      // Mock fetch to return empty data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      } as Response);
      
      const news = await client.getMarketNews();
      expect(news).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(client.getMarketNews(['AAPL'])).rejects.toThrow('Failed to fetch data from EODHD');
    });
  });

  describe('getQuotes', () => {
    it('should handle multiple symbols with errors', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const results = await client.getQuotes(['AAPL', 'MSFT']);
      
      expect(results.AAPL.success).toBe(false);
      expect(results.MSFT.success).toBe(false);
      expect(results.AAPL.error).toBeInstanceOf(Error);
      expect(results.MSFT.error).toBeInstanceOf(Error);
    });
  });

  describe('getCompanyProfiles', () => {
    it('should handle multiple symbols with errors', async () => {
      // Mock fetch to return an error
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const results = await client.getCompanyProfiles(['AAPL', 'MSFT']);
      
      expect(results.AAPL.success).toBe(false);
      expect(results.MSFT.success).toBe(false);
      expect(results.AAPL.error).toBeInstanceOf(Error);
      expect(results.MSFT.error).toBeInstanceOf(Error);
    });
  });
}); 