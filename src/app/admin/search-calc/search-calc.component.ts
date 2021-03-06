import {Component, OnInit, ViewEncapsulation} from "@angular/core";
import {Datatable} from "../../shared/interfaces/datatable.interface";
import {AdminService} from "../../shared/services/admin.service";
import {FormControl} from "@angular/forms";
import {CookieService, Script} from "../../shared/services";
import {Angular2Csv} from 'angular2-csv/Angular2-csv';

declare var moment;
declare var jQuery;
declare var document;


@Component({
  selector: 'og-search-calc',
  templateUrl: './search-calc.component.html',
  styleUrls: ['./search-calc.component.css', './../success-rate/success-rate.component.css',
    '../../site/components/+analytics/assets/css/daterangepicker.css'],
  encapsulation: ViewEncapsulation.None,
})
export class SearchCalcComponent extends Datatable implements OnInit {

  apps: Array<any> = [];
  loading = true;
  onlyLive: boolean = false;
  showAdvancedFilter = false;
  fetchAll: boolean = false;
  analyticsUpdateStatus = "";
  value: any;
  selectedApp: any;
  errorMessage: any = '';
  companyDetails: any;
  filters: any = [];
  totalApps: number = 0;
  createdAtFilter: any = {
    start_date: moment("1970-01-01").format('YYYY-MM-DD'), //start of time
    end_date: moment().add(1, 'day').format('YYYY-MM-DD')
  };
  sortKey = '_id'; // default sort parameters
  sortOrder = -1; // -1 for ascending order

  templates: Array<any> = [{id: 'template-eight', text: 'The Venice'},
    {id: 'template-seven', text: 'The Seattle'}, {id: 'one-page-card-new', text: 'The Chicago'},
    {id: 'sound-cloud-v3', text: 'The Londoner'}, {id: 'inline-temp-new', text: 'The Greek'},
    {id: 'experian', text: 'The Tokyo'}, {id: 'template-five', text: 'The Madrid'},
    {id: 'template-six', text: 'The Stockholm'}];

  templateTypes: Array<string> = ['Recommendation', 'Numerical', 'Graded', 'Poll'];

  filter = {
    company: ['sub_domain'],
    app: ['header', 'sub_header'],
    template: ['layouts and experiences'],

    selected_property: '',
    selected_operator: '',
    selected_property_category: '',
    selected_property_type: '',
    selected_value: {},
    visible: true,
  };
  operators = {
    string: ['contains']
  };

  searchCalc = new FormControl();
  public sub_role: string = null;

  constructor(private adminService: AdminService,
              private scriptService: Script,
              private _cookieService: CookieService) {

    super();
    if (_cookieService.readCookie('storage')) {
      let storage = JSON.parse(_cookieService.readCookie('storage'));
      this.sub_role = storage.user.sub_role;
    }
  }

  async ngOnInit() {
    await this.scriptService.load('daterangepicker', 'datatables');
    this.addFilter();
    this.searchApps();

    let self = this;
    document.getElementById('keyword')
      .addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
          self.current_page = 1;
          self.searchData().subscribe(data => self.showApps(data));
        }
      });
  }

  addFilter() {
    this.filters.push(Object.assign({}, this.filter)); // passing filter by value
  }

  removeFilter(index) {
    this.filters[index].visible = false;
  }

  filterResults() {
    super.searchData();
    this.searchApps();
  }

  clearFilters() {
    this.filters.forEach(filter => filter.visible = false);
  }

  searchApps(): any {
    this.searchData().subscribe((response: any) => {
      this.showApps(response);
    }, err => {
      this.loading = false
    });
  }

  parseFilterData() {
    return this.filters.filter(el => el.visible && el.selected_property &&
      el.selected_property_category && el.selected_property_type && el.selected_value)
      .map(el => {
        let val = {
          property: el.selected_property,
          type: el.selected_property_category,
          value: el.selected_value
        };
        if (val.type === 'template') {

          if (val.value.template.includes('all')) {
            val.value.template = [];
            this.templates.forEach(template => {
              val.value.template.push(template.id);
            });

          }
          if (val.value.templateType && val.value.templateType.includes('all')) {

            val.value.templateType = [];
            this.templateTypes.forEach(type => {
              val.value.templateType.push(type);
            });
          }
        }
        return val;
      });
  }

  getParams(getAll?: boolean): any {
    return {
      limit: getAll ? null : this.current_limit,
      search_key: this.search,
      page: getAll ? null : (this.current_page - 1),
      only_live: this.onlyLive,
      filter: this.parseFilterData(),
      created_at_filter: this.createdAtFilter,
      sort_key: this.sortKey,
      sort_order: this.sortOrder
    };
  }

  removed(event, index, type) {
    if (event === 'all') {
      this.filters[index].selected_value[type] = [];
    }
    let i = this.filters[index].selected_value[type].indexOf(event);
    this.filters[index].selected_value[type].splice(i, 1);
  }

  selected(event, index, type) {
    if (typeof this.filters[index].selected_value === 'string') {
      this.filters[index].selected_value = {};
    }
    if (!Array.isArray(this.filters[index].selected_value[type])) {
      this.filters[index].selected_value[type] = [];
    }
    this.filters[index].selected_value[type].push(event.id);
  }

  onDateSelect(date: any) {
    this.createdAtFilter.start_date = date.start_date;
    this.createdAtFilter.end_date = date.end_date
  }

  showApps(response: any) {
    this.apps = response.apps;
    this.totalApps = response.count;
    this.total_pages = Math.ceil(this.totalApps / this.current_limit);

    for (let i = 0; i < this.apps.length; i++) {
      this.apps[i].createdAt = moment(this.apps[i].createdAt).fromNow().trim();
      this.apps[i].updatedAt = moment(this.apps[i].updatedAt).fromNow().trim();
      if (this.apps[i].analytics) {
        this.apps[i].analytics.updatedAt = moment(this.apps[i].analytics.updatedAt).fromNow().trim();
      }
      else {
        this.apps[i].analytics = {};
        this.apps[i].analytics['updatedAt'] = 'Not Modified';
      }
    }
    this.loading = false;
  }

  sort(columnSortKey) {
    this.sortKey = columnSortKey;
    if (this.sortOrder === -1) {
      this.sortOrder = 1;
    } else {
      this.sortOrder = -1;
    }
    super.searchData();
    this.searchApps();
  }

  updateAnalytics() {
    this.adminService.updateAppsAnalytics().subscribe(data =>
      this.analyticsUpdateStatus = "success", err => this.analyticsUpdateStatus = "failed");
  }

  paging(num: number) {
    super.paging(num);
    this.searchApps();
  }

  limitChange(event: any) {
    super.limitChange(event);
    this.searchApps();
  }

  previous() {
    super.previous();
    this.searchApps();
  }

  next() {
    super.next();
    this.searchApps();
  }

  searchData() {
    this.loading = true;
    return this.adminService.getApps(this.getParams());
  }

  fetchLiveCalc() {
    this.onlyLive = !this.onlyLive;
    this.searchApps()
  }

  setFilterProperty(target, index) {
    this.filters[index].selected_property_category = target.options[target.options.selectedIndex].className;
    this.filters[index].selected_property_type = 'string';
    this.filters[index].selected_operator = ''; // reset operator value
    this.filters[index].selected_value = ''; // reset selected value
  }

  getTemplateName(template) {
    return this.templates.find(t => t.id.includes(template));
  }

  setFilterOperator(value, index) {
    this.filters[index].selected_operator = value;
  }

  setApp(app) {
    this.selectedApp = app;
    (this.companyDetails && Object.keys(this.companyDetails).length > 0) && (this.companyDetails = {});
  }

  searchCompany(company) {
    this.errorMessage = '';
    if (company) {

      this.adminService.searchCompany(company.trim()).subscribe((data) => {
        this.companyDetails = data;
        this.companyDetails['check'] = false;
        this.errorMessage = 'no_error';
      }, (error: any) => {
        this.errorMessage = error.error.err_message;
      });
    } else {
      this.errorMessage = 'Enter company name';
    }
  }
  duplicateApp(event,app,company) {

    console.log(event.target.disabled,app,company);
    this.changeButtonState(event);
    this.adminService.duplicateApp({appData:app,company_id:company._id}).subscribe((data)=>{
      console.log(data);
      this.changeButtonState(event);
      jQuery('#copyCalc').modal('hide');
    }, (error) => {
      this.changeButtonState(event);
      this.errorMessage = error.error.err_message;
    })
  }
  changeButtonState(event){
    event.target.disabled = !event.target.disabled;
  }
  exportToCSV() {
    this.adminService.getApps(this.getParams(this.fetchAll)).subscribe(({apps}) => {
      let data = apps.map(app => {

        return {
        url: app.url,
        status: app.status,
        subdomain: app.company.sub_domain,
          template: this.getTemplateName(app.template) ? this.getTemplateName(app.template).text : '',
        templateType: app.templateType
      }
    });

    const options = {
      headers: ['url', 'status', 'sub domain', 'Layout', 'Experience']
    };
    new Angular2Csv(data, 'apps', options);
    });
  }
}
