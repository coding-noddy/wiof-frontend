import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

interface EQFact {
  text: string;
  source: string;
  url: string;
}

@Component({
  selector: 'app-eq-widget',
  templateUrl: './eq-widget.component.html',
  styleUrls: ['./eq-widget.component.scss']
})
export class EQWidgetComponent implements OnInit, OnDestroy {

  showTest = false;
  about = false;
  gender: 'M' | 'F' = 'M';

  // ── Fact strip ─────────────────────────────────────────────
  currentFactIndex = 0;
  factExpanded = false;
  private factTimer: ReturnType<typeof setInterval> | null = null;

  eqFacts: EQFact[] = [
    {
      text: 'Emotional intelligence accounts for nearly 90% of what sets high performers apart from peers with similar technical skills and knowledge.',
      source: 'Harvard Business Review',
      url: 'https://hbr.org/2004/01/what-makes-a-leader'
    },
    {
      text: 'People with higher emotional intelligence report better mental health, job performance, and leadership skills — across 44 studies involving 7,898 participants.',
      source: 'Journal of Organizational Behavior',
      url: 'https://pubmed.ncbi.nlm.nih.gov/20049860/'
    },
    {
      text: 'EQ can be developed at any age. Brain plasticity allows emotional regulation skills to strengthen through practice — unlike IQ which remains relatively stable.',
      source: 'American Psychological Association',
      url: 'https://www.apa.org/topics/emotional-intelligence'
    },
    {
      text: 'The TMMS-24 (used in this widget) measures three key dimensions: Attention to feelings, Clarity of feelings, and Mood Repair — validated across 20+ countries.',
      source: 'Personality & Individual Differences',
      url: 'https://pubmed.ncbi.nlm.nih.gov/15519370/'
    },
  ];

  get currentFact(): EQFact {
    return this.eqFacts[this.currentFactIndex];
  }

  ngOnInit() {
    this.startFactRotation();
  }

  ngOnDestroy() {
    this.stopFactRotation();
  }

  startTest() {
    this.showTest = true;
  }

  nextFact() {
    this.currentFactIndex = (this.currentFactIndex + 1) % this.eqFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  prevFact() {
    this.currentFactIndex =
      (this.currentFactIndex - 1 + this.eqFacts.length) % this.eqFacts.length;
    this.factExpanded = false;
    this.restartFactTimer();
  }

  private startFactRotation() {
    this.factTimer = setInterval(() => {
      this.currentFactIndex = (this.currentFactIndex + 1) % this.eqFacts.length;
      this.factExpanded = false;
    }, 6000);
  }

  private stopFactRotation() {
    if (this.factTimer) clearInterval(this.factTimer);
  }

  private restartFactTimer() {
    this.stopFactRotation();
    this.startFactRotation();
  }
}
