import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { HrReportsService } from './hr-reports.service';

describe('HrReportsService', () => {
  let service: HrReportsService;
  let http: HttpTestingController;
  const reportsUrl = `${environment.apiUrl}/hrms/reports`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(HrReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the selected report page and forwards server filters and pagination', () => {
    let receivedTotal = 0;
    service.rows('employee-master', { search: 'EMP-1', start_date: '2025-07-01' }, 50, 100)
      .subscribe(page => receivedTotal = page.total);

    const request = http.expectOne(request =>
      request.url === `${reportsUrl}/employee-master/rows` &&
      request.params.get('search') === 'EMP-1' &&
      request.params.get('start_date') === '2025-07-01' &&
      request.params.get('limit') === '50' &&
      request.params.get('offset') === '100'
    );
    request.flush({
      report_id: 'employee-master',
      title: 'Employee Master Report',
      description: '',
      columns: [],
      rows: [],
      total: 231,
      limit: 50,
      offset: 100
    });
    expect(receivedTotal).toBe(231);
  });

  it('requests a server-generated export as a blob with the same filters', () => {
    let downloaded: Blob | undefined;
    service.export('employee-loan-advance', { financial_year: '2025-2026' }, 'xlsx')
      .subscribe(blob => downloaded = blob);

    const request = http.expectOne(request =>
      request.url === `${reportsUrl}/employee-loan-advance/export` &&
      request.params.get('format') === 'xlsx' &&
      request.params.get('financial_year') === '2025-2026'
    );
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    expect(downloaded?.size).toBeGreaterThan(0);
  });
});
