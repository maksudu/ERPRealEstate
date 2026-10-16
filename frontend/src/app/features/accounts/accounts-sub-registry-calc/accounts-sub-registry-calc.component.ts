import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { SubRegistryCalculationResponse } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-sub-registry-calc',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './accounts-sub-registry-calc.component.html'
})
export class AccountsSubRegistryCalcComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);

  isCalculating = signal<boolean>(false);
  calculationResult = signal<SubRegistryCalculationResponse | null>(null);

  locationOptions = [
    { id: 'GULSHAN_BANANI', name: 'Gulshan, Banani, Baridhara, Motijheel, Dilkusha (৳4,000 / sqm)' },
    { id: 'DHANMONDI_UTTARA', name: 'Dhanmondi, DOHS, Lalmatia, Uttara, Bashundhara (৳3,000 / sqm)' },
    { id: 'DHAKA_OTHER', name: 'Other Dhaka City Corporation Areas (৳2,000 / sqm)' },
    { id: 'OTHER_DISTRICT', name: 'Other Pourashavas & Districts (৳1,500 / sqm)' }
  ];

  calcForm: FormGroup = this.fb.group({
    property_type: ['RESIDENTIAL', Validators.required],
    apartment_sqft: [1550, [Validators.required, Validators.min(100)]],
    zone_category: ['GULSHAN_BANANI', Validators.required],
    deed_value_bdt: [12000000, [Validators.required, Validators.min(100000)]]
  });

  ngOnInit(): void {
    this.compute();
  }

  compute(): void {
    if (this.calcForm.invalid) return;
    this.isCalculating.set(true);

    const val = this.calcForm.value;
    const payload = {
      property_type: val.property_type,
      apartment_sqft: Number(val.apartment_sqft),
      zone_category: val.zone_category,
      deed_value_bdt: Number(val.deed_value_bdt)
    };

    this.accountsService.calculateSubRegistryFees(payload).subscribe({
      next: (res) => {
        this.calculationResult.set(res);
        this.isCalculating.set(false);
      },
      error: () => this.isCalculating.set(false)
    });
  }

  printSummary(): void {
    window.print();
  }
}
