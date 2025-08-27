import { QuoddClient } from '../src/providers/quodd';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('QuoddClient', () => {
  let client: QuoddClient;
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      defaults: {
        baseURL: 'https://api.quodd.com/v1',
        headers: {}
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new QuoddClient(mockApiKey);
    
    // Set the mock for get requests
    client['httpClient'].get = mockAxiosInstance.get;
  });

  describe('getQuote', () => {
    it('should fetch and return a stock quote', async () => {
      const mockQuoteData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        last: 150.25,
        change: 2.50,
        change_pct: 1.69,
        high: 151.00,
        low: 148.50,
        open: 149.00,
        prev_close: 147.75,
        volume: 50000000,
        timestamp: '2024-01-15T16:00:00Z'
      };

      const mockHistoricalData = [
        {
          date: '2024-01-15',
          open: 149.00,
          high: 151.00,
          low: 148.50,
          close: 150.25,
          volume: 50000000
        }
      ];

      // Mock the quote request
      (client['httpClient'].get as jest.Mock)
        .mockResolvedValueOnce({ data: mockQuoteData })
        .mockResolvedValueOnce({ data: { data: mockHistoricalData } });

      const quote = await client.getQuote('AAPL');

      expect(quote).toMatchObject({
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 50000000,
        high: 151.00,
        low: 148.50,
        open: 149.00,
        previousClose: 147.75
      });

      expect(client['httpClient'].get).toHaveBeenCalledWith('/quotes/equities', {
        params: { symbol: 'AAPL' }
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Invalid API key';
      (client['httpClient'].get as jest.Mock).mockRejectedValueOnce({
        response: {
          data: { error: errorMessage }
        }
      });

      await expect(client.getQuote('INVALID')).rejects.toThrow(
        'Failed to fetch data from Quodd:'
      );
    });
  });

  describe('getQuotes', () => {
    it('should fetch multiple quotes in batch', async () => {
      const mockBatchData = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          last: 150.25,
          change: 2.50,
          change_pct: 1.69,
          high: 151.00,
          low: 148.50,
          open: 149.00,
          prev_close: 147.75,
          volume: 50000000,
          timestamp: '2024-01-15T16:00:00Z'
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          last: 140.50,
          change: 1.25,
          change_pct: 0.90,
          high: 141.00,
          low: 139.50,
          open: 140.00,
          prev_close: 139.25,
          volume: 30000000,
          timestamp: '2024-01-15T16:00:00Z'
        }
      ];

      (client['httpClient'].get as jest.Mock).mockResolvedValueOnce({
        data: mockBatchData
      });

      const quotes = await client.getQuotes(['AAPL', 'GOOGL']);

      expect(quotes['AAPL']).toMatchObject({
        success: true,
        symbol: 'AAPL',
        data: {
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          price: 150.25
        }
      });

      expect(quotes['GOOGL']).toMatchObject({
        success: true,
        symbol: 'GOOGL',
        data: {
          symbol: 'GOOGL',
          companyName: 'Alphabet Inc.',
          price: 140.50
        }
      });
    });
  });

  describe('getCompanyProfile', () => {
    it('should fetch and return company profile', async () => {
      const mockProfileData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
        exchange: 'NASDAQ',
        currency: 'USD',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        website: 'https://www.apple.com',
        logo_url: 'https://logo.clearbit.com/apple.com',
        market_cap: 3000000000000,
        employees: 164000,
        ipo_date: '1980-12-12',
        shares_outstanding: 15500000000,
        float_shares: 15400000000,
        beta: 1.20,
        dividend_yield: 0.44,
        dividend_per_share: 0.96,
        pe_ratio: 30.50,
        eps: 4.92
      };

      (client['httpClient'].get as jest.Mock).mockResolvedValueOnce({
        data: mockProfileData
      });

      const profile = await client.getCompanyProfile('AAPL');

      expect(profile).toMatchObject({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        description: expect.stringContaining('Apple Inc.'),
        exchange: 'NASDAQ',
        currency: 'USD',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        website: 'https://www.apple.com',
        marketCap: 3000000000000,
        employees: 164000
      });

      expect(profile.ipoDate).toEqual(new Date('1980-12-12'));
    });
  });

  describe('getTimeSeries', () => {
    it('should fetch historical time series data', async () => {
      const mockTimeSeriesData = {
        data: [
          {
            date: '2024-01-15',
            open: 149.00,
            high: 151.00,
            low: 148.50,
            close: 150.25,
            volume: 50000000
          },
          {
            date: '2024-01-14',
            open: 147.00,
            high: 149.00,
            low: 146.50,
            close: 148.75,
            volume: 45000000
          }
        ]
      };

      (client['httpClient'].get as jest.Mock).mockResolvedValueOnce({
        data: mockTimeSeriesData
      });

      const timeSeries = await client.getTimeSeries('AAPL', 'daily', 2);

      expect(timeSeries).toHaveLength(2);
      expect(timeSeries[0]).toMatchObject({
        open: 149.00,
        high: 151.00,
        low: 148.50,
        close: 150.25,
        volume: 50000000
      });
      expect(timeSeries[0].timestamp).toEqual(new Date('2024-01-15'));
    });
  });

  describe('getFinancialMetrics', () => {
    it('should fetch financial metrics', async () => {
      const mockMetricsData = {
        symbol: 'AAPL',
        as_of_date: '2024-01-15',
        market_cap: 3000000000000,
        enterprise_value: 3100000000000,
        pe_ratio: 30.50,
        forward_pe_ratio: 28.00,
        peg_ratio: 2.50,
        eps: 4.92,
        price_to_book: 45.00,
        ev_to_ebitda: 22.00,
        ev_to_revenue: 7.00,
        roe: 150.00,
        revenue: 400000000000,
        gross_profit: 170000000000,
        operating_income: 120000000000,
        net_income: 100000000000,
        ebitda: 140000000000,
        gross_margin: 42.50,
        operating_margin: 30.00,
        profit_margin: 25.00,
        ebitda_margin: 35.00,
        total_debt: 120000000000,
        total_equity: 65000000000,
        current_ratio: 1.05,
        quick_ratio: 0.95,
        debt_to_equity: 1.85,
        operating_cash_flow: 110000000000,
        free_cash_flow: 90000000000,
        free_cash_flow_per_share: 5.80,
        return_on_equity: 150.00,
        return_on_assets: 30.00,
        return_on_capital_employed: 50.00,
        dividend_yield: 0.44,
        dividend_per_share: 0.96,
        dividend_payout_ratio: 15.00,
        beta: 1.20,
        fifty_two_week_high: 199.62,
        fifty_two_week_low: 124.17,
        shares_outstanding: 15500000000,
        float_shares: 15400000000,
        report_period: 'quarterly',
        fiscal_year_end: '2024-09-30'
      };

      (client['httpClient'].get as jest.Mock).mockResolvedValueOnce({
        data: mockMetricsData
      });

      const metrics = await client.getFinancialMetrics('AAPL');

      expect(metrics).toMatchObject({
        symbol: 'AAPL',
        marketCap: 3000000000000,
        peRatio: 30.50,
        eps: 4.92,
        revenue: 400000000000,
        netIncome: 100000000000,
        grossMargin: 42.50,
        profitMargin: 25.00
      });
    });
  });

  describe('searchSymbols', () => {
    it('should search for symbols', async () => {
      const mockSearchResults = {
        results: [
          {
            symbol: 'TSLA',
            name: 'Tesla, Inc.',
            currency: 'USD',
            exchange: 'NASDAQ',
            mic_code: 'XNAS',
            country: 'US',
            type: 'Common Stock'
          },
          {
            symbol: 'TSL',
            name: 'Tesla Exploration Ltd.',
            currency: 'CAD',
            exchange: 'TSX',
            mic_code: 'XTSE',
            country: 'CA',
            type: 'Common Stock'
          }
        ]
      };

      (client['httpClient'].get as jest.Mock).mockResolvedValueOnce({
        data: mockSearchResults
      });

      const results = await client.searchSymbols('Tesla');

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        exchange: 'NASDAQ',
        country: 'US'
      });
    });
  });

  describe('getMarketNews', () => {
    it('should fetch market news', async () => {
      const mockNewsData = {
        news: [
          {
            id: '1',
            source: 'Reuters',
            title: 'Apple announces new product',
            summary: 'Apple Inc. announced a new product line today...',
            url: 'https://example.com/news/1',
            published_at: '2024-01-15T10:00:00Z',
            image_url: 'https://example.com/image1.jpg',
            related_symbols: ['AAPL']
          },
          {
            id: '2',
            source: 'Bloomberg',
            title: 'Tech stocks rally',
            summary: 'Technology stocks showed strong gains...',
            url: 'https://example.com/news/2',
            published_at: '2024-01-15T09:00:00Z',
            related_symbols: ['AAPL', 'GOOGL', 'MSFT']
          }
        ]
      };

      (client['httpClient'].get as jest.Mock).mockResolvedValueOnce({
        data: mockNewsData
      });

      const news = await client.getMarketNews(['AAPL'], 2);

      expect(news).toHaveLength(2);
      expect(news[0]).toMatchObject({
        id: '1',
        source: 'Reuters',
        title: 'Apple announces new product',
        url: 'https://example.com/news/1',
        relatedSymbols: ['AAPL']
      });
      expect(news[0].publishedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });
  });
});
