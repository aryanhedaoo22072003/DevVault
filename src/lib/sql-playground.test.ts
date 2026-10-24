import { describe, expect, it } from 'vitest';
import { SQL_DATASET, SQL_SCHEMA, SQL_STARTER } from './sql-playground';

describe('SQL playground fixture', () => {
  it('is deterministic and recreatable', () => {
    expect(SQL_DATASET).toHaveLength(4);
    expect(SQL_DATASET[0]).toContain('CREATE TABLE customers');
    expect(SQL_DATASET[2]).toContain('CREATE TABLE orders');
    expect(SQL_SCHEMA.map((table) => table.rows)).toEqual([4, 5]);
  });
  it('starts with a read-only aggregate query', () => {
    expect(SQL_STARTER.trim().toLowerCase().startsWith('select')).toBe(true);
    expect(SQL_STARTER).toContain('GROUP BY');
    expect(SQL_STARTER).toContain('HAVING');
  });
});
