const lesson=(title,slug,order,markdown,codeExamples,flow,quizQuestions,exercise)=>({title,slug,order,status:'published',markdown,codeExamples:codeExamples.map(code=>({language:'python',code})),flowcharts:[{title:`${title} mental model`,definition:flow}],quizQuestions,exercises:[exercise]});
export const pythonLessonsTwoToFive=[
lesson('Variables, Naming Rules & Data Types','variables-naming-rules-data-types',1,`# Variables, Naming Rules & Data Types

## Learning objectives
- Create clear variables and explain dynamic typing.
- Follow Python identifier and naming rules.
- Work with \`int\`, \`float\`, \`str\`, \`bool\`, and \`None\`.
- Inspect values with \`type()\` and \`isinstance()\`.
- Convert compatible values and handle conversion errors.
- Format employee and data-processing output with f-strings.

## Variables and names
A variable is a name bound to an object. Assignment with \`=\` creates or rebinds that name. Python is dynamically typed: the object has a type, while the name can later refer to another object. Rebinding is legal, but changing a name from a number to text without a clear reason makes programs harder to understand.

Identifiers may contain letters, digits, and underscores, cannot start with a digit, and cannot be Python keywords such as \`class\`. Names are case-sensitive. Use descriptive \`snake_case\` names such as \`monthly_salary\`; constants are conventionally written as \`UPPER_CASE\`.

## Core data types
\`int\` represents whole numbers, \`float\` represents floating-point numbers, \`str\` represents text, and \`bool\` contains \`True\` or \`False\`. \`None\` means that no value is currently available; it is not zero or an empty string.

\`type(value)\` returns the exact runtime type. \`isinstance(value, float)\` answers whether a value belongs to a type and is usually clearer in validation logic.

## Conversion and formatting
\`int()\`, \`float()\`, and \`str()\` create converted values when conversion is meaningful. \`int("42")\` succeeds, but \`int("forty-two")\` raises \`ValueError\`. A decimal string such as \`"42.5"\` must normally become a float first. F-strings embed expressions clearly: \`f"Employee: {name}"\`.

## Common mistakes
- Starting a name with a digit or using a keyword.
- Assuming assignment copies an independent object in every situation.
- Treating \`None\`, \`0\`, and \`""\` as identical.
- Converting unvalidated text without anticipating \`ValueError\`.
- Concatenating text and numbers instead of converting or using an f-string.

## Key takeaways
Names bind to typed objects. Prefer descriptive identifiers, inspect types deliberately, convert only compatible data, and use f-strings for readable output. These habits are essential when cleaning employee records or values read from files.`,[
`employee_name = "Aarav"\nmonthly_salary = 50000\nis_active = True\nmanager = None\nprint(employee_name, monthly_salary, is_active, manager)\n# Expected output:\n# Aarav 50000 True None`,
`value = 25\nprint(type(value).__name__)\nprint(isinstance(value, int))\nvalue = "twenty-five"\nprint(type(value).__name__)\n# Expected output:\n# int\n# True\n# str`,
`employee_id = int("104")\nhourly_rate = float("725.50")\nprint(employee_id + 1)\nprint(hourly_rate)\n# Expected output:\n# 105\n# 725.5`,
`name = "Meera"\nmonthly_salary = 60000\nyearly_salary = monthly_salary * 12\nprint(f"{name}: ₹{monthly_salary:,} monthly, ₹{yearly_salary:,} yearly")\n# Expected output:\n# Meera: ₹60,000 monthly, ₹720,000 yearly`],
'Raw record text -> Validate expected format -> Convert to required types -> Store with descriptive names -> Format useful output',[
{prompt:'Which is a valid Python identifier?',choices:['2employee','employee_name','employee-name','class'],answerIndex:1,explanation:'employee_name begins with a letter, uses an underscore, and is not a reserved keyword.'},
{prompt:'Which value represents the absence of a value?',choices:['0','"None"','None','False'],answerIndex:2,explanation:'None is Python’s dedicated singleton for no available value; it is distinct from zero, text, and False.'},
{prompt:'What does isinstance(10.5, float) return?',choices:['True','False','float','10.5'],answerIndex:0,explanation:'10.5 is a float, so isinstance returns the Boolean True.'},
{prompt:'What happens when int("ten") runs?',choices:['It returns 10','It returns None','It raises ValueError','It returns "ten"'],answerIndex:2,explanation:'The text is not a valid integer representation, so int() raises ValueError.'}],
{title:'Employee salary summary',instructions:'Create an employee name and monthly salary, calculate the yearly salary, and print both amounts with an f-string. Then confirm the salary is an int with isinstance().',expectedOutcomes:['Use meaningful variables','Calculate monthly_salary * 12','Format a readable salary summary','Check a value with isinstance()'],starterCode:'employee_name = "Aarav"\nmonthly_salary = 55000\n# Calculate and display yearly salary.',language:'python'}),

lesson('Operators and Expressions','operators-and-expressions',2,`# Operators and Expressions

## Learning objectives
- Build arithmetic, comparison, logical, assignment, membership, and identity expressions.
- Explain equality versus identity, precedence, and short-circuit evaluation.
- Apply expressions to employee bonus rules and data validation.

An expression combines values and operators to produce a result. Arithmetic uses \`+\`, \`-\`, \`*\`, \`/\`, \`//\`, \`%\`, and \`**\`. Division returns a float; floor division rounds down; modulo returns a remainder; exponentiation raises a value to a power.

Comparisons such as \`==\`, \`!=\`, \`<\`, \`<=\`, \`>\`, and \`>=\` produce Booleans. Logical \`and\`, \`or\`, and \`not\` combine or reverse conditions. Assignment operators such as \`+=\` update an existing name.

Membership operators \`in\` and \`not in\` test whether a collection contains a value. Identity operators \`is\` and \`is not\` test whether two names refer to the same object. Use \`==\` for equal content and \`is None\` for the singleton None; do not use \`is\` as a replacement for value equality.

Multiplication happens before addition. Parentheses make intended precedence explicit. Logical operations short-circuit: \`A and B\` skips B when A is falsy, while \`A or B\` skips B when A is truthy. This can safely guard later work, such as checking a record exists before reading it.

## Common mistakes
- Expecting \`/\` to return an integer.
- Confusing \`**\` with multiplication.
- Using \`is\` to compare strings or numbers by value.
- Writing complex expressions without clarifying parentheses.
- Forgetting that short-circuit expressions may not evaluate every operand.

## Key takeaways
Operators turn data into decisions and calculations. Choose equality for values, identity for singleton/object identity, and parentheses for clarity.`,[
`a = 10\nb = 3\nprint(a + b, a - b, a * b)\nprint(a / b, a // b, a % b, a ** b)\n# Expected output:\n# 13 7 30\n# 3.3333333333333335 3 1 1000`,
`salary = 72000\nprint(salary >= 60000)\nprint(salary == 72000)\nprint(salary != 50000)\n# Expected output:\n# True\n# True\n# True`,
`skills = ["Python", "SQL"]\nis_active = True\nprint("Python" in skills and is_active)\nprint("Java" not in skills)\n# Expected output:\n# True\n# True`,
`record = {"score": 91}\nmanager = None\neligible = record is not None and record["score"] >= 90\nprint(eligible)\nprint(manager is None)\nprint(2 + 3 * 4)\n# Expected output:\n# True\n# True\n# 14`],
'Values -> Apply arithmetic or comparison -> Combine Boolean conditions -> Short-circuit when result is known -> Produce calculation or decision',[
{prompt:'What is 2 ** 3?',choices:['6','8','9'],answerIndex:1,explanation:'The ** operator performs exponentiation, so 2 cubed is 8.'},
{prompt:'Which operator tests equal values?',choices:['is','==','='],answerIndex:1,explanation:'== compares values; is checks object identity and = performs assignment.'},
{prompt:'What does "SQL" in ["Python", "SQL"] return?',choices:['True','False','SQL'],answerIndex:0,explanation:'The in operator finds the matching string in the list and returns True.'},
{prompt:'Why can A and B skip B?',choices:['Syntax error','Short-circuit evaluation','Operator precedence'],answerIndex:1,explanation:'When A is falsy, the complete and expression cannot become truthy, so Python need not evaluate B.'}],
{title:'Employee bonus eligibility',instructions:'An employee is eligible when active, performance_score is at least 85, and years_employed is at least 2. Build the Boolean expression, print eligibility, and calculate a 10% bonus when eligible.',expectedOutcomes:['Combine comparisons with and','Produce a Boolean eligibility result','Calculate the bonus with multiplication'],starterCode:'salary = 80000\nperformance_score = 90\nyears_employed = 3\nis_active = True\n# Calculate eligibility and bonus.',language:'python'}),

lesson('Conditional Statements','conditional-statements',3,`# Conditional Statements

## Learning objectives
- Select code paths with \`if\`, \`elif\`, and \`else\`.
- Apply indentation, nested conditions, logical expressions, truthiness, and conditional expressions.
- Classify employee performance and student grades safely.

An \`if\` statement executes its indented block when its condition is truthy. Each \`elif\` tests another condition only when earlier branches did not run. \`else\` provides the fallback. Exactly one branch in a connected chain runs.

Indentation is syntax, not decoration. Use four spaces consistently. Nested conditionals are useful when a second decision only matters inside a first one, but combining simple conditions with \`and\` often reads more clearly.

Python considers zero, empty strings, empty collections, and None falsy; most other values are truthy. Use explicit comparisons when business meaning matters. A conditional expression, \`value_if_true if condition else value_if_false\`, is concise for one simple choice.

## Common mistakes
- Misaligning branch indentation.
- Ordering broad conditions before narrower ones.
- Using separate \`if\` statements when only one category should apply.
- Confusing \`=\` with \`==\` in a condition.
- Overusing nested conditions or dense conditional expressions.

## Key takeaways
Conditions make programs responsive to data. Order branches carefully, indent consistently, keep business rules explicit, and reserve compact expressions for simple choices.`,[
`temperature = 31\nif temperature > 30:\n    print("Hot")\nelse:\n    print("Comfortable")\n# Expected output:\n# Hot`,
`score = 84\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "Needs improvement"\nprint(grade)\n# Expected output:\n# B`,
`performance = 92\nis_active = True\nif is_active:\n    if performance >= 90:\n        print("Top performer")\n    else:\n        print("Active employee")\n# Expected output:\n# Top performer`,
`records = []\nprint("Records available" if records else "No records")\nmanager = None\nif not manager:\n    print("Manager not assigned")\n# Expected output:\n# No records\n# Manager not assigned`],
'Evaluate if condition -> True runs if block -> Otherwise test elif conditions -> First true branch runs -> Else handles remaining cases',[
{prompt:'Which branch handles remaining cases?',choices:['if','elif','else'],answerIndex:2,explanation:'else runs when none of the preceding if or elif conditions are truthy.'},
{prompt:'Which value is falsy?',choices:['[1]','"Python"','[]'],answerIndex:2,explanation:'An empty list is falsy; the non-empty list and string are truthy.'},
{prompt:'Why should grade >= 90 appear before grade >= 80?',choices:['To prevent high scores matching the broader branch first','For faster printing','Because elif requires descending numbers'],answerIndex:0,explanation:'A score of 95 also satisfies >= 80, so the narrower higher threshold must be checked first.'},
{prompt:'What is the result of "yes" if True else "no"?',choices:['True','yes','no'],answerIndex:1,explanation:'The condition is True, so the expression selects the value before if: "yes".'}],
{title:'Performance classification',instructions:'Classify an active employee as Outstanding for scores 90+, Strong for 75–89, Developing below 75, and Inactive when is_active is false.',expectedOutcomes:['Use an if/elif/else chain','Order thresholds correctly','Combine employee status with performance'],starterCode:'performance_score = 88\nis_active = True\n# Print the employee classification.',language:'python'}),

lesson('Loops and Iteration','loops-and-iteration',4,`# Loops and Iteration

## Learning objectives
- Iterate with \`for\`, \`while\`, \`range()\`, and \`enumerate()\`.
- Traverse lists and strings.
- Control loops with \`break\` and \`continue\`.
- Explain nested loops, termination, and infinite-loop risks.
- Aggregate transaction data.

A \`for\` loop visits items from an iterable such as a list or string. \`range(stop)\` produces integers from zero up to, but not including, stop. \`enumerate(iterable, start=1)\` supplies an index and value together.

A \`while\` loop repeats while its condition remains truthy. Its body must eventually change the condition or use a deliberate \`break\`; otherwise it can run forever. \`continue\` skips the remainder of the current iteration. \`break\` stops the nearest loop entirely.

Nested loops put one loop inside another and are useful for grids or combinations, but their work multiplies. Data processing commonly uses one loop to validate transactions and accumulate a total.

## Common mistakes
- Forgetting that the end of \`range()\` is excluded.
- Failing to update a while-loop counter.
- Using break when continue was intended.
- Modifying a list while iterating over it.
- Creating unnecessary nested loops with quadratic work.

## Key takeaways
Use for loops for known iterables and while loops for condition-controlled repetition. Choose break and continue deliberately, track termination, and prefer enumerate when positions matter.`,[
`languages = ["Python", "SQL", "JavaScript"]\nfor language in languages:\n    print(language)\n# Expected output:\n# Python\n# SQL\n# JavaScript`,
`for number in range(1, 4):\n    print(number)\nfor position, letter in enumerate("SQL", start=1):\n    print(position, letter)\n# Expected output:\n# 1\n# 2\n# 3\n# 1 S\n# 2 Q\n# 3 L`,
`attempts = 3\nwhile attempts > 0:\n    print(attempts)\n    attempts -= 1\nprint("Done")\n# Expected output:\n# 3\n# 2\n# 1\n# Done`,
`transactions = [120.0, -20.0, 80.5, 0, 19.5]\ntotal = 0\nfor amount in transactions:\n    if amount <= 0:\n        continue\n    total += amount\nprint(total)\n# Expected output:\n# 220.0`],
'Choose iterable or condition -> Start loop -> Process current item -> Continue skips or break stops -> Advance state -> Finish when exhausted or false',[
{prompt:'What values does range(1, 4) produce?',choices:['1, 2, 3','1, 2, 3, 4','0, 1, 2, 3'],answerIndex:0,explanation:'range excludes its stop value, so range(1, 4) produces 1, 2, and 3.'},
{prompt:'What does continue do?',choices:['Stops every loop','Skips to the next iteration','Restarts the program'],answerIndex:1,explanation:'continue skips the remaining statements in the current iteration and moves to the next one.'},
{prompt:'What is a common cause of an infinite while loop?',choices:['The condition never becomes false','Using enumerate','Iterating over a string'],answerIndex:0,explanation:'A while loop does not terminate when its condition stays truthy and no break is reached.'},
{prompt:'What does enumerate(items, start=1) provide?',choices:['Only values','Index-value pairs starting at 1','A sorted copy'],answerIndex:1,explanation:'enumerate yields each item together with a counter, beginning at the requested start value.'}],
{title:'Transaction total',instructions:'Loop through transaction amounts, skip non-positive entries, calculate the accepted total and count, then print both. Add a break when a sentinel value of 9999 is encountered.',expectedOutcomes:['Iterate through a list','Use continue and break correctly','Accumulate a numeric total and count'],starterCode:'transactions = [120.0, -20.0, 80.5, 0, 19.5, 9999, 40.0]\ntotal = 0\naccepted_count = 0\n# Process transactions and print the results.',language:'python'})
];
