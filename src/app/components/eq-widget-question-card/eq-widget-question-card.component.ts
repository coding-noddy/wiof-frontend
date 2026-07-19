import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * TMMS-24 (Trait Meta-Mood Scale, 24 items)
 * Developed by: Salovey, Mayer, Goldman, Turvey & Palfai (1995)
 * Spanish adaptation: Fernández-Berrocal, Extremera & Ramos (2004)
 *
 * Scoring: Each dimension has 8 items rated 1-5. Raw score range: 8-40.
 * Thresholds differ by gender (Fernández-Berrocal et al., 2004).
 *
 * Source: https://pubmed.ncbi.nlm.nih.gov/15519370/
 */

interface EQResult {
  dimension: string;
  emoji: string;
  score: number;
  percent: number;
  level: 'low' | 'adequate' | 'excellent';
  message: string;
}

@Component({
  selector: 'app-eq-widget-question-card',
  templateUrl: './eq-widget-question-card.component.html',
  styleUrls: ['./eq-widget-question-card.component.scss']
})
export class EqWidgetQuestionCardComponent implements OnInit {

  @Output('back') back$ = new EventEmitter();
  @Input() gender: 'M' | 'F' = 'M';

  userResponse!: FormGroup;
  showResult = false;
  results: EQResult[] = [];

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
    'When I am angry I try to change my mood.'
  ];

  // Official TMMS-24 thresholds (raw scores 8-40)
  // Source: Fernández-Berrocal et al. (2004)
  private thresholds = {
    M: {
      attention: { low: 21, adequate: 32 },  // ≤21 = improve, 22-32 = adequate, ≥33 = too much
      clarity:   { low: 25, adequate: 35 },  // ≤25 = improve, 26-35 = adequate, ≥36 = excellent
      repair:    { low: 23, adequate: 35 },  // ≤23 = improve, 24-35 = adequate, ≥36 = excellent
    },
    F: {
      attention: { low: 24, adequate: 35 },  // ≤24 = improve, 25-35 = adequate, ≥36 = too much
      clarity:   { low: 23, adequate: 34 },  // ≤23 = improve, 24-34 = adequate, ≥35 = excellent
      repair:    { low: 23, adequate: 34 },  // ≤23 = improve, 24-34 = adequate, ≥35 = excellent
    }
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    const controls: Record<string, any> = {};
    for (let i = 0; i < 24; i++) {
      controls[`response${i}`] = [3, Validators.required]; // Default to middle (3)
    }
    this.userResponse = this.fb.group(controls);
  }

  getFormControlName(i: number): string {
    return `response${i}`;
  }

  /** Count how many questions have been changed from default (3) */
  get answeredCount(): number {
    if (!this.userResponse) return 0;
    let count = 0;
    for (let i = 0; i < 24; i++) {
      const val = this.userResponse.get(`response${i}`)?.value;
      if (val !== 3) count++;
    }
    return count;
  }

  onSubmit() {
    const attentionRaw = this.getRawScore(0, 8);
    const clarityRaw = this.getRawScore(8, 16);
    const repairRaw = this.getRawScore(16, 24);

    const t = this.thresholds[this.gender];

    this.results = [
      this.buildResult('Attention', '👁️', attentionRaw, t.attention, true),
      this.buildResult('Clarity', '💡', clarityRaw, t.clarity, false),
      this.buildResult('Reparation', '🔄', repairRaw, t.repair, false),
    ];

    this.showResult = true;
  }

  onBack() {
    this.back$.emit();
  }

  retakeTest() {
    this.showResult = false;
    // Reset all to default 3
    for (let i = 0; i < 24; i++) {
      this.userResponse.get(`response${i}`)?.setValue(3);
    }
  }

  private getRawScore(from: number, to: number): number {
    let total = 0;
    for (let i = from; i < to; i++) {
      total += Number(this.userResponse.get(`response${i}`)?.value || 1);
    }
    return total;
  }

  private buildResult(
    dimension: string,
    emoji: string,
    rawScore: number,
    threshold: { low: number; adequate: number },
    isAttention: boolean
  ): EQResult {
    const percent = (rawScore / 40) * 100;
    let level: 'low' | 'adequate' | 'excellent';
    let message: string;

    if (rawScore <= threshold.low) {
      level = 'low';
      message = isAttention
        ? 'You may not be paying enough attention to your emotions. Mindfulness practices can help.'
        : `Your ${dimension.toLowerCase()} could be improved. Journaling and reflection may help.`;
    } else if (rawScore <= threshold.adequate) {
      level = 'adequate';
      message = `Your ${dimension.toLowerCase()} is at a healthy level. Keep nurturing this skill.`;
    } else {
      level = 'excellent';
      message = isAttention
        ? 'You may be paying too much attention to emotions. Balance with rational thinking.'
        : `Excellent ${dimension.toLowerCase()}! You have strong emotional intelligence in this area.`;
    }

    return { dimension, emoji, score: rawScore, percent, level, message };
  }
}
