import {describe,expect,it} from 'vitest';
import {navItems,technologyCategories} from './catalog';

describe('public learning discovery',()=>{
 it('routes Learning to the real course catalog',()=>expect(navItems.find(item=>item.label==='Learning')?.href).toBe('/learn'));
 it('only gives course controls real course destinations',()=>{const destinations=technologyCategories.flatMap(item=>item.destination?[item.destination]:[]);expect(destinations).toEqual(['/learn/javascript-zero-to-advanced','/learn/python-zero-to-advanced','/learn/data-engineering-zero-to-advanced']);expect(destinations.every(path=>path.startsWith('/learn/'))).toBe(true)});
});
