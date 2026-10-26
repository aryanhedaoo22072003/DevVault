import mongoose from 'mongoose';
import {applyImportPlan,buildImportPlan} from './import-production-content.mjs';

if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required.');
const sourceName=process.env.MONGODB_DB;if(!sourceName)throw new Error('MONGODB_DB is required.');
const isolatedName=`dv_import_${Date.now()}`;
await mongoose.connect(process.env.MONGODB_URI,{dbName:sourceName,serverSelectionTimeoutMS:15000});
const client=mongoose.connection.getClient(),source=client.db(sourceName),target=client.db(isolatedName);
try{
 const [products,assets]=await Promise.all([source.collection('products').find({}).toArray(),source.collection('digitalassets').find({}).toArray()]);
 await target.collection('products').insertMany(products);await target.collection('digitalassets').insertMany(assets);
 const before=await buildImportPlan(target);if(before.errors.length)throw new Error(before.errors.join(' '));
 const session=client.startSession();try{await session.withTransaction(()=>applyImportPlan(target,before,session));}finally{await session.endSession();}
 const after=await buildImportPlan(target);const counts={courses:await target.collection('learningpaths').countDocuments(),products:await target.collection('products').countDocuments(),assets:await target.collection('digitalassets').countDocuments(),orders:await target.collection('orders').countDocuments(),entitlements:await target.collection('entitlements').countDocuments(),progress:await target.collection('studentlearningprogresses').countDocuments()};
 if(after.errors.length||after.courseActions.some(x=>x.action!=='unchanged')||after.productActions.some(x=>x.action!=='unchanged')||JSON.stringify(counts)!==JSON.stringify({courses:5,products:7,assets:21,orders:0,entitlements:0,progress:0}))throw new Error('Isolated import did not converge safely.');
 console.log(JSON.stringify({isolated:true,initialCourseActions:before.courseActions.map(x=>x.action),secondRun:'all unchanged',counts},null,2));
}finally{await target.dropDatabase();await mongoose.disconnect();}
