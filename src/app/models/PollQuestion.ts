export class PollQuestion {
  pollId: string;
  question: string;
  options: string[];
  correctAnswer: string;  // e.g. 'option1', 'option2', etc. — the correct option key
  publishStartDate: number;
  publishEndDate: number;
  submitDate: number;
  status: string;

  constructor(
    pollId: string,
    question: string,
    options: string[],
    correctAnswer: string,
    publishStartDate: number,
    publishEndDate: number,
    submitDate: number,
    status: string
  ) {
    this.pollId = pollId;
    this.question = question;
    this.options = options;
    this.correctAnswer = correctAnswer || '';
    this.publishStartDate = publishStartDate;
    this.publishEndDate = publishEndDate;
    this.submitDate = submitDate;
    this.status = status;
  }
}
