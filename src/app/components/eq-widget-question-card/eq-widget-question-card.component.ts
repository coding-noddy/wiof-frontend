import { Component, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventEmitter } from '@angular/core';

@Component({
  selector: 'app-eq-widget-question-card',
  templateUrl: './eq-widget-question-card.component.html',
  styleUrls: ['./eq-widget-question-card.component.scss'],
  standalone: false
})
export class EqWidgetQuestionCardComponent implements OnInit {
  userResponse: FormGroup;
  showResult: boolean = false;
  @Output('back') back$ = new EventEmitter();
  gender: string;
  results: number[];
  result1msg: string = '';
  result2msg: string = '';
  result3msg: string = '';
  questions: string[] = [
    'I pay close attention to feelings.',
    'I usually worry about what I feel.',
    'I usually spend time thinking about my emotions.',
    'I think it pays to pay attention to my emotions.',
    'I let my feelings affect my thoughts.',
    'I think about my mood constantly.',
    'I often think about my feelings.',
    'I pay close attention to how I feel.',
    'I understand my feelings.',
    'I can often define my feelings.',
    'I almost always know how I feel.',
    'I usually know my feelings about people.',
    'I often notice my feelings in different situations.',
    'I can always tell how I feel.',
    'Sometimes I can say what my emotions are.',
    'I can understand my feelings.',
    'Although I sometimes feel sad, I usually have a positive outlook.',
    'Though I feel bad, I try to think of pleasant things.',
    'When I am sad, I think of all the pleasures of life.',
    'I try to think positive thoughts even though I feel bad.',
    'If I turn things around too much, complicating them, I try to calm myself down.',
    'I worry about being in a good mood.',
    'I have lots of energy when I feel happy.',
    'When I am angry try to change my mood.'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.userResponse = this.fb.group({
      response0: [1, Validators.required],
      response1: [1, Validators.required],
      response2: [1, Validators.required],
      response3: [1, Validators.required],
      response4: [1, Validators.required],
      response5: [1, Validators.required],
      response6: [1, Validators.required],
      response7: [1, Validators.required],
      response8: [1, Validators.required],
      response9: [1, Validators.required],
      response10: [1, Validators.required],
      response11: [1, Validators.required],
      response12: [1, Validators.required],
      response13: [1, Validators.required],
      response14: [1, Validators.required],
      response15: [1, Validators.required],
      response16: [1, Validators.required],
      response17: [1, Validators.required],
      response18: [1, Validators.required],
      response19: [1, Validators.required],
      response20: [1, Validators.required],
      response21: [1, Validators.required],
      response22: [1, Validators.required],
      response23: [1, Validators.required]
    });
    this.gender = 'M';
  }

  getFormControlName(i) {
    return `response${i}`;
  }

  onSubmit() {
    this.results = [
      this.getEmotionalAttentionFactor(),
      this.getEmotionalClarityFactor(),
      this.getEmotionalRepairFactor()
    ];
    this.setMessage();
    this.showResult = true;
  }

  onBack() {
    this.back$.emit();
  }

  getEmotionalAttentionFactor() {
    let a = 0;
    let total = Number(0);
    for (a = 0; a < 8; a++) {
      const response = `response${a}`;
      total = total + Number(this.userResponse.get(response).value);
    }
    let percent = (total / 40) * 100;
    return percent;
  }
  getEmotionalClarityFactor() {
    let a = 8;
    let total = Number(0);
    for (a = 8; a < 16; a++) {
      const response = `response${a}`;
      total = total + Number(this.userResponse.get(response).value);
    }
    let percent = (total / 40) * 100;
    return percent;
  }

  getEmotionalRepairFactor() {
    let a = 16;
    let total = Number(0);
    for (a = 16; a < 24; a++) {
      const response = `response${a}`;
      total = total + Number(this.userResponse.get(response).value);
    }
    let percent = (total / 40) * 100;
    return percent;
  }
  setMessage() {
    //calculating for men
    if (this.gender == 'M') {
      // calculating for EmotionalAttentionFactor
      if (this.results[0] < 55) {
        this.result1msg = 'Should improve attention: pays little attention';
      } else if (this.results[0] >= 55 && this.results[0] <= 80) {
        this.result1msg = 'Adequate Attention';
      } else if (this.results[0] > 80) {
        this.result1msg = 'Should improve attention: pays too much attention';
      }
      // calculating for EmotionalClarityFactor
      if (this.results[1] < 62.5) {
        this.result2msg = 'Should improve clarity';
      } else if (this.results[1] >= 62.5 && this.results[0] <= 87.5) {
        this.result2msg = 'Adequate clarity';
      } else if (this.results[1] > 87.5) {
        this.result2msg = 'Excellent clarity';
      }
      // calculating for EmotionalRepairFactor
      if (this.results[1] < 57.5) {
        this.result3msg = 'Should improve reparation';
      } else if (this.results[1] >= 57.5 && this.results[0] <= 87.5) {
        this.result3msg = 'Adequate reparation';
      } else if (this.results[1] > 87.5) {
        this.result3msg = 'Excellent reparation';
      }
    }

    //calculating for women
    else if (this.gender == 'F') {
      // calculating for EmotionalAttentionFactor
      if (this.results[0] <= 60) {
        this.result1msg = 'Should improve attention: pays little attention';
      } else if (this.results[0] > 60 && this.results[0] <= 87.5) {
        this.result1msg = 'Adequate Attention';
      } else if (this.results[0] > 87.5) {
        this.result1msg = 'Should improve attention: pays too much attention';
      }
      // calculating for EmotionalClarityFactor
      if (this.results[1] <= 57.5) {
        this.result2msg = 'Should improve clarity';
      } else if (this.results[1] > 57.5 && this.results[0] <= 85) {
        this.result2msg = 'Adequate clarity';
      } else if (this.results[1] > 85) {
        this.result2msg = 'Excellent clarity';
      }
      // calculating for EmotionalRepairFactor
      if (this.results[1] < 57.5) {
        this.result3msg = 'Should improve reparation';
      } else if (this.results[1] >= 57.5 && this.results[0] <= 87.5) {
        this.result3msg = 'Adequate reparation';
      } else if (this.results[1] > 87.5) {
        this.result3msg = 'Excellent reparation';
      }
    }
  }
}
