export const lessonOneContent = {
  title: 'Introduction to Python — Your First Step into Python',
  markdown: `# Introduction to Python — Your First Step into Python

Python is a general-purpose programming language designed around readable code. Students use it to learn programming fundamentals, while professionals use it for web services, automation, testing, analytics, machine learning, and data engineering. A data engineer might validate records, transform files, or coordinate an ETL pipeline with Python.

## Learning objectives
- Define Python and describe practical applications.
- Explain how Python programs execute.
- Write a Hello World program and use \`print()\`.
- Create variables and recognize dynamic typing.
- Identify \`str\`, \`int\`, \`float\`, and \`bool\`.
- Use arithmetic operators and explain \`input()\` conceptually.
- Recognize common beginner mistakes.

## Your first program and print()
\`print()\` sends a readable representation of a value to standard output. Text must be enclosed in matching quotation marks. \`print("Hello, DevVault!")\` displays the greeting without displaying its quotation marks.

## How Python executes code
CPython parses source and checks syntax, compiles valid source into bytecode, and executes that bytecode with the Python virtual machine. Execution normally proceeds from top to bottom. An unhandled error stops the current flow and displays a traceback describing where the problem occurred.

## Variables and dynamic typing
A variable is a name referring to a value. Python is dynamically typed: you do not declare a variable's type separately, but every value has a definite runtime type. Descriptive names such as \`student_name\` and \`order_total\` make programs easier to understand.

## Essential value types
- **str:** text such as \`"Aarav"\`.
- **int:** a whole number such as \`21\`.
- **float:** a fractional number such as \`92.5\`.
- **bool:** a logical value written exactly as \`True\` or \`False\`.

Python is case-sensitive. \`student_name\` and \`Student_Name\` are different names. Boolean capitalization matters: \`true\` and \`TRUE\` are not Python Boolean literals.

## Arithmetic operators
\`+\` adds, \`-\` subtracts, \`*\` multiplies, and \`/\` divides with a floating-point result. \`//\` performs floor division and \`%\` returns the remainder. Data engineers can use these to calculate complete record batches and leftover records.

## Understanding input()
\`input(prompt)\` normally displays a prompt, waits for typed input, and returns a \`str\`. Convert it explicitly when a number is required, such as \`int(input("Age: "))\`. DevVault's browser runner does not provide an interactive terminal prompt, so this lesson uses assigned values instead of pausing for \`input()\`.

## Common beginner mistakes
- **Case mismatch:** \`score\` and \`Score\` are different names.
- **Assignment versus comparison:** \`=\` assigns; \`==\` compares.
- **Missing quotation marks:** \`print(Hello)\` looks for a variable; \`print("Hello")\` prints text.
- **Boolean capitalization:** use \`True\` and \`False\`.
- **Mixing text and numbers:** use an f-string such as \`f"Age: {21}"\`.
- **Incorrect indentation:** indentation defines Python blocks and must be consistent.

## Key takeaways
Python is readable and broadly useful, but precise syntax matters. Programs normally execute top to bottom; \`print()\` displays values; variables name values; runtime values have types; and arithmetic operators produce different results. Run small programs, inspect output, and read tracebacks carefully.`,
  codeExamples: [
    { language: 'python', code: `print("Hello, DevVault!")\n\n# Expected output:\n# Hello, DevVault!` },
    { language: 'python', code: `student_name = "Aarav"\nage = 21\npercentage = 92.5\nis_enrolled = True\nprint(student_name)\nprint(type(age).__name__)\nprint(type(percentage).__name__)\nprint(type(is_enrolled).__name__)\n\n# Expected output:\n# Aarav\n# int\n# float\n# bool` },
    { language: 'python', code: `a = 10\nb = 3\nprint(a + b)\nprint(a / b)\nprint(a // b)\nprint(a % b)\n\n# Expected output:\n# 13\n# 3.3333333333333335\n# 3\n# 1` },
    { language: 'python', code: `batch_size = 100\nrecord_count = 253\nprint(record_count // batch_size)\nprint(record_count % batch_size)\n\n# Expected output:\n# 2\n# 53` },
  ],
  flowcharts: [{ title: 'From Python source to a result', definition: 'Write Python source -> Interpreter parses and checks syntax -> CPython compiles bytecode -> Python virtual machine executes instructions -> Output appears or a traceback explains the error' }],
  quizQuestions: [
    { prompt: 'Which function displays text in Python?', choices: ['echo()', 'print()', 'displayText()'], answerIndex: 1, explanation: 'The built-in print() function writes text and other values to standard output.' },
    { prompt: 'What is the type of 10.5?', choices: ['int', 'str', 'float'], answerIndex: 2, explanation: 'A numeric literal containing a decimal point, such as 10.5, is a float.' },
    { prompt: 'What does 10 // 3 return?', choices: ['3', '3.333', '1'], answerIndex: 0, explanation: 'The // operator performs floor division, so 10 // 3 returns the whole-number quotient 3.' },
    { prompt: 'Which is a valid Python Boolean?', choices: ['true', 'TRUE', 'True'], answerIndex: 2, explanation: 'Python Boolean literals are case-sensitive and are written True and False.' },
  ],
  exercises: [{ title: 'Student profile and study-time calculator', instructions: 'Create variables for your name, completed lessons, minutes studied, average score, and enrollment status. Print a greeting, inspect the types, and calculate complete 60-minute hours plus remaining minutes. Use assigned values because the runner does not provide interactive input().', expectedOutcomes: ['Use str, int, float, and bool values', 'Use print(), //, and %', 'Produce deterministic output and explain each line'], starterCode: `student_name = "Aarav"\ncompleted_lessons = 3\nminutes_studied = 145\naverage_score = 92.5\nis_enrolled = True\n\n# Print a greeting and calculate hours plus remaining minutes.`, language: 'python' }],
};
