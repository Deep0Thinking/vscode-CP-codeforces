export interface CodeforcesProblem {
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
}

export interface CodeforcesSubmission {
  problem: CodeforcesProblem;
  verdict: string;
}
