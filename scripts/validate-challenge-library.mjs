import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';
import { stage11Challenges } from './challenge-library.mjs';

const pythonHarness = `import json, sys\npayload=json.loads(sys.stdin.read())\nscope={}\nexec(payload["code"],scope,scope)\nfunction=scope[payload["entrypoint"]]\nresults=[]\nfor test in payload["tests"]:\n try:\n  results.append({"actual":function(*json.loads(test["input"]))})\n except Exception as error:\n  results.append({"error":type(error).__name__+": "+str(error)})\nprint(json.dumps(results,separators=(",",":")))`;

function shapeErrors(challenge) {
  const errors = [];
  if (challenge.sampleTestCases.length < 3) errors.push('fewer than three public tests');
  if (challenge.referenceSolutions.length !== 2) errors.push('missing language reference solution');
  for (const test of challenge.sampleTestCases) {
    try { if (!Array.isArray(JSON.parse(test.input))) errors.push(`input is not an argument array: ${test.input}`); JSON.parse(test.expectedOutput); }
    catch { errors.push(`invalid JSON test contract: ${test.input}`); }
  }
  return errors;
}

function pythonErrors(challenge, solution) {
  const process = spawnSync('python3', ['-I', '-c', pythonHarness], { input: JSON.stringify({ code: solution.code, entrypoint: challenge.entrypoint, tests: challenge.sampleTestCases }), encoding: 'utf8', timeout: 10_000, maxBuffer: 1_000_000 });
  if (process.error) return [`process failed: ${process.error.message}`];
  if (process.status !== 0) return [`exited ${process.status}: ${(process.stderr || '').trim()}`];
  let outputs;
  try { outputs = JSON.parse(process.stdout); } catch { return ['returned invalid validation output']; }
  return challenge.sampleTestCases.flatMap((test, index) => {
    const output = outputs[index];
    if (output?.error) return [`test ${index + 1}: ${output.error}`];
    return isDeepStrictEqual(output?.actual, JSON.parse(test.expectedOutput)) ? [] : [`test ${index + 1}: expected ${test.expectedOutput}, received ${JSON.stringify(output?.actual)}`];
  });
}

function javascriptErrors(challenge, solution) {
  const functionName = solution.code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/)?.[1];
  if (!functionName) return ['reference must declare a named function'];
  let callable;
  try { callable = new vm.Script(`(function(){${solution.code}\nreturn ${functionName};})()`).runInNewContext(Object.create(null), { timeout: 1_000 }); }
  catch (error) { return [`compile failed: ${error instanceof Error ? error.message : 'unknown error'}`]; }
  return challenge.sampleTestCases.flatMap((test, index) => {
    try {
      const actual = JSON.parse(JSON.stringify(callable(...JSON.parse(test.input))));
      return isDeepStrictEqual(actual, JSON.parse(test.expectedOutput)) ? [] : [`test ${index + 1}: expected ${test.expectedOutput}, received ${JSON.stringify(actual)}`];
    } catch (error) { return [`test ${index + 1}: ${error instanceof Error ? error.message : 'runtime error'}`]; }
  });
}

export function validateChallenge(challenge) {
  const errors = shapeErrors(challenge);
  const python = challenge.referenceSolutions.find((item) => item.language === 'python');
  const javascript = challenge.referenceSolutions.find((item) => item.language === 'javascript');
  if (python) errors.push(...pythonErrors(challenge, python).map((error) => `Python ${error}`));
  if (javascript) errors.push(...javascriptErrors(challenge, javascript).map((error) => `JavaScript ${error}`));
  return { slug: challenge.slug, passed: errors.length === 0, errors, testsPerLanguage: challenge.sampleTestCases.length };
}

export const validateChallengeLibrary = (challenges = stage11Challenges) => challenges.map(validateChallenge);

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const results = validateChallengeLibrary();
  for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.slug}: ${result.testsPerLanguage} public tests × 2 languages${result.errors.length ? `\n  ${result.errors.join('\n  ')}` : ''}`);
  const failed = results.filter((result) => !result.passed);
  console.log(`Validated ${results.length - failed.length}/${results.length} challenges (${results.reduce((sum, result) => sum + result.testsPerLanguage * 2, 0)} language-test executions).`);
  if (failed.length) process.exitCode = 1;
}
