const subjectColors: Record<string,string>={
  'Python Programming':'var(--subject-python)',
  'JavaScript Programming':'var(--subject-javascript)',
  SQL:'var(--subject-sql)',
  'Data Engineering':'var(--subject-data)',
  'Data Structures and Algorithms':'var(--subject-dsa)',
};

export function subjectColor(subject:string){return subjectColors[subject]??'var(--brand)'}
