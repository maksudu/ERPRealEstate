import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { ModalComponent } from '../../../shared/components';
import { Tower, ProjectFloor, ProjectUnit, ProjectDesignRevision } from '../../../core/models/project.model';

type Entity = 'towers' | 'floors' | 'units' | 'revisions';
type Row = Record<string, any> & { id: number };

@Component({
  selector: 'app-project-towers-units',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './towers-units.component.html'
})
export class ProjectTowersUnitsComponent implements OnInit {
  protected readonly Math = Math;
  private api = inject(ProjectService);

  readonly tabs: { key: Entity; label: string; icon: string }[] = [
    { key: 'towers', label: 'Towers & Buildings', icon: '🏢' },
    { key: 'floors', label: 'Floors & Levels', icon: '🏗️' },
    { key: 'units', label: 'Units & Inventory', icon: '🚪' },
    { key: 'revisions', label: 'Design Revisions & Changes', icon: '📜' }
  ];

  viewMode = signal<'tree' | 'table'>('tree');
  activeTab = signal<Entity>('towers');

  // Filter & Search states
  search = '';
  projectId = '';

  // Data states
  projects = signal<any[]>([]);
  rows = signal<Row[]>([]);
  total = signal(0);
  offset = signal(0);
  limit = signal(25);
  loading = signal(false);
  error = signal('');
  success = signal('');

  // Tree & Hierarchy states
  loadingTree = signal(false);
  allTowers = signal<Tower[]>([]);
  allFloors = signal<ProjectFloor[]>([]);
  allUnits = signal<ProjectUnit[]>([]);
  allRevisions = signal<ProjectDesignRevision[]>([]);

  expandedTowerIds = signal<Set<number>>(new Set());
  selectedTowerId = signal<number | null>(null);
  selectedFloorId = signal<number | null>(null);

  // 360 Inspect Modal
  inspectModalOpen = signal(false);
  inspectType = signal<Entity>('towers');
  inspectData = signal<any>(null);

  // Computed Tree Elements
  treeTowers = computed(() => {
    let list = this.allTowers();
    if (this.projectId) {
      list = list.filter(t => t.project_id === Number(this.projectId));
    }
    if (this.search.trim()) {
      const q = this.search.toLowerCase().trim();
      list = list.filter(t =>
        (t.tower_code && t.tower_code.toLowerCase().includes(q)) ||
        (t.tower_name && t.tower_name.toLowerCase().includes(q)) ||
        (t.building_name && t.building_name.toLowerCase().includes(q))
      );
    }
    return list;
  });

  selectedTower = computed(() => {
    const id = this.selectedTowerId();
    return id ? this.allTowers().find(t => t.id === id) || null : null;
  });

  selectedFloor = computed(() => {
    const id = this.selectedFloorId();
    return id ? this.allFloors().find(f => f.id === id) || null : null;
  });

  filteredTreeUnits = computed(() => {
    const flrId = this.selectedFloorId();
    const twrId = this.selectedTowerId();
    let units = this.allUnits();

    if (flrId) {
      units = units.filter(u => u.floor_id === flrId);
    } else if (twrId) {
      units = units.filter(u => u.tower_id === twrId);
    } else if (this.projectId) {
      units = units.filter(u => u.project_id === Number(this.projectId));
    }

    if (this.search.trim()) {
      const q = this.search.toLowerCase().trim();
      units = units.filter(u =>
        (u.unit_code && u.unit_code.toLowerCase().includes(q)) ||
        (u.space_type && u.space_type.toLowerCase().includes(q)) ||
        (u.unit_type && u.unit_type.toLowerCase().includes(q))
      );
    }

    return units;
  });

  // KPIs
  kpis = computed(() => {
    const twrs = this.allTowers();
    const flrs = this.allFloors();
    const unts = this.allUnits();
    const revs = this.allRevisions();

    // Unique buildings
    const bldgSet = new Set<string>();
    twrs.forEach(t => bldgSet.add(t.building_name || t.tower_code));

    const totalSaleable = unts.reduce((acc, u) => acc + Number(u.saleable_area_sqft || 0), 0);
    const totalGross = unts.reduce((acc, u) => acc + Number(u.gross_area_sqft || u.saleable_area_sqft || 0), 0);

    const resUnits = unts.filter(u => (u.space_type || 'RESIDENTIAL') === 'RESIDENTIAL').length;
    const comUnits = unts.filter(u => u.space_type === 'COMMERCIAL' || u.space_type === 'RETAIL' || u.space_type === 'OFFICE' || u.space_type === 'SHOP').length;
    const prkBays = unts.filter(u => u.space_type === 'PARKING_BAY' || (u.parking_bay_count && u.parking_bay_count > 0)).length;

    const bsmFloors = flrs.filter(f => (f.floor_number || 0) < 0).length;
    const upFloors = flrs.filter(f => (f.floor_number || 0) > 0).length;

    const approvedCount = unts.filter(u => u.configuration_stage === 'APPROVED').length;
    const proposedCount = unts.filter(u => !u.configuration_stage || u.configuration_stage === 'PROPOSED').length;
    const asBuiltCount = unts.filter(u => u.configuration_stage === 'AS_BUILT').length;

    const activeConst = twrs.filter(t => t.construction_status === 'UNDER_CONSTRUCTION' || t.construction_status === 'FOUNDATION').length;
    const pendingRegulatory = revs.filter(r => r.requires_regulatory_approval && r.revision_status !== 'APPROVED').length;

    return {
      totalTowers: twrs.length,
      totalBuildings: bldgSet.size || twrs.length,
      activeConstructionTowers: activeConst,
      totalFloors: flrs.length,
      basementFloors: bsmFloors,
      upperFloors: upFloors,
      totalUnits: unts.length,
      residentialUnits: resUnits,
      commercialUnits: comUnits,
      parkingBays: prkBays,
      totalSaleableSqft: totalSaleable,
      totalGrossSqft: totalGross,
      approvedStageCount: approvedCount,
      proposedStageCount: proposedCount,
      asBuiltCount: asBuiltCount,
      totalRevisions: revs.length,
      pendingRegulatoryRevisions: pendingRegulatory
    };
  });

  activeTabLabel = () => this.tabs.find(t => t.key === this.activeTab())?.label || 'Record';
  pageNumber = () => Math.floor(this.offset() / this.limit()) + 1;
  pageCount = () => Math.max(1, Math.ceil(this.total() / this.limit()));

  ngOnInit() {
    this.success.set(history.state?.success || '');
    this.api.getProjects().subscribe({
      next: p => {
        this.projects.set(p || []);
        if (p && p.length > 0 && !this.projectId) {
          // Keep all projects by default or load initial
        }
      },
      error: () => this.error.set('Could not load projects.')
    });

    this.loadAllTreeData();
    this.loadActiveData();
  }

  selectTab(tab: Entity) {
    if (this.activeTab() !== tab) {
      this.activeTab.set(tab);
      this.offset.set(0);
      this.loadActiveData();
    }
  }

  onProjectChange() {
    this.offset.set(0);
    this.selectedTowerId.set(null);
    this.selectedFloorId.set(null);
    this.loadAllTreeData();
    this.loadActiveData();
  }

  loadAllTreeData() {
    this.loadingTree.set(true);
    const pid = this.projectId ? Number(this.projectId) : undefined;

    // Load towers, floors, units, and revisions for tree & KPI view
    this.api.getTowers(pid).subscribe({
      next: t => {
        this.allTowers.set(t || []);
        // Automatically expand the first tower
        if (t && t.length > 0) {
          const s = new Set<number>();
          s.add(t[0].id);
          this.expandedTowerIds.set(s);
          this.selectedTowerId.set(t[0].id);
        }
        this.loadingTree.set(false);
      },
      error: () => this.loadingTree.set(false)
    });

    this.api.getFloors({ project_id: pid, limit: 500 }).subscribe({
      next: res => this.allFloors.set(res.items || []),
      error: () => {}
    });

    this.api.getUnits({ project_id: pid, limit: 1000 }).subscribe({
      next: res => this.allUnits.set(res.items || []),
      error: () => {}
    });

    this.api.getDesignRevisions({ project_id: pid, limit: 200 }).subscribe({
      next: res => this.allRevisions.set(res.items || []),
      error: () => {}
    });
  }

  loadActiveData() {
    this.loading.set(true);
    this.error.set('');
    const filters: any = {
      search: this.search.trim() || undefined,
      project_id: this.projectId ? Number(this.projectId) : undefined,
      limit: this.limit(),
      offset: this.offset()
    };

    const req = this.activeTab() === 'towers'
      ? this.api.getTowersPaged(filters)
      : this.activeTab() === 'floors'
      ? this.api.getFloors(filters)
      : this.activeTab() === 'units'
      ? this.api.getUnits(filters)
      : this.api.getDesignRevisions(filters);

    req.subscribe({
      next: (page: any) => {
        const result = Array.isArray(page)
          ? { items: page, total: page.length, limit: this.limit(), offset: this.offset() }
          : page;
        this.rows.set(result.items || []);
        this.total.set(result.total || 0);
        this.limit.set(result.limit || 25);
        this.offset.set(result.offset || 0);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.detail || `Could not load ${this.activeTabLabel().toLowerCase()}.`);
        this.loading.set(false);
      }
    });
  }

  tabCount(tab: Entity): number {
    if (tab === 'towers') return this.allTowers().length;
    if (tab === 'floors') return this.allFloors().length;
    if (tab === 'units') return this.allUnits().length;
    if (tab === 'revisions') return this.allRevisions().length;
    return 0;
  }

  // Tree interactions
  toggleTowerExpand(id: number) {
    const s = new Set(this.expandedTowerIds());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.expandedTowerIds.set(s);
  }

  isTowerExpanded(id: number): boolean {
    return this.expandedTowerIds().has(id);
  }

  selectTreeTower(tower: Tower) {
    this.selectedTowerId.set(tower.id);
    this.selectedFloorId.set(null);
    this.toggleTowerExpand(tower.id);
  }

  selectTreeFloor(floor: ProjectFloor) {
    this.selectedFloorId.set(floor.id);
    this.selectedTowerId.set(floor.tower_id);
  }

  towerFloors(towerId: number): ProjectFloor[] {
    return this.allFloors().filter(f => f.tower_id === towerId).sort((a, b) => (b.floor_number || 0) - (a.floor_number || 0));
  }

  floorUnitCount(floorId: number): number {
    return this.allUnits().filter(u => u.floor_id === floorId).length;
  }

  paginate(dir: number) {
    this.offset.update(x => Math.max(0, x + dir * this.limit()));
    this.loadActiveData();
  }

  deleteRow(row: Row, entity: Entity) {
    const name = row['tower_name'] || row['display_name'] || row['unit_code'] || row['revision_code'] || 'this record';
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const req = entity === 'towers'
      ? this.api.deleteTower(row.id)
      : entity === 'floors'
      ? this.api.deleteFloor(row.id)
      : entity === 'units'
      ? this.api.deleteUnit(row.id)
      : this.api.deleteDesignRevision(row.id);

    req.subscribe({
      next: () => {
        this.success.set('Record deleted successfully.');
        this.loadActiveData();
        this.loadAllTreeData();
      },
      error: e => this.error.set(e?.error?.detail || 'Delete failed.')
    });
  }

  // 360 Inspect Modal
  inspectItem(row: any, type: Entity) {
    this.inspectType.set(type);
    this.inspectData.set(row);
    this.inspectModalOpen.set(true);
  }

  inspectTitle = computed(() => {
    const d = this.inspectData();
    if (!d) return 'Inspect';
    const t = this.inspectType();
    if (t === 'towers') return `Tower BIM 360° — ${d.tower_code} (${d.tower_name})`;
    if (t === 'floors') return `Floor Level 360° — ${d.display_name} (Floor ${d.floor_number})`;
    if (t === 'units') return `Unit Digital Twin — ${d.unit_code}`;
    return `Design Revision — ${d.revision_code}`;
  });

  inspectSubtitle = computed(() => {
    const d = this.inspectData();
    if (!d) return '';
    const t = this.inspectType();
    if (t === 'towers') return `Building: ${d.building_name || 'Main'} · Stage: ${d.configuration_stage || 'PROPOSED'}`;
    if (t === 'floors') return `Type: ${d.floor_type} · Stage: ${d.configuration_stage || 'PROPOSED'}`;
    if (t === 'units') return `Space: ${d.space_type || 'RESIDENTIAL'} · Status: ${d.unit_status || 'AVAILABLE'}`;
    return `Discipline: ${d.revision_type} · Status: ${d.revision_status || 'DRAFT'}`;
  });

  inspectProperties = computed(() => {
    const d = this.inspectData();
    if (!d) return [];
    const t = this.inspectType();

    if (t === 'towers') {
      return [
        { label: 'Tower Code', value: d.tower_code },
        { label: 'Building Name', value: d.building_name },
        { label: 'Space Type', value: d.building_type },
        { label: 'Configuration Stage', value: d.configuration_stage },
        { label: 'Total Floors', value: d.total_floors },
        { label: 'Lifts Count', value: d.total_lifts },
        { label: 'Staircase Count', value: d.staircase_count },
        { label: 'Car Parking Capacity', value: d.parking_capacity_cars ? `${d.parking_capacity_cars} Bays` : 'N/A' },
        { label: 'Approved Height (m)', value: d.approved_height_m ? `${d.approved_height_m}m` : 'N/A' },
        { label: 'Approved Floor Area', value: d.approved_floor_area_sqft ? `${this.formatNumber(d.approved_floor_area_sqft)} sq ft` : 'N/A' },
        { label: 'Structural System', value: d.structural_system },
        { label: 'Arch Plan Ref', value: d.approved_architectural_plan_ref },
        { label: 'Structural Dwg Ref', value: d.structural_drawing_ref },
        { label: 'Electrical Dwg Ref', value: d.electrical_drawing_ref },
        { label: 'Plumbing Dwg Ref', value: d.plumbing_drawing_ref },
        { label: 'Fire Safety NOC Ref', value: d.fire_safety_drawing_ref }
      ];
    } else if (t === 'floors') {
      return [
        { label: 'Floor Number', value: d.floor_number },
        { label: 'Display Name', value: d.display_name },
        { label: 'Floor Space Type', value: d.floor_type },
        { label: 'Configuration Stage', value: d.configuration_stage },
        { label: 'Total Floor Area', value: d.floor_area_sqft ? `${this.formatNumber(d.floor_area_sqft)} sq ft` : 'N/A' },
        { label: 'Common Area', value: d.common_area_sqft ? `${this.formatNumber(d.common_area_sqft)} sq ft` : 'N/A' },
        { label: 'Lobby Area', value: d.lobby_area_sqft ? `${this.formatNumber(d.lobby_area_sqft)} sq ft` : 'N/A' },
        { label: 'Corridor Area', value: d.corridor_area_sqft ? `${this.formatNumber(d.corridor_area_sqft)} sq ft` : 'N/A' },
        { label: 'Lifts Serving Floor', value: d.lift_count },
        { label: 'Staircases', value: d.staircase_count },
        { label: 'Planned Units', value: d.planned_units_count },
        { label: 'Approved Plan Ref', value: d.approved_plan_ref },
        { label: 'Inspection Status', value: d.inspection_status }
      ];
    } else if (t === 'units') {
      return [
        { label: 'Unit Code', value: d.unit_code },
        { label: 'Space Classification', value: d.space_type || 'RESIDENTIAL' },
        { label: 'Unit Typology', value: d.unit_type },
        { label: 'Configuration Stage', value: d.configuration_stage },
        { label: 'Commercial Status', value: d.unit_status },
        { label: 'Bedrooms', value: d.bedroom_count },
        { label: 'Bathrooms', value: d.bathroom_count },
        { label: 'Balconies', value: d.balcony_count },
        { label: 'Usable Carpet Area', value: d.usable_carpet_area_sqft ? `${d.usable_carpet_area_sqft} sq ft` : 'N/A' },
        { label: 'Balcony Area', value: d.balcony_area_sqft ? `${d.balcony_area_sqft} sq ft` : 'N/A' },
        { label: 'Allocated Common Area', value: d.common_area_allocated_sqft ? `${d.common_area_allocated_sqft} sq ft` : 'N/A' },
        { label: 'Gross Area', value: d.gross_area_sqft ? `${d.gross_area_sqft} sq ft` : 'N/A' },
        { label: 'Total Saleable Area', value: d.saleable_area_sqft ? `${d.saleable_area_sqft} sq ft` : 'N/A' },
        { label: 'Planned Price (BDT)', value: this.formatBDT(d.planned_price_bdt) },
        { label: 'Parking Bays', value: d.parking_bay_count ? `${d.parking_bay_count} (${d.parking_bay_number || 'TBD'})` : 'None' },
        { label: 'Unit Orientation', value: d.unit_orientation },
        { label: 'Ownership Type', value: d.ownership_classification },
        { label: 'Approved Layout Ref', value: d.approved_plan_reference },
        { label: 'Regulatory Approval Memo', value: d.regulatory_approval_memo }
      ];
    } else {
      return [
        { label: 'Revision Code', value: d.revision_code },
        { label: 'Revision Title', value: d.revision_title },
        { label: 'Discipline', value: d.revision_type },
        { label: 'Target Hierarchy Level', value: d.target_level },
        { label: 'Approval Status', value: d.revision_status },
        { label: 'Cost Impact (BDT)', value: this.formatBDT(d.cost_impact_bdt) },
        { label: 'Area Impact (sq ft)', value: d.area_impact_sqft ? `${d.area_impact_sqft} sq ft` : 'N/A' },
        { label: 'Requires Regulatory NOC', value: d.requires_regulatory_approval ? 'YES' : 'NO' },
        { label: 'Regulatory Authority', value: d.regulatory_authority },
        { label: 'Sanction / Memo #', value: d.approval_memo_number },
        { label: 'New Drawing Ref', value: d.drawing_reference_new },
        { label: 'Superseded Drawing Ref', value: d.drawing_reference_old }
      ];
    }
  });

  // UI Formatters
  formatBDT(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) return '৳ 0';
    if (Math.abs(amount) >= 10000000) {
      return `৳ ${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(amount) >= 100000) {
      return `৳ ${(amount / 100000).toFixed(2)} Lakh`;
    }
    return `৳ ${Math.round(amount).toLocaleString('en-IN')}`;
  }

  formatNumber(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString('en-US');
  }

  stageBadgeClass(stage: string | undefined): string {
    switch (stage) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
      case 'AS_BUILT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
      case 'REVISED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
      case 'PROPOSED':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
    }
  }

  statusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'BOOKED':
      case 'SOLD':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      case 'RESERVED':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'ALLOCATED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  }

  revisionStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'APPROVED':
      case 'IMPLEMENTED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      case 'DRAFT':
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  }
}
