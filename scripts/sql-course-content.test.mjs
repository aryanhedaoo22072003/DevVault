import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';
import { sqlModules, sqlLessonCount } from './sql-course-content.mjs';

const SQL=await initSqlJs();
const lessons=sqlModules.flatMap(module=>module.lessons);
const setup=`
PRAGMA foreign_keys=ON;
CREATE TABLE customers(id INTEGER PRIMARY KEY,name TEXT NOT NULL,city TEXT,manager_id INTEGER,email TEXT,created_at TEXT NOT NULL);
CREATE TABLE orders(id INTEGER PRIMARY KEY,customer_id INTEGER NOT NULL,amount REAL NOT NULL CHECK(amount>=0),status TEXT NOT NULL,ordered_at TEXT NOT NULL,FOREIGN KEY(customer_id) REFERENCES customers(id));
CREATE INDEX idx_orders_customer_status ON orders(customer_id,status);
INSERT INTO customers VALUES (1,'Asha','Pune',NULL,'asha@example.com','2025-01-01'),(2,'Dev','Delhi',1,'dev@example.com','2025-01-02'),(3,'Meera','Pune',1,NULL,'2025-01-03'),(4,'Ravi','Mumbai',2,'ravi@example.com','2025-01-04'),(5,'Noor',NULL,2,NULL,'2025-01-05');
INSERT INTO orders VALUES (101,1,120,'paid','2025-02-01'),(102,1,80,'pending','2025-02-02'),(103,2,30,'cancelled','2025-02-03'),(104,3,5,'paid','2025-02-04'),(105,4,200,'paid','2025-02-05'),(106,2,50,'paid','2025-02-06');
CREATE TABLE events(id INTEGER PRIMARY KEY,business_key TEXT,value INTEGER,updated_at TEXT);
INSERT INTO events VALUES (1,'A',10,'2025-01-01'),(2,'B',20,'2025-01-02'),(3,'B',25,'2025-01-02'),(4,'C',30,'2025-01-03');
CREATE TABLE staging_customers(id INTEGER PRIMARY KEY,email TEXT,updated_at TEXT);
INSERT INTO staging_customers VALUES (1,' Asha@example.com ','2025-01-01'),(2,'asha@example.com','2025-01-02'),(3,'dev@example.com','2025-01-03'),(4,'   ','2025-01-04');
CREATE TABLE dim_customer(surrogate_key INTEGER PRIMARY KEY,business_key TEXT,name TEXT,valid_from TEXT,valid_to TEXT,is_current INTEGER);
INSERT INTO dim_customer VALUES (1,'C1','Asha','2025-01-01','2025-06-01',0),(2,'C1','Asha Rao','2025-06-01',NULL,1),(3,'C2','Dev','2025-01-01',NULL,1);
`;

const contract=code=>{const columnMarker='\n-- Expected columns: ';const rowMarker='\n-- Expected rows: ';const ci=code.lastIndexOf(columnMarker);const ri=code.lastIndexOf(rowMarker);return{sql:code.slice(0,ci),columns:JSON.parse(code.slice(ci+columnMarker.length,ri)),rows:JSON.parse(code.slice(ri+rowMarker.length))}};

describe('SQL learning course content',()=>{
it('defines five modules and seventeen unique published lessons',()=>{expect(sqlModules).toHaveLength(5);expect(sqlLessonCount).toBe(17);expect(new Set(lessons.map(x=>x.slug)).size).toBe(17);expect(lessons.every(x=>x.status==='published')).toBe(true)});
it('meets the existing learning authoring contract',()=>{for(const lesson of lessons){expect(lesson.markdown.length).toBeGreaterThan(1800);expect(lesson.codeExamples).toHaveLength(4);expect(lesson.flowcharts[0].definition.split('->').length).toBeGreaterThanOrEqual(4);expect(lesson.quizQuestions).toHaveLength(4);expect(lesson.quizQuestions.every(x=>x.answerIndex>=0&&x.answerIndex<x.choices.length&&x.explanation.length>20)).toBe(true);expect(lesson.exercises).toHaveLength(1)}});
it('executes every SQLite example and matches columns, NULL values, rows, and order',()=>{let count=0;for(const lesson of lessons)for(const example of lesson.codeExamples){const db=new SQL.Database();try{db.run(setup);const expected=contract(example.code);const sets=db.exec(expected.sql,{maxRows:500});const result=sets.at(-1)??{columns:[],values:[]};expect(result.columns,lesson.slug).toEqual(expected.columns);expect(result.values,lesson.slug).toEqual(expected.rows);count++}finally{db.close()}}expect(count).toBe(68)},30000);
});
