export interface CodeforcesProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  rating: number;
  tags: string[];
  url?: string;
}