import { CodeforcesProblem, CodeforcesSubmission } from "./models";
import axios from "axios";
import * as cheerio from "cheerio";

const API_BASE_URL = "https://codeforces.com/api/";

export class CodeforcesApi {
  private submissionsMap: { [key: string]: CodeforcesSubmission[] } = {};

  constructor() {}

  async fetchProblems(): Promise<CodeforcesProblem[]> {
    const response = await axios.get(`${API_BASE_URL}problemset.problems`);
    return response.data.result.problems;
  }

  async getAllProblems(): Promise<CodeforcesProblem[]> {
    return await this.fetchProblems();
  }

  async getProblemDescription(problemUrl: string): Promise<string> {
    const response = await axios.get(problemUrl);
    const $ = cheerio.load(response.data);
    const problemDescriptionHtml = $("div.problem-statement").html();
    return problemDescriptionHtml || "Problem description not found";
  }

  async getProblemsByRating(rating: number): Promise<CodeforcesProblem[]> {
    const problems = await this.getAllProblems();
    return problems.filter((problem) => problem.rating === rating);
  }

  async getProblemsByTag(tag: string): Promise<CodeforcesProblem[]> {
    const problems = await this.getAllProblems();
    return problems.filter((problem) => problem.tags.includes(tag));
  }

  async fetchUserSubmissions(handle: string): Promise<CodeforcesSubmission[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}user.status?handle=${handle}`
      );

      if (response.data.status === "OK") {
        return response.data.result;
      }
      throw new Error(
        response.data.comment ||
          "An error occurred while fetching user submissions."
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.comment ||
        error.message ||
        "An error occurred while fetching user submissions.";
      throw new Error(errorMessage);
    }
  }

  private getProblemKey(contestId: number, index: string): string {
    return `${contestId}-${index}`;
  }

  getLatestVerdict(contestId: number, index: string): string | null {
    const key = this.getProblemKey(contestId, index);
    const submissions = this.submissionsMap[key] || [];
    if (submissions.length > 0) {
      return submissions[0].verdict;
    }
    return null;
  }

  isNegativeVerdict(verdict: string | null): boolean {
    const negativeVerdicts = [
      "FAILED",
      "PARTIAL",
      "COMPILATION_ERROR",
      "RUNTIME_ERROR",
      "WRONG_ANSWER",
      "PRESENTATION_ERROR",
      "TIME_LIMIT_EXCEEDED",
      "MEMORY_LIMIT_EXCEEDED",
      "IDLENESS_LIMIT_EXCEEDED",
      "SECURITY_VIOLATED",
      "CRASHED",
      "INPUT_PREPARATION_CRASHED",
      "CHALLENGED",
      "SKIPPED",
      "TESTING",
      "REJECTED",
    ];
    return negativeVerdicts.includes(verdict || "");
  }

  setSubmissions(submissions: CodeforcesSubmission[]) {
    this.submissionsMap = submissions.reduce((map, submission) => {
      const key = this.getProblemKey(
        submission.problem.contestId,
        submission.problem.index
      );
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(submission);
      return map;
    }, {} as { [key: string]: CodeforcesSubmission[] });
  }
}
