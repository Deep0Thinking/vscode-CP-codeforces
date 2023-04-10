import axios from 'axios';
import { CodeforcesProblem, CodeforcesSubmission } from './models';
import * as cheerio from 'cheerio';



const API_BASE_URL = 'https://codeforces.com/api/';

export class CodeforcesApi {
  constructor() { }

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
    const problemDescriptionHtml = $('div.problem-statement').html();
    return problemDescriptionHtml || 'Problem description not found';
  }

  async getProblemsByRating(rating: number): Promise<CodeforcesProblem[]> {
    const problems = await this.getAllProblems();
    return problems.filter(problem => problem.rating === rating);
  }

  async getProblemsByTag(tag: string): Promise<CodeforcesProblem[]> {
    const problems = await this.getAllProblems();
    return problems.filter(problem => problem.tags.includes(tag));
  }

  async fetchUserSubmissions(handle: string): Promise<CodeforcesSubmission[]> {
    const response = await axios.get(`${API_BASE_URL}user.status?handle=${handle}`);
    if (response.data.status === 'OK') {
      return response.data.result;
    } else {
      throw new Error('Invalid user handle');
    }
  }

}