/** NPS bands stored with the score (ITDFCJ-37 CA-5): 1–6, 7–8, 9–10. */
type NpsCategory = 'detractor' | 'passive' | 'promoter';

/** Longest comment the survey accepts. */
const NPS_COMMENT_MAX_LENGTH = 1000;

const npsCategoryOf = (score: number): NpsCategory => {
  if (score <= 6) return 'detractor';
  return score <= 8 ? 'passive' : 'promoter';
};

export { NPS_COMMENT_MAX_LENGTH, npsCategoryOf, type NpsCategory };
