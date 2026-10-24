import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { remainingPythonModules } from './python-course-remaining-content.mjs';

const lessons = remainingPythonModules.flatMap((learningModule) => learningModule.lessons);
describe('remaining Python course content', () => {
  it('defines six modules and fifteen unique lessons', () => {
    expect(remainingPythonModules).toHaveLength(6);
    expect(lessons).toHaveLength(15);
    expect(new Set(lessons.map((lesson) => lesson.slug)).size).toBe(15);
  });
  it('meets published content and quiz contracts', () => {
    for (const lesson of lessons) {
      expect(lesson.markdown.length).toBeGreaterThan(500);
      expect(lesson.codeExamples.length).toBeGreaterThanOrEqual(4);
      expect(lesson.flowcharts[0].definition.split('->').length).toBeGreaterThanOrEqual(4);
      expect(lesson.quizQuestions).toHaveLength(4);
      expect(lesson.quizQuestions.every((question) => question.answerIndex >= 0 && question.answerIndex < question.choices.length && question.explanation.length > 20)).toBe(true);
      expect(lesson.exercises.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('executes every runnable example with exact documented output', () => {
    for (const lesson of lessons) for (const example of lesson.codeExamples) {
      const expected = example.code.split('# Expected output:')[1].trim().split('\n').map((line) => line.replace(/^# ?/, '')).join('\n');
      const result = spawnSync('python3', ['-I', '-c', `from __future__ import annotations\n${example.code}`], { encoding: 'utf8', timeout: 5_000 });
      expect(result.status, `${lesson.slug}: ${result.stderr}`).toBe(0);
      expect(result.stdout.trim(), lesson.slug).toBe(expected);
    }
  }, 30_000);
});
