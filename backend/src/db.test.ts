import { query } from './db';

describe('Database', () => {
  it('can connect to database', async () => {
    const result = await query('SELECT NOW() as now');
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].now).toBeInstanceOf(Date);
  });

  it('can execute a simple query', async () => {
    const result = await query('SELECT 1 + 1 as sum');
    expect(result.rows[0].sum).toBe(2);
  });
});
