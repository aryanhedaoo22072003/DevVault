import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { canonicalCourses, canonicalProducts, expectedAssetSummary } from './production-content-manifest.mjs';

const args=new Set(process.argv.slice(2));
const applying=args.has('--apply');
const confirmed=args.has('--confirm=IMPORT_CANONICAL_CONTENT');
const normalized=value=>Array.isArray(value)?value.map(normalized):value&&typeof value==='object'&&!('_bsontype'in value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalized(value[key])])):value;
const json=value=>JSON.stringify(normalized(value));
const unique=values=>new Set(values).size===values.length;

export function validateCanonicalManifest(){
 const errors=[];const lessons=canonicalCourses.flatMap(course=>course.modules.flatMap(module=>module.lessons));
 if(canonicalCourses.length!==5)errors.push(`Expected 5 courses; found ${canonicalCourses.length}.`);
 if(lessons.length!==93)errors.push(`Expected 93 lessons; found ${lessons.length}.`);
 if(!unique(canonicalCourses.map(item=>item.slug)))errors.push('Duplicate canonical course slug.');
 if(!unique(canonicalProducts.map(item=>item.slug)))errors.push('Duplicate canonical product slug.');
 for(const course of canonicalCourses){const courseLessons=course.modules.flatMap(module=>module.lessons);if(!unique(courseLessons.map(item=>item.slug)))errors.push(`Duplicate lesson slug in ${course.slug}.`);for(const lesson of courseLessons){if(!lesson._id&&(!lesson.markdown||lesson.codeExamples?.length!==4||lesson.quizQuestions?.length!==4||lesson.flowcharts?.length<1||lesson.exercises?.length<1))errors.push(`Incomplete canonical lesson ${course.slug}/${lesson.slug}.`);}}
 if(canonicalProducts.length!==7)errors.push(`Expected 7 products; found ${canonicalProducts.length}.`);
 return{errors,counts:{courses:canonicalCourses.length,lessons:lessons.length,examples:lessons.reduce((n,l)=>n+l.codeExamples.length,0),quizzes:lessons.reduce((n,l)=>n+l.quizQuestions.length,0),flowcharts:lessons.reduce((n,l)=>n+l.flowcharts.length,0),exercises:lessons.reduce((n,l)=>n+l.exercises.length,0),products:canonicalProducts.length}};
}

export function mergeCoursePreservingIds(existing,source){
 const existingModules=new Map((existing?.modules??[]).map(module=>[module.slug,module]));
 const modules=source.modules.map(sourceModule=>{const oldModule=existingModules.get(sourceModule.slug);const oldLessons=new Map((oldModule?.lessons??[]).map(lesson=>[lesson.slug,lesson]));return{...sourceModule,_id:oldModule?._id??new mongoose.Types.ObjectId(),lessons:sourceModule.lessons.map(lesson=>({...lesson,_id:oldLessons.get(lesson.slug)?._id??new mongoose.Types.ObjectId()}))};});
 return{...source,modules};
}

const comparableCourse=value=>({title:value.title,slug:value.slug,subject:value.subject,description:value.description,status:value.status,access:value.access,productId:value.productId??'',modules:(value.modules??[]).map(module=>({title:module.title,slug:module.slug,order:module.order,lessons:(module.lessons??[]).map(({_id,...lesson})=>lesson)}))});
const comparableProduct=(value)=>Object.fromEntries(Object.keys(canonicalProducts[0]).map(key=>[key,Array.isArray(canonicalProducts[0][key])?(value[key]??[]):value[key]]));

export async function buildImportPlan(db){
 const manifest=validateCanonicalManifest();if(manifest.errors.length)throw new Error(manifest.errors.join(' '));
 const [courses,products,assets,duplicateCourses,duplicateProducts]=await Promise.all([
  db.collection('learningpaths').find({slug:{$in:canonicalCourses.map(x=>x.slug)}}).toArray(),
  db.collection('products').find({slug:{$in:canonicalProducts.map(x=>x.slug)}}).toArray(),
  db.collection('digitalassets').find({}).toArray(),
  db.collection('learningpaths').aggregate([{$group:{_id:'$slug',count:{$sum:1}}},{$match:{count:{$gt:1}}}]).toArray(),
  db.collection('products').aggregate([{$group:{_id:'$slug',count:{$sum:1}}},{$match:{count:{$gt:1}}}]).toArray(),
 ]);
 const courseBySlug=new Map(courses.map(x=>[x.slug,x])),productBySlug=new Map(products.map(x=>[x.slug,x]));
 const courseActions=canonicalCourses.map(source=>{const existing=courseBySlug.get(source.slug);const merged=mergeCoursePreservingIds(existing,source);return{slug:source.slug,action:!existing?'create':json(comparableCourse(existing))===json(comparableCourse(merged))?'unchanged':'update',existing,merged};});
 const productActions=canonicalProducts.map(source=>{const existing=productBySlug.get(source.slug);return{slug:source.slug,action:!existing?'create':json(comparableProduct(existing))===json(source)?'unchanged':'update',existing,source};});
 const productIds=new Set(products.map(x=>String(x._id)));const activePrivate=assets.filter(x=>x.isActive&&!x.isPublic),activePublic=assets.filter(x=>x.isActive&&x.isPublic),inactive=assets.filter(x=>!x.isActive);
 const assetErrors=[];if(assets.length!==expectedAssetSummary.total)assetErrors.push(`Expected ${expectedAssetSummary.total} assets; found ${assets.length}.`);if(activePrivate.length!==expectedAssetSummary.privateActive)assetErrors.push(`Expected ${expectedAssetSummary.privateActive} active private assets; found ${activePrivate.length}.`);if(activePublic.length!==expectedAssetSummary.publicActive)assetErrors.push(`Expected ${expectedAssetSummary.publicActive} active public assets; found ${activePublic.length}.`);if(inactive.length!==expectedAssetSummary.inactive)assetErrors.push(`Expected ${expectedAssetSummary.inactive} inactive assets; found ${inactive.length}.`);if(assets.some(x=>x.storageProvider!=='s3-private'||!x.storageKey||!productIds.has(String(x.product))))assetErrors.push('Asset provider, key, or product reference conflict detected.');
 return{manifest,courseActions,productActions,errors:[...duplicateCourses.map(x=>`Duplicate course slug: ${x._id}`),...duplicateProducts.map(x=>`Duplicate product slug: ${x._id}`),...assetErrors],assetSummary:{total:assets.length,privateActive:activePrivate.length,publicActive:activePublic.length,inactive:inactive.length}};
}

export async function applyImportPlan(db,plan,session){for(const item of plan.courseActions)await db.collection('learningpaths').updateOne({slug:item.slug},{$set:{...item.merged,updatedAt:new Date()},$setOnInsert:{createdAt:new Date()}},{upsert:true,session});for(const item of plan.productActions)await db.collection('products').updateOne({slug:item.slug},{$set:{...item.source,updatedAt:new Date()},$setOnInsert:{createdAt:new Date()}},{upsert:true,session});}

async function main(){
 const uri=process.env.CONTENT_IMPORT_MONGODB_URI;if(!uri)throw new Error('CONTENT_IMPORT_MONGODB_URI is required; MONGODB_URI is intentionally ignored.');
 const dbName=process.env.CONTENT_IMPORT_MONGODB_DB;if(!dbName)throw new Error('CONTENT_IMPORT_MONGODB_DB is required.');
 if(applying&&(!confirmed||!['staging','production'].includes(process.env.CONTENT_IMPORT_ENVIRONMENT??'')))throw new Error('Apply requires --confirm=IMPORT_CANONICAL_CONTENT and CONTENT_IMPORT_ENVIRONMENT=staging|production.');
 await mongoose.connect(uri,{dbName,serverSelectionTimeoutMS:15000});const db=mongoose.connection.db;const plan=await buildImportPlan(db);
 console.log(JSON.stringify({mode:applying?'apply':'dry-run',database:dbName,counts:plan.manifest.counts,courses:plan.courseActions.map(x=>({slug:x.slug,action:x.action})),products:plan.productActions.map(x=>({slug:x.slug,action:x.action})),assets:plan.assetSummary,errors:plan.errors},null,2));
 if(plan.errors.length)throw new Error('Import preflight found conflicts; no writes performed.');
 if(applying){const session=await mongoose.startSession();try{await session.withTransaction(()=>applyImportPlan(db,plan,session));}finally{await session.endSession();}}
 await mongoose.disconnect();
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(async error=>{console.error(`Content import failed safely: ${error instanceof Error?error.message:'Unknown error'}`);await mongoose.disconnect().catch(()=>undefined);process.exitCode=1;});
