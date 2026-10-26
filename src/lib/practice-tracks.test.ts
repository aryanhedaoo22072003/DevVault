import {describe,expect,it} from 'vitest';
import {additiveSectionMerge,firstUnfinishedSectionIndex,isTrackSectionUnlocked,orderedSections,quizXpAwardFilter,scoreTrackQuiz,trackProgress,trackProgressOwner,trackQuizSubmissionSchema} from './practice-tracks';
describe('practice tracks',()=>{
 it('orders sections deterministically',()=>expect(orderedSections([{order:3},{order:1},{order:2}]).map(x=>x.order)).toEqual([1,2,3]));
 it('grades quizzes only from server questions',()=>expect(scoreTrackQuiz([{choices:['a','b'],answerIndex:1,explanation:'Because b.'}],[1],70)).toMatchObject({score:1,total:1,passed:true}));
 it('rejects incomplete or invalid quiz answers',()=>{expect(()=>scoreTrackQuiz([{choices:['a','b'],answerIndex:0,explanation:'a'}],[],70)).toThrow();expect(trackQuizSubmissionSchema.safeParse({trackSlug:'python',sectionSlug:'one',answers:[-1]}).success).toBe(false)});
 it('calculates progression from completed quiz ids',()=>expect(trackProgress(['q1'],['q1','q2'])).toEqual({completed:1,total:2,percentage:50}));
 it('unlocks sections sequentially from persisted quiz completion only',()=>{const quizzes=['q1','q2','q3'];expect(isTrackSectionUnlocked([],quizzes,0)).toBe(true);expect(isTrackSectionUnlocked(['q1'],quizzes,1)).toBe(true);expect(isTrackSectionUnlocked(['q2'],quizzes,2)).toBe(false);expect(isTrackSectionUnlocked(['q1','q2'],quizzes,2)).toBe(true);expect(firstUnfinishedSectionIndex(['q1','q2'],quizzes)).toBe(2)});
 it('reconstructs the same unlock state after a refresh from persisted quiz ids',()=>{const persisted=['q1','q2'];expect(trackProgress(persisted,['q1','q2','q3'])).toEqual({completed:2,total:3,percentage:67});expect(isTrackSectionUnlocked(persisted,['q1','q2','q3'],2)).toBe(true)});
 it('does not require an assigned coding challenge to unlock the next section',()=>{const section={quiz:{id:'q1'},challengeIds:[]};expect(isTrackSectionUnlocked([section.quiz.id],[section.quiz.id,'q2'],1)).toBe(true)});
 it('scopes progress to the authenticated owner',()=>expect(trackProgressOwner('user_a','track_a')).toEqual({clerkUserId:'user_a',trackId:'track_a'}));
 it('prevents duplicate quiz XP with an atomic award condition',()=>expect(quizXpAwardFilter('user_a','quiz_a')).toEqual({clerkUserId:'user_a','practiceQuizAwards.quizId':{$ne:'quiz_a'}}));
 it('preserves stable section identity during additive reseeding',()=>{const result=additiveSectionMerge([{slug:'strings',_id:'existing-id',title:'Old'}],[{slug:'strings',title:'Expanded'},{slug:'lists',title:'New'}]);expect(result[0]._id).toBe('existing-id');expect(result[1]._id).toBeUndefined();expect(result).toHaveLength(2)});
});
