import mongoose from 'mongoose';
import { sqlModules, sqlLessonCount } from './sql-course-content.mjs';

const slug='sql-zero-to-advanced';
if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required.');
await mongoose.connect(process.env.MONGODB_URI,process.env.MONGODB_DB?{dbName:process.env.MONGODB_DB}:{});
const collection=mongoose.connection.collection('learningpaths');
let path=await collection.findOne({slug});const created=!path;
if(!path){const now=new Date();const result=await collection.insertOne({title:'SQL — Zero to Advanced',slug,subject:'SQL',description:'A SQLite-validated relational SQL curriculum from first queries through analytics, data engineering, and interview preparation.',status:'published',access:'public',productId:'',modules:[],createdAt:now,updatedAt:now});path=await collection.findOne({_id:result.insertedId})}
const modules=path.modules??[];const oldModules=new Map(modules.map(x=>[x.slug,String(x._id)]));const oldLessons=new Map(modules.flatMap(x=>x.lessons.map(y=>[y.slug,String(y._id)])));
for(const sourceModule of sqlModules){let target=modules.find(x=>x.slug===sourceModule.slug);if(!target){target={_id:new mongoose.Types.ObjectId(),title:sourceModule.title,slug:sourceModule.slug,order:sourceModule.order,lessons:[]};modules.push(target)}else Object.assign(target,{title:sourceModule.title,order:sourceModule.order});for(const sourceLesson of sourceModule.lessons){const current=target.lessons.find(x=>x.slug===sourceLesson.slug);if(current)Object.assign(current,{...sourceLesson,_id:current._id});else target.lessons.push({...sourceLesson,_id:new mongoose.Types.ObjectId()})}target.lessons.sort((a,b)=>a.order-b.order)}modules.sort((a,b)=>a.order-b.order);
await collection.updateOne({_id:path._id},{$set:{title:'SQL — Zero to Advanced',subject:'SQL',description:'A SQLite-validated relational SQL curriculum from first queries through analytics, data engineering, and interview preparation.',status:'published',access:'public',productId:'',modules,updatedAt:new Date()}});
const verified=await collection.findOne({_id:path._id});const authored=verified.modules.filter(x=>sqlModules.some(y=>y.slug===x.slug));const lessons=authored.flatMap(x=>x.lessons.filter(y=>sqlModules.flatMap(z=>z.lessons).some(z=>z.slug===y.slug)));
if(authored.length!==5||lessons.length!==sqlLessonCount||new Set(lessons.map(x=>x.slug)).size!==sqlLessonCount)throw new Error('SQL curriculum count or uniqueness validation failed.');
for(const [stableSlug,id] of oldModules){const current=authored.find(x=>x.slug===stableSlug);if(current&&String(current._id)!==id)throw new Error(`Module ID changed: ${stableSlug}`)}for(const [stableSlug,id] of oldLessons){const current=lessons.find(x=>x.slug===stableSlug);if(current&&String(current._id)!==id)throw new Error(`Lesson ID changed: ${stableSlug}`)}
console.log(JSON.stringify({created,pathId:String(verified._id),slug,moduleCount:authored.length,lessonCount:lessons.length,modules:authored.map(x=>({id:String(x._id),slug:x.slug,title:x.title,lessons:x.lessons.map(y=>({id:String(y._id),slug:y.slug,title:y.title}))}))}));await mongoose.disconnect();
