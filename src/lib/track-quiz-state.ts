export type TrackQuizSelection = Record<string, number>;

export function quizIdentity(trackId: string, sectionId: string, quizId: string) {
  return `${trackId}:${sectionId}:${quizId}`;
}

export function orderedQuizAnswers(questionIds: string[], selections: TrackQuizSelection | Array<number | null>) {
  if (!questionIds.length || new Set(questionIds).size !== questionIds.length) {
    throw new Error('This knowledge check has invalid question identifiers.');
  }
  if (Array.isArray(selections) && selections.length !== questionIds.length) {
    throw new Error('Answer every question in this section before submitting.');
  }
  const answers = Array.isArray(selections) ? selections : questionIds.map((id) => selections[id]);
  if (answers.some((answer) => typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0)) {
    throw new Error('Answer every question in this section before submitting.');
  }
  return answers.map((answer) => answer as number);
}
