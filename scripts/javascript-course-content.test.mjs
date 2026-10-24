import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { javascriptModules } from './javascript-course-content.mjs';
import { buildCompleteJavascriptModules } from './javascript-course-expansion-content.mjs';

const completeJavascriptModules = buildCompleteJavascriptModules(javascriptModules);
const lessons = completeJavascriptModules.flatMap((learningModule) => learningModule.lessons);

function splitExample(example) {
  const marker = '\n// Expected output:\n';
  const markerIndex = example.code.lastIndexOf(marker);
  expect(markerIndex, 'example must contain an expected-output marker').not.toBe(-1);
  return {
    source: example.code.slice(0, markerIndex),
    expected: example.code
      .slice(markerIndex + marker.length)
      .split('\n')
      .map((line) => line.replace(/^\/\/ ?/, ''))
      .join('\n'),
  };
}

describe('JavaScript course content', () => {
it('is complete and has stable unique slugs', () => {
  expect(completeJavascriptModules).toHaveLength(4);
  expect(lessons).toHaveLength(20);
  expect(new Set(completeJavascriptModules.map((learningModule) => learningModule.slug)).size).toBe(4);
  expect(new Set(lessons.map((lesson) => lesson.slug)).size).toBe(20);

  for (const learningModule of completeJavascriptModules) {
    expect(new Set(learningModule.lessons.map((lesson) => lesson.order)).size).toBe(learningModule.lessons.length);
  }
});

it('meets the existing authoring contract in every lesson', () => {
  for (const lesson of lessons) {
    expect(lesson.status).toBe('published');
    expect(lesson.markdown).toMatch(/## Learning objectives/);
    expect(lesson.markdown).toMatch(/## Common mistakes/);
    expect(lesson.markdown).toMatch(/## Key takeaways/);
    expect(lesson.codeExamples).toHaveLength(4);
    expect(lesson.markdown.length).toBeGreaterThan(1_500);
    expect(lesson.markdown).toMatch(/## Practical use cases/);
    expect(lesson.markdown).toMatch(/## A reliable problem-solving process/);
    expect(lesson.flowcharts[0]?.definition.split('->').length).toBeGreaterThanOrEqual(4);
    expect(lesson.quizQuestions).toHaveLength(4);
    expect(lesson.exercises).toHaveLength(1);
    expect(lesson.exercises[0].instructions.length).toBeGreaterThan(20);
    expect(lesson.exercises[0].expectedOutcomes.length).toBeGreaterThanOrEqual(2);

    for (const question of lesson.quizQuestions) {
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(question.choices.length);
      expect(question.explanation.length).toBeGreaterThan(20);
    }
  }
});

it('executes all examples with their documented output', () => {
  let executed = 0;
  for (const lesson of lessons) {
    for (const example of lesson.codeExamples) {
      const { source, expected } = splitExample(example);
      const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
        encoding: 'utf8',
        timeout: 2_000,
        maxBuffer: 64 * 1024,
      });
      expect(result.error, `${lesson.slug}: execution timed out`).toBeUndefined();
      expect(result.status, `${lesson.slug}: ${result.stderr}`).toBe(0);
      expect(result.stdout.trim(), `${lesson.slug}: output mismatch`).toBe(expected.trim());
      executed += 1;
    }
  }
  expect(executed).toBe(80);
}, 30_000);
});

