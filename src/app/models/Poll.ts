import { FormGroup } from '@angular/forms';

export class Poll {
  id: string;
  pollQuestionId: string;
  option: string;
  ip4?: string;
  ip6?: string;
  email?: string;

  constructor(pollQuestionId: string, option, email?, ip4?, ip6?) {
    this.pollQuestionId = pollQuestionId;
    this.option = option;
    this.email = email;
    this.ip4 = ip4;
    this.ip6 = ip6;
  }

  static createByForm(
    pollQuestionId: string,
    wiofPollsForm: FormGroup,
    ip4?,
    ip6?
  ) {
    return new Poll(
      pollQuestionId,
      wiofPollsForm.value.option,
      wiofPollsForm.value.email,
      ip4,
      ip6
    );
  }
}

//Read user Ip  https://api6.ipify.org?format=json  https://api.ipify.org?format=json
//add it to the poll
//read user response
//add it to poll
//save this data in present poll collection
//collection created in backend when poll initiated from dashboard
//dashboard has a option add-poll
//once user records responce show poll result
//if user revisits then identify using ip , cookie and show only results and a message that you already voted
//show previous polls results in a new screen inside widget
//
