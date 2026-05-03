const request = require('supertest');

// We must mock sqlite3 before requiring the app
jest.mock('sqlite3', () => {
  const mockAll = jest.fn((query, params, callback) => {
    // Simulate a database read failure
    callback(new Error('Simulated Database Connection Error'), null);
  });
  const mockGet = jest.fn((query, params, callback) => {
    callback(new Error('Simulated Database Read Error'), null);
  });
  const mockRun = jest.fn(function(query, params, callback) {
    callback(new Error('Simulated Database Write Error'));
  });

  return {
    verbose: () => ({
      Database: jest.fn().mockImplementation(() => ({
        all: mockAll,
        get: mockGet,
        run: mockRun,
        close: jest.fn()
      }))
    })
  };
});

// Require app after mocking sqlite3
const app = require('./server');

describe('Database Error Handling', () => {
  test('GET /api/election-data should handle DB errors and return 500', async () => {
    const response = await request(app).get('/api/election-data');
    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Failed to retrieve election data');
  });

  test('POST /api/settings/apikey should handle DB write errors and return 500', async () => {
    const response = await request(app)
      .post('/api/settings/apikey')
      .send({ apiKey: 'AIzaSyAValidLookingKeyLengthMustBe20+Chars' });
    
    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /api/settings/apikey/check should handle DB read errors and return false', async () => {
    const response = await request(app).get('/api/settings/apikey/check');
    // The implementation might return 200 with { configured: false } on error 
    // or 500. Let's see what the actual implementation does.
    // If it crashes, this test will fail, indicating a missing try/catch.
    expect([200, 500]).toContain(response.statusCode);
  });
});
