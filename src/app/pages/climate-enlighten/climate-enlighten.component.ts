import { Component } from '@angular/core';

interface PhaseCard {
  title: string;
  launchDate: string;
  topics: string[];
  formLink: string;
  isDisabled: boolean;
}

@Component({
  selector: 'app-climate-enlighten',
  templateUrl: './climate-enlighten.component.html',
  styleUrls: ['./climate-enlighten.component.css']
})
export class ClimateEnlightenComponent {
  

  googleFormLink = 'https://docs.google.com/forms/d/e/1FAIpQLSf7Z3TetzeVgfKR7xAC55s3sfxNHcMWzSId5VTn_ygsPJSxRg/viewform'; 

  cards: PhaseCard[] = [
    {
      title: 'PHASE 1 — Foundations: Awareness, Science, Frameworks & Governance',
      launchDate: 'Launch October 2026',
      formLink: this.googleFormLink,
      isDisabled: false,
      topics: [
        'Foundations of Sustainability : The Environmental Movement, Triple Bottom Line and ESG',
        'Climate Change : Science, Causes, Trends, Impacts and Solutions',
        'Carbon Accounting and Scope  1, 2 & 3',
        'Climate Risk Assessment — Physical & Transition Risks',
        'Materiality Matrix and GRI Reporting',
        'BRSR, CSRD, TCFD, SASB and other reporting standards',
        'Environmental Laws and Regulations',
        'Principles of EHS and Auditing Standards',
        'Carbon Capture, Usage and Storage',
        'Regeneration and Nature Based Solutions',
        'Day-to-Day Climate Actions'
      ]
    },
    {
      title: 'PHASE 2 — Energy Transition, Industrial Decarbonization & Applied Methodologies',
      launchDate: 'Launch January 2027',
      formLink: this.googleFormLink,
      isDisabled: true,
      topics: [
        'Lifecycle Assessment (LCA)',
        'Wind Energy',
        'Solar Energy',
        'Geothermal Energy',
        'Hydro Energy',
        'Green Hydrogen and Fuel Cell Technology',
        'Solid Waste Management and Waste to Energy',
        'Circular Economy',
        'Decarbonization of Steel and Cement Industries',
        'Decarbonization of Food Industry and Sustainable Packaging',
        'Decarbonization of Embodied and Operational Carbon in Construction and LEED Certification'
      ]
    },
    {
      title: 'PHASE 3 — Sustainable Sectors, Frontier Energy, Technology & Innovation',
      launchDate: 'Launch April 2027',
      formLink: this.googleFormLink,
      isDisabled: true,
      topics: [
        'Environmental Impact Assessment (EIA)',
        'Sustainable Fashion',
        'Sustainable Tourism',
        'Sustainable Cities and Communities',
        'Sustainable Transport and Electric Vehicles',
        'Tidal Energy',
        'Nuclear Energy',
        'AI for EHS and Sustainability',
        'Digital Twins for Efficient Operations',
        'IoT and Analytics for EHS and Sustainability',
        'Green Supply Chain through Blockchain'
      ]
    }
  ];
}