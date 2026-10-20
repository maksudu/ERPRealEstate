import { Routes } from '@angular/router';
import { ProjectTowersUnitsComponent } from './towers-units.component';
import { TowerFloorUnitFormComponent } from './tower-floor-unit-form.component';

export const TOWERS_UNITS_ROUTES: Routes = [
  { path: '', component: ProjectTowersUnitsComponent },
  { path: ':entity/new', component: TowerFloorUnitFormComponent },
  { path: ':entity/:id/edit', component: TowerFloorUnitFormComponent }
];
