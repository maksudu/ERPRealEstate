import { Component } from '@angular/core';
import { RecruitmentCrudPageComponent } from './recruitment-crud-page.component';

@Component({
  selector: 'app-recruitment-requisitions',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="requisitions" />'
})
export class RecruitmentRequisitionsPageComponent {}

@Component({
  selector: 'app-recruitment-vacancies',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="vacancies" />'
})
export class RecruitmentVacanciesPageComponent {}

@Component({
  selector: 'app-recruitment-applicants',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="applicants" />'
})
export class RecruitmentApplicantsPageComponent {}

@Component({
  selector: 'app-recruitment-interviews',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="interviews" />'
})
export class RecruitmentInterviewsPageComponent {}

@Component({
  selector: 'app-recruitment-evaluations',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="evaluations" />'
})
export class RecruitmentEvaluationsPageComponent {}

@Component({
  selector: 'app-recruitment-selection',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="selection" />'
})
export class RecruitmentSelectionPageComponent {}

@Component({
  selector: 'app-recruitment-offer-letters',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="offer-letters" />'
})
export class RecruitmentOfferLettersPageComponent {}

@Component({
  selector: 'app-recruitment-appointment-letters',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="appointment-letters" />'
})
export class RecruitmentAppointmentLettersPageComponent {}

@Component({
  selector: 'app-recruitment-joining-checklist',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="joining-checklist" />'
})
export class RecruitmentJoiningChecklistPageComponent {}

@Component({
  selector: 'app-recruitment-onboarding',
  standalone: true,
  imports: [RecruitmentCrudPageComponent],
  template: '<app-recruitment-crud-page recordType="onboarding" />'
})
export class RecruitmentOnboardingPageComponent {}
