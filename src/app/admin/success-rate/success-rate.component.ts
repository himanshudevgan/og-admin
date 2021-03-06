import {AfterViewInit, Component, OnDestroy, OnInit, ViewEncapsulation} from "@angular/core";
import {Datatable} from "../../shared/interfaces/datatable.interface";
import {Script} from "../../shared/services/script.service";
import {FormControl} from "@angular/forms";
import {AdminService} from "../../shared/services/admin.service";
import {MembershipService} from "../../shared/services/membership.service";
import {Subscription} from "rxjs/Subscription";
import {CookieService} from "../../shared/services/cookie.service";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/switchMap";
import {FilterOperators} from "../../shared/interfaces/filter-operators.interface";

declare var moment: any;
declare var jQuery: any;

@Component({
  selector: 'og-success-rate',
  templateUrl: './success-rate.component.html',
  styleUrls: ['./success-rate.component.css', './../search-calc/search-calc.component.css',
    '../../site/components/+analytics/assets/css/daterangepicker.css'],
  encapsulation: ViewEncapsulation.None
})
export class SuccessRateComponent extends Datatable implements OnInit, AfterViewInit, OnDestroy {

  momentJs: any;
  loading = false;
  paymentLoading = false;
  showAdvancedFilter = false;
  scriptLoaded = false;

  company: Array<any> = [];
  input = new FormControl();

  isInvoiceExist = false;
  invoices: any = [];
  invoiceNo: any;

  sortKey = '_id'; // default sort parameters
  sortOrder = -1; // -1 for ascending order

  currentSelectedFilter: any = "";
  filters: Array<any> = []; // represents each filter
  savedFilters: Array<any> = [];
  filtersPostData: Array<any> = [];

  filter = {
    company: ['name', 'number_of_calculators', 'leads', 'last_lead_generated', 'visits', 'sign_up', 'plan', 'appsumo_created', 'conversion_rate',
      'trial', 'next_payment', 'percent_cycle_over', 'request_cancellation', 'billing_unit'],
    app: ['name', 'status', 'created_at', 'latest_publish'],
    user: ['web_session'],

    types: {
      name: 'string',
      number_of_calculators: 'number',
      leads: 'number',
      visits: 'number',
      last_lead_generated: 'date',
      sign_up: 'date',
      plan: 'string',
      appsumo_created: 'bool',
      conversion_rate: 'number',
      trial: 'string',
      next_payment: 'date',
      percent_cycle_over: 'number',
      request_cancellation: 'bool',
      status: 'string',
      created_at: 'date',
      latest_publish: 'date',
      billing_unit: 'string',
      web_session: 'number'
    },

    operators: {
      leads: FilterOperators.numberOperators,
      visits: FilterOperators.numberOperators,
      name: FilterOperators.stringOperators,
      number_of_calculators: FilterOperators.numberOperators,
      sign_up: FilterOperators.numberOperators,
      appsumo_created: ['equals', 'not equal to'],
      plan: FilterOperators.stringOperators,
      status: FilterOperators.stringOperators,
      created_at: FilterOperators.numberOperators,
      latest_publish: FilterOperators.numberOperators,
      conversion_rate: FilterOperators.numberOperators,
      trial: FilterOperators.stringOperators,
      next_payment: FilterOperators.numberOperators,
      percent_cycle_over: FilterOperators.numberOperators,
      request_cancellation: ['equals', 'not equal to'],
      last_lead_generated: FilterOperators.numberOperators,
      billing_unit: FilterOperators.stringOperators,
      web_session: FilterOperators.numberOperators
    },
    selected_property: '', // initially select name
    selected_operator: '',
    select_property_type: '',
    visible: true
  }; // model for a single filter

  public subscriptions: Subscription = new Subscription();
  public sub_role: String = null;

  constructor(public _script: Script, public adminService: AdminService,
              public _membershipService: MembershipService, public _cookieService: CookieService) {
    super();

    this.momentJs = moment;
    if (_cookieService.readCookie('storage')) {
      let storage = JSON.parse(_cookieService.readCookie('storage'));
      this.sub_role = storage.user.sub_role;
    }
  }

  ngOnInit() {
    this.addFilter();

    this.loading = true;
    this.subscriptions.add(this.input.valueChanges.debounceTime(1500).distinctUntilChanged()
      .switchMap(data => {
        super.searchData();
        return this.searchData();
      })
      .subscribe((response) => {
        this.updateCompanySuccessRate(response);
      }, err => this.loading = false));

    this.adminService.getSavedFilters().subscribe(filters => {
      this.savedFilters = filters;
    })

  }

  ngAfterViewInit() {
    this._script.load('datatables', 'daterangepicker')
      .then((data) => {
        this.scriptLoaded = true;
      }).catch((error) => {
      console.log('Script not loaded', error);
    });
  }

  addFilter() {
    this.filters.push(JSON.parse(JSON.stringify(this.filter))); // passing filter by value
    this.filtersPostData.push({}); // initialize an empty request object
  }

  removeFilter(index) {
    this.filters[index].visible = false;
    this.filtersPostData[index] = {};
  }

  onSavedFilterChange() {
    let filter = JSON.parse(this.currentSelectedFilter.filter_string);
    this.filters = [];
    filter.forEach((value, index) => {
      this.addFilter();
      this.filters[index].selected_property = value.property;
      this.filters[index].select_property_category = value.type;
      this.filters[index].selected_operator = value.operator;

      //set post data
      this.filtersPostData[index]['property'] = value.property;
      this.filtersPostData[index]['type'] = value.type;
      this.filtersPostData[index]['operator'] = value.operator;
    });
    this.showAdvancedFilter = true;
  }

  setFilterProperty(target, index) {
    this.filtersPostData[index]['property'] = this.filters[index].selected_property;
    let type = target.options[target.options.selectedIndex].className;
    this.filtersPostData[index]['type'] = type;
    this.filters[index].selected_property_type = type;

    this.filters[index].selected_operator = ''; // reset operator value
  }

  setFilterOperator(value, index) {
    this.filtersPostData[index]['operator'] = value;
    this.filters[index].selected_operator = value;
  }

  setFilterValue(value, index) {
    this.filtersPostData[index]['value'] = [];
    this.filtersPostData[index]['value'][0] = value;
  }

  setDateStart(date: any, index) {
    this.filtersPostData[index]['value'] = [];
    this.filtersPostData[index]['value'][0] = date.start_date;
  }

  setDateRange(date: any, index) {
    this.filtersPostData[index]['value'] = [];
    this.filtersPostData[index]['value'][0] = date.start_date;
    this.filtersPostData[index]['value'][1] = date.end_date;
  }

  getRequestParams(): any {
    return {
      limit: this.current_limit,
      page: this.current_page - 1,
      search_key: this.search,
      sort_order: this.sortOrder,
      sort_key: this.sortKey,
      filter: this.parseFilterData()
    };
  }

  parseFilterData() {
    // filter empty objects
    let filteredData = this.filtersPostData.filter(value =>
      value.property && value.type && value.operator && value.value);

    // group by types - {app:[],company:[]}
    let groupedByData = {};
    for (let i = 0; i < filteredData.length; i++) {
      let current = filteredData[i];

      if (groupedByData[current.type] === undefined) {
        groupedByData[current.type] = [];
      }
      groupedByData[filteredData[i].type].push(current);
    }

    return groupedByData;
  }

  filterResults() {
    super.searchData();
    this.getCompanySuccessData();
  }

  getCompanySuccessData() {
    this.loading = true;

    this.subscriptions.add(this.adminService.getCompanySuccessRate(this.getRequestParams())
      .subscribe((response) => {
        this.updateCompanySuccessRate(response);
      }, err => this.loading = false));
  }

  getPaymentsInfo(companyId) {
    this.paymentLoading = true;
    // get invoices
    this.getInvoices(companyId);
  }

  sort(columnSortKey) {
    this.sortKey = columnSortKey;
    if (this.sortOrder === -1) {
      this.sortOrder = 1;
    } else {
      this.sortOrder = -1;
    }

    super.searchData();
    this.getCompanySuccessData();
  }

  toggleCompanyDetails(company: any) {
    company.showDetails = !company.showDetails;
  }

  showFilter() {
    this.showAdvancedFilter = !this.showAdvancedFilter;
  }

  updateCompanySuccessRate(response: any) {
    this.company = response.successRate;
    this.total_pages = Math.ceil(response.count / this.current_limit);
    this.loading = false;
  }

  saveFilter(filterName, filterDescription) {
    let filteredData = this.filtersPostData.filter(value => {
      return !(Object.keys(value).length === 0);
    });

    let postData = {
      name: filterName.value,
      description: filterDescription.value,
      filterString: JSON.stringify(filteredData)
    };
    this.adminService.saveSuccessRateFilter(postData).subscribe(response => {
      jQuery("#saveFilterModal").modal("hide");
      filterName.value = '';
      filterDescription.value = '';
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getInvoices(companyId) {
    this.invoices = [];
    this.invoiceNo = 0;
    this._membershipService.getInvoices(companyId)
      .subscribe(
        (invoices: any) => {
          this.paymentLoading = false;
          invoices.list.forEach((invoiceList: any) => {
            this.invoiceNo++;
            invoiceList.invoice.invoiceNo = this.invoiceNo;
            this.isInvoiceExist = true;
            // console.log(invoiceList.invoice.id, 'invoice');
            this._membershipService.getInvoicesPdf(invoiceList.invoice.id, companyId)
              .subscribe(
                (data: any) => {
                  // console.log('Get Pdf', data);
                  invoiceList.invoice.href = data.download.download_url;
                  invoiceList.invoice.date = moment.unix(invoiceList.invoice.date).format('DD-MM-YYYY');
                },
                (error: any) => {
                  console.log('Issue in pdf', error);
                }
              );
            this.invoices.push(invoiceList.invoice);
          });
        },
        (error: any) => {
          console.log('Error in getting invoices', error);
        }
      );
  }

  // Check the obj has the keys in the order mentioned. Used for checking JSON results.
  checkObjHasKeys(object, ...keys): boolean {
    return keys.reduce((a, b) => (a || {})[b], object) !== undefined;
  }

  paging(num: number) {
    super.paging(num);
    this.getCompanySuccessData();
  }

  limitChange(event: any) {
    super.limitChange(event);
    this.getCompanySuccessData();
  }

  previous() {
    super.previous();
    this.getCompanySuccessData();
  }

  next() {
    super.next();
    this.getCompanySuccessData();
  }

  searchData() {
    this.loading = true;
    super.searchData();
    return this.adminService.getCompanySuccessRate(this.getRequestParams());
  }
}
