import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { image } from 'd3';

@Component({
  selector: 'app-energy-widget',
  templateUrl: './energy-widget.component.html',
  styleUrls: ['./energy-widget.component.scss']
})
export class EnergyWidgetComponent implements OnInit {
  energyConsumption: number;
  kgsofCO2: number;
  selectedUnit = '';
  litresofPetrol: number;
  litresofDiesel: number;
  kmsbySUV;
  kmsbycar;
  buttonClicked = false;
  consumptionNull = false;
  unitNull = false;
  showUnits=false;
  petrolImages: any;
  dieselImages: any;
  numberofPetrolCans: number;
  numberofDieselCans: number;
  //roundoffnumberofpetrolcans: number;
  units = ['KW', 'KWH'];
  constructor() {}

  ngOnInit() {}

  toggleUnitDropdown() {
    this.showUnits = !this.showUnits;
  }

  selectUnit(unit: string) {
    this.selectedUnit = unit;
    this.unitNull = false;
    this.showUnits = false;
  }
  
  CalculateCO2() {
    if (
      this.energyConsumption === undefined ||
      this.energyConsumption === null ||
      this.energyConsumption <= 0
    ) {
      this.consumptionNull = true;
      this.unitNull = false;
      this.buttonClicked = false; 
      return;
    }
  
    if (!this.selectedUnit) {
      this.unitNull = true;
      this.consumptionNull = false;
      this.buttonClicked = false; 
      return;
    }
  
    if (this.energyConsumption === undefined || this.energyConsumption === null || isNaN(this.energyConsumption)) { 
      this.consumptionNull = true; 
      this.unitNull = false; 
      this.buttonClicked = false; 
      return; 
    }

    if (this.selectedUnit === 'KW' && this.energyConsumption > 0) {
      this.buttonClicked = true;
      this.unitNull = false;
      this.consumptionNull = false;
      this.kgsofCO2 = this.energyConsumption * 612;
      this.litresofPetrol = this.kgsofCO2 / 2.296;
      this.litresofDiesel = this.kgsofCO2 / 2.653;
      this.kmsbycar = this.litresofPetrol * 15;
      this.kmsbySUV = this.litresofDiesel * 12;
      this.numberofPetrolCans = this.litresofPetrol / 100;
      this.numberofDieselCans = this.litresofDiesel / 500;
    } else if (this.selectedUnit === 'KWH' && this.energyConsumption > 0) {
      this.buttonClicked = true;
      this.unitNull = false;
      this.consumptionNull = false;
      this.kgsofCO2 = this.energyConsumption * 0.85;
      this.litresofPetrol = this.kgsofCO2 / 2.296;
      this.litresofDiesel = this.kgsofCO2 / 2.653;
      this.kmsbycar = this.litresofPetrol * 15;
      this.kmsbySUV = this.litresofDiesel * 12;
      this.numberofPetrolCans = this.litresofPetrol / 100;
    } else if (
      this.energyConsumption < 0 &&
      (this.selectedUnit === 'KWH' || this.selectedUnit === 'KW')
    ) {
      this.unitNull = false;
      this.consumptionNull = true;
    } else if (this.energyConsumption > 0 && this.selectedUnit === '') {
      this.unitNull = true;
      this.consumptionNull = false;
    } else if (
      this.energyConsumption === undefined &&
      this.selectedUnit === ''
    ) {
      this.unitNull = true;
      this.consumptionNull = true;
    }
  }
}
