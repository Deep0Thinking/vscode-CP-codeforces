import { CodeforcesSubmission } from './models';
import axios from 'axios';

export class UserSubmissions {
  private static userHandle: string | undefined;
  private static submissions: CodeforcesSubmission[] = [];
  private static submissionsMap: { [key: string]: CodeforcesSubmission[] } = {};

  private static getProblemKey(contestId: number, index: string): string {
    return `${contestId}-${index}`;
  }

  static getLatestVerdict(contestId: number, index: string): string | null {
    const key = UserSubmissions.getProblemKey(contestId, index);
    const submissions = UserSubmissions.submissionsMap[key] || [];
    if (submissions.length > 0) {
      return submissions[0].verdict;
    }
    return null;
  }

  static isNegativeVerdict(verdict: string | null): boolean {
    const negativeVerdicts = [
      'FAILED',
      'COMPILATION_ERROR',
      'RUNTIME_ERROR',
      'WRONG_ANSWER',
      'PRESENTATION_ERROR',
      'TIME_LIMIT_EXCEEDED',
      'MEMORY_LIMIT_EXCEEDED',
      'IDLENESS_LIMIT_EXCEEDED',
      'SECURITY_VIOLATED',
      'CRASHED',
      'INPUT_PREPARATION_CRASHED',
      'CHALLENGED',
      'SKIPPED',
      'TESTING',
      'REJECTED',
    ];

    return negativeVerdicts.includes(verdict || '');
  }

  static setSubmissions(submissions: CodeforcesSubmission[]) {
    this.submissions = submissions;
    this.submissionsMap = submissions.reduce((map, submission) => {
      const key = this.getProblemKey(submission.problem.contestId, submission.problem.index);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(submission);
      return map;
    }, {} as { [key: string]: CodeforcesSubmission[] });
  }


  static async fetchSubmissions(handle: string) {
    const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);
    return response.data.result;
  }

  static set(userHandle: string, submissions: CodeforcesSubmission[]) {
    UserSubmissions.userHandle = userHandle;
    UserSubmissions.submissions = submissions;
  }
}
