import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-water-widget',
  templateUrl: './water-widget.component.html',
  styleUrls: ['./water-widget.component.scss'],
  standalone: false
})
export class WaterWidgetComponent implements OnInit {
  waterWidgetItems: { name: string; icon: string; url: string }[];
  about: boolean = false;
  constructor() {}

  ngOnInit() {
    this.waterWidgetItems = [
      {
        name: 'Ground Water',
        icon: '../../../assets/water-widget-icons/icons ground water.png',
        url: 'https://indiawris.gov.in/wris/#/groundWater'
      },
      {
        name: 'Rainfall',
        icon: '../../../assets/water-widget-icons/icons rainfall.png',
        url: 'https://indiawris.gov.in/wris/#/rainfall'
      },
      {
        name: 'Evapo-Transpiration',
        icon: '../../../assets/water-widget-icons/icons8-sparkling_water 1.png',
        url: 'https://indiawris.gov.in/wris/#/evapotranspiration'
      },
      {
        name: 'Reservoirs',
        icon: '../../../assets/water-widget-icons/icons reservoir.png',
        url: 'https://indiawris.gov.in/wris/#/Reservoirs'
      },
      {
        name: 'River',
        icon: '../../../assets/water-widget-icons/icons river.png',
        url: 'https://indiawris.gov.in/wris/#/RiverMonitoring'
      },
      {
        name: 'Soil Moisture',
        icon: '../../../assets/water-widget-icons/icons soil moisture.png',
        url: 'https://indiawris.gov.in/wris/#/soilMoisture'
      },
      {
        name: 'Surface Water Quality',
        icon:
          '../../../assets/water-widget-icons/icon surface water quality.png',
        url: 'https://indiawris.gov.in/wris/#/SWQuality'
      }
    ];
  }
}
