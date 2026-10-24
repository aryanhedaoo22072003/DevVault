import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from './db';
import { PracticeTrackProgressModel } from '@/models/practice-track-progress.model';
import { StudentLearningProgressModel } from '@/models/learning-progress.model';

export const TRACK_QUIZ_XP=25;
export const trackQuizSubmissionSchema=z.object({trackSlug:z.string().trim().min(1).max(180),sectionSlug:z.string().trim().min(1).max(180),answers:z.array(z.number().int().min(0)).max(20)});
export const trackVisitSchema=z.object({trackSlug:z.string().trim().min(1).max(180),sectionSlug:z.string().trim().min(1).max(180)});
export function orderedSections<T extends {order:number}>(sections:T[]){return [...sections].sort((a,b)=>a.order-b.order)}
export function scoreTrackQuiz(questions:Array<{choices:string[];answerIndex:number;explanation:string}>,answers:number[],passingPercentage:number){if(!questions.length||answers.length!==questions.length)throw new Error('Answer every question before submitting.');answers.forEach((answer,index)=>{if(answer<0||answer>=questions[index].choices.length)throw new Error(`Invalid answer for question ${index+1}.`)});const feedback=questions.map((question,index)=>({correct:answers[index]===question.answerIndex,explanation:question.explanation}));const score=feedback.filter(item=>item.correct).length;const percentage=Math.round(score/questions.length*100);return{score,total:questions.length,percentage,passed:percentage>=passingPercentage,feedback}}
export function trackProgress(completedQuizIds:Iterable<string>,quizIds:Iterable<string>){const complete=new Set(completedQuizIds);const quizzes=[...quizIds];const completed=quizzes.filter(id=>complete.has(id)).length;return{completed,total:quizzes.length,percentage:quizzes.length?Math.round(completed/quizzes.length*100):0}}
export function trackProgressOwner(clerkUserId:string,trackId:string){return{clerkUserId,trackId}}
export function quizXpAwardFilter(clerkUserId:string,quizId:string){return{clerkUserId,'practiceQuizAwards.quizId':{$ne:quizId}}}
export function additiveSectionMerge<T extends {slug:string;_id?:string}>(existing:T[],incoming:T[]){const bySlug=new Map(existing.map(item=>[item.slug,item]));return incoming.map(item=>({...item,...(bySlug.get(item.slug)?{_id:bySlug.get(item.slug)?._id}:{})}))}
export async function awardTrackQuizXpOnce(clerkUserId:string,trackId:mongoose.Types.ObjectId,trackSlug:string,quizId:string){await StudentLearningProgressModel.updateOne({clerkUserId},{$setOnInsert:{clerkUserId}},{upsert:true,setDefaultsOnInsert:true});const result=await StudentLearningProgressModel.updateOne(quizXpAwardFilter(clerkUserId,quizId),{$push:{practiceQuizAwards:{trackId,trackSlug,quizId,xp:TRACK_QUIZ_XP,earnedAt:new Date()}},$inc:{xp:TRACK_QUIZ_XP}});return result.modifiedCount===1?TRACK_QUIZ_XP:0}
export async function recordTrackVisit(clerkUserId:string,track:{_id:mongoose.Types.ObjectId;slug:string},sectionId:string){await connectToDatabase();await PracticeTrackProgressModel.updateOne(trackProgressOwner(clerkUserId,String(track._id)),{$setOnInsert:{clerkUserId,trackId:track._id,trackSlug:track.slug},$addToSet:{viewedSectionIds:sectionId},$set:{lastSectionId:sectionId,lastVisitedAt:new Date()}},{upsert:true,setDefaultsOnInsert:true})}
