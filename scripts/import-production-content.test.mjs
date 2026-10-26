import {describe,expect,it} from 'vitest';
import {mergeCoursePreservingIds,validateCanonicalManifest} from './import-production-content.mjs';

describe('production content import',()=>{
 it('defines the complete canonical inventory',()=>expect(validateCanonicalManifest()).toEqual({errors:[],counts:{courses:5,lessons:93,examples:372,quizzes:372,flowcharts:93,exercises:93,products:7}}));
 it('preserves stable course, module, and lesson ids',()=>{const existing={_id:'path-id',modules:[{_id:'module-id',slug:'module',lessons:[{_id:'lesson-id',slug:'lesson'}]}]};const source={slug:'path',modules:[{slug:'module',title:'Module',order:0,lessons:[{slug:'lesson',title:'Lesson',order:0}]}]};const merged=mergeCoursePreservingIds(existing,source);expect(merged.modules[0]._id).toBe('module-id');expect(merged.modules[0].lessons[0]._id).toBe('lesson-id')});
});
