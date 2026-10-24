import {describe,expect,it} from 'vitest';
import {additiveSectionMerge,orderedSections,quizXpAwardFilter,scoreTrackQuiz,trackProgress,trackProgressOwner,trackQuizSubmissionSchema} from './practice-tracks';
describe('practice tracks',()=>{
 it('orders sections deterministically',()=>expect(orderedSections([{order:3},{order:1},{order:2}]).map(x=>x.order)).toEqual([1,2,3]));
 it('grades quizzes only from server questions',()=>expect(scoreTrackQuiz([{choices:['a','b'],answerIndex:1,explanation:'Because b.'}],[1],70)).toMatchObject({score:1,total:1,passed:true}));
 it('rejects incomplete or invalid quiz answers',()=>{expect(()=>scoreTrackQuiz([{choices:['a','b'],answerIndex:0,explanation:'a'}],[],70)).toThrow();expect(trackQuizSubmissionSchema.safeParse({trackSlug:'python',sectionSlug:'one',answers:[-1]}).success).toBe(false)});
 it('calculates progression from completed quiz ids',()=>expect(trackProgress(['q1'],['q1','q2'])).toEqual({completed:1,total:2,percentage:50}));
 it('scopes progress to the authenticated owner',()=>expect(trackProgressOwner('user_a','track_a')).toEqual({clerkUserId:'user_a',trackId:'track_a'}));
 it('prevents duplicate quiz XP with an atomic award condition',()=>expect(quizXpAwardFilter('user_a','quiz_a')).toEqual({clerkUserId:'user_a','practiceQuizAwards.quizId':{$ne:'quiz_a'}}));
 it('preserves stable section identity during additive reseeding',()=>{const result=additiveSectionMerge([{slug:'strings',_id:'existing-id',title:'Old'}],[{slug:'strings',title:'Expanded'},{slug:'lists',title:'New'}]);expect(result[0]._id).toBe('existing-id');expect(result[1]._id).toBeUndefined();expect(result).toHaveLength(2)});
});
