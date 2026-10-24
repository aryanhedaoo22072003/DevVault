import { describe, expect, it } from 'vitest';
import { sqlStatus } from '@/lib/sql-challenges';
import { compareSqlResults } from '@/lib/sql-results';
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

describe('SQL challenge result comparison', () => {
  const expected={columns:['id','value'],rows:[[1,null],[2,''],[2,'']]};
  it('accepts an exact ordered result',()=>expect(compareSqlResults(expected,expected)).toMatchObject({passed:true}));
  it('rejects missing and extra columns',()=>{expect(compareSqlResults({columns:['id'],rows:[[1]]},expected).passed).toBe(false);expect(compareSqlResults({columns:['id','value','extra'],rows:[]},expected).passed).toBe(false)});
  it('distinguishes NULL, empty strings, duplicate rows, and order',()=>{expect(compareSqlResults({columns:expected.columns,rows:[[1,''],[2,''],[2,'']]},expected).passed).toBe(false);expect(compareSqlResults({columns:expected.columns,rows:[[1,null],[2,'']]},expected).passed).toBe(false);expect(compareSqlResults({columns:expected.columns,rows:[[2,''],[1,null],[2,'']]},expected).passed).toBe(false)});
  it('supports explicitly unordered comparisons while retaining duplicate counts',()=>expect(compareSqlResults({columns:expected.columns,rows:[[2,''],[1,null],[2,'']]},expected,false).passed).toBe(true));
  it('marks only a matching current query hash as practice passed',()=>{const state={viewedAt:new Date(),meaningfulDraft:true,draft:{query:'SELECT 1'},passed:{queryHash:'bad'}};expect(sqlStatus(state)).toBe('in-progress')});
});
