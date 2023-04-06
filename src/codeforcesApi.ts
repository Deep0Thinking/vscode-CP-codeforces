import axios from 'axios';
import { CodeforcesProblem } from './models';
import * as cheerio from 'cheerio';


const API_BASE_URL = 'https://codeforces.com/api/';

export class CodeforcesApi {
  constructor() {}

  // Fetch problems from Codeforces
  async fetchProblems(): Promise<CodeforcesProblem[]> {
    const response = await axios.get(`${API_BASE_URL}problemset.problems`);
    return response.data.result.problems;
  }

  // Get all problems from Codeforces
  async getAllProblems(): Promise<CodeforcesProblem[]> {
    return await this.fetchProblems();
  }

  // Get the problem description for the given problem URL
  async getProblemDescription(problemUrl: string): Promise<string> {
    const response = await axios.get(problemUrl);
    const $ = cheerio.load(response.data);
    const problemDescriptionHtml = $('div.problem-statement').html();
    return problemDescriptionHtml || 'Problem description not found';
  }

  // Get problems by rating
  async getProblemsByRating(rating: number): Promise<CodeforcesProblem[]> {
    const problems = await this.getAllProblems();
    return problems.filter(problem => problem.rating === rating);
  }

  // Get problems by tag
  async getProblemsByTag(tag: string): Promise<CodeforcesProblem[]> {
    const problems = await this.getAllProblems();
    return problems.filter(problem => problem.tags.includes(tag));
  }  
  
}