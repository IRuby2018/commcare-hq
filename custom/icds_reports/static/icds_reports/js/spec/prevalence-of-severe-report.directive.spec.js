/* global module, inject, _, chai */
"use strict";

var pageData = hqImport('hqwebapp/js/initial_page_data');


describe('Prevalence Of Severe Directive', function () {

    var $scope, $httpBackend, $location, controller, controllermapOrSectorView;

    pageData.registerUrl('icds-ng-template', 'template');
    pageData.registerUrl('prevalence_of_severe', 'prevalence_of_severe');
    pageData.registerUrl('icds_locations', 'icds_locations');

    beforeEach(module('icdsApp', function ($provide) {
        $provide.constant("genders", [
            {id: '', name: 'All'},
            {id: 'M', name: 'Male'},
            {id: 'F', name: 'Female'},
        ]);
        $provide.constant('ages', [
            {id: '', name: 'All'},
            {id: '6', name: '0-6 months'},
            {id: '12', name: '6-12 months'},
            {id: '24', name: '12-24 months'},
            {id: '36', name: '24-36 months'},
            {id: '48', name: '36-48 months'},
            {id: '60', name: '48-60 months'},
            {id: '72', name: '60-72 months'},
        ]);
        $provide.constant("userLocationId", null);
    }));

    beforeEach(inject(function ($rootScope, $compile, _$httpBackend_, _$location_) {
        $scope = $rootScope.$new();
        $httpBackend = _$httpBackend_;
        $location = _$location_;

        $httpBackend.expectGET('template').respond(200, '<div></div>');
        $httpBackend.expectGET('prevalence_of_severe').respond(200, {
            report_data: ['report_test_data'],
        });
        var element = window.angular.element("<prevalence-of-severe data='test'></prevalence-of-severe>");
        var compiled = $compile(element)($scope);
        var mapOrSectorViewElement = window.angular.element("<map-or-sector-view data='test'></map-or-sector-view>");
        var mapOrSectorViewCompiled = $compile(mapOrSectorViewElement)($scope);

        $httpBackend.flush();
        $scope.$digest();
        controller = compiled.controller('prevalenceOfSevere');
        controller.step = 'map';
        controllermapOrSectorView = mapOrSectorViewCompiled.controller('mapOrSectorView');
        controllermapOrSectorView.data = {
            "mapData": {
                "tooltips_data": {
                    "Morena -R": {
                        "in_month": 0,
                        "all": 0,
                    },
                    "Porsa": {
                        "in_month": 0,
                        "all": 0,
                    },
                    "Morena-U": {
                        "in_month": 0,
                        "all": 0,
                    },
                    "Ambah": {
                        "in_month": 0,
                        "all": 25,
                    },
                },
            },
        };
    }));

    it('tests instantiate the controller properly', function () {
        chai.expect(controller).not.to.be.a('undefined');
    });

    it('tests initial state', function () {
        assert.equal(controller.mode, 'map');
        assert.equal(controller.steps['map'].label, 'Map View: National');
        assert.deepEqual(controller.filtersData, {});
    });

    it('tests supervisor location', function () {
        controller.filtersData.location_id = 'test-id';
        controller.userLocationId = 'test-id';

        $httpBackend.expectGET('icds_locations?location_id=test-id').respond(200, {location_type: 'supervisor'});
        $httpBackend.expectGET('prevalence_of_severe?location_id=test-id').respond(200, {
            report_data: ['report_test_data'],
        });
        controller.init();
        $httpBackend.flush();
        assert.equal(controller.mode, 'sector');
        assert.equal(controller.steps['map'].label, 'Sector View');
        assert.deepEqual(controller.data.mapData, ['report_test_data']);
    });

    it('tests non supervisor location', function () {
        controller.filtersData.location_id = 'test-id';
        controller.userLocationId = 'test-id';

        $httpBackend.expectGET('icds_locations?location_id=test-id').respond(200, {location_type: 'non supervisor'});
        $httpBackend.expectGET('prevalence_of_severe?location_id=test-id').respond(200, {
            report_data: ['report_test_data'],
        });
        controller.init();
        $httpBackend.flush();
        assert.equal(controller.mode, 'map');
        assert.equal(controller.steps['map'].label, 'Map View: Non supervisor');
        assert.deepEqual(controller.data.mapData, ['report_test_data']);
    });

    it('tests template popup', function () {
        var result = controller.templatePopup({properties: {name: 'test'}}, {total_height_eligible: 30, total_weighed: 20, total_measured: 15, severe: 5, moderate: 5, normal: 5});
        assert.equal(result, '<div class="hoverinfo" style="max-width: 200px !important; white-space: normal;">' +
            '<p>test</p>' +
            '<div>Total Children (6 - 60 months) weighed in given month: <strong>20</strong></div>' +
            '<div>Total Children (6 - 60 months) with height measured in given month: <strong>15</strong></div>' +
            '<div>Number of Children (6 - 60 months) unmeasured: <strong>15</strong></div>' +
            '<div>% Severely Acute Malnutrition (6 - 60 months): <strong>33.33%</strong></div>' +
            '<div>% Moderately Acute Malnutrition (6 - 60 months): <strong>33.33%</strong></div>' +
            '<div>% Normal (6 - 60 months): <strong>33.33%</strong></div>');
    });

    it('tests location change', function () {
        controller.init();
        controller.selectedLocations.push(
            {name: 'name1', location_id: 'test_id1'},
            {name: 'name2', location_id: 'test_id2'},
            {name: 'name3', location_id: 'test_id3'},
            {name: 'name4', location_id: 'test_id4'},
            {name: 'name5', location_id: 'test_id5'},
            {name: 'name6', location_id: 'test_id6'}
        );
        $httpBackend.expectGET('prevalence_of_severe').respond(200, {
            report_data: ['report_test_data'],
        });
        $scope.$digest();
        $httpBackend.flush();
        assert.equal($location.search().location_id, 'test_id4');
        assert.equal($location.search().selectedLocationLevel, 3);
        assert.equal($location.search().location_name, 'name4');
    });

    it('tests moveToLocation national', function () {
        controller.moveToLocation('national', -1);

        var searchData = $location.search();

        assert.equal(searchData.location_id, '');
        assert.equal(searchData.selectedLocationLevel, -1);
        assert.equal(searchData.location_name, '');
    });

    it('tests moveToLocation not national', function () {
        controller.moveToLocation({location_id: 'test-id', name: 'name'}, 3);

        var searchData = $location.search();

        assert.equal(searchData.location_id, 'test-id');
        assert.equal(searchData.selectedLocationLevel, 3);
        assert.equal(searchData.location_name, 'name');
    });

    it('tests show all locations', function () {
        controller.all_locations.push(
            {name: 'name1', location_id: 'test_id1'}
        );
        var locations = controller.showAllLocations();
        assert.equal(locations, true);
    });

    it('tests not show all locations', function () {
        controller.all_locations.push(
            {name: 'name1', location_id: 'test_id1'},
            {name: 'name2', location_id: 'test_id2'},
            {name: 'name3', location_id: 'test_id3'},
            {name: 'name4', location_id: 'test_id4'},
            {name: 'name5', location_id: 'test_id5'},
            {name: 'name6', location_id: 'test_id6'},
            {name: 'name7', location_id: 'test_id7'},
            {name: 'name8', location_id: 'test_id8'},
            {name: 'name9', location_id: 'test_id9'},
            {name: 'name10', location_id: 'test_id10'}
        );
        var locations = controller.showAllLocations();
        assert.equal(locations, false);
    });

    it('tests chart options', function () {
        var chart = controller.chartOptions.chart;
        var caption = controller.chartOptions.caption;
        assert.notEqual(chart, null);
        assert.notEqual(caption, null);
        assert.equal(controller.chartOptions.chart.type, 'lineChart');
        assert.deepEqual(controller.chartOptions.chart.margin, {
            top: 20,
            right: 60,
            bottom: 60,
            left: 80,
        });
        assert.equal(controller.chartOptions.chart.clipVoronoi, false);
        assert.equal(controller.chartOptions.chart.xAxis.axisLabel, '');
        assert.equal(controller.chartOptions.chart.xAxis.showMaxMin, true);
        assert.equal(controller.chartOptions.chart.xAxis.axisLabelDistance, -100);
        assert.equal(controller.chartOptions.chart.yAxis.axisLabel, '');
        assert.equal(controller.chartOptions.chart.yAxis.axisLabelDistance, 20);
        assert.equal(controller.chartOptions.caption.enable, true);
        assert.deepEqual(controller.chartOptions.caption.css, {
            'text-align': 'center',
            'margin': '0 auto',
            'width': '900px',
        });
        assert.equal(controller.chartOptions.caption.html,
            '<i class="fa fa-info-circle"></i> ' +
            'Percentage of children between (6 - 60 months) enrolled for Anganwadi Services with weight-for-height below -2 standard deviations of the WHO Child Growth Standards median. \n' +
            '\n' +
            'Wasting in children is a symptom of acute undernutrition usually as a consequence\n' +
            'of insufficient food intake or a high incidence of infectious diseases. Severe Acute Malnutrition (SAM) is nutritional status for a child who has severe wasting (weight-for-height) below -3 Z and Moderate Acute Malnutrition (MAM) is nutritional status for a child that has moderate wasting (weight-for-height) below -2Z.'
        );
    });

    it('tests chart tooltip content', function () {
        var month = {value: "Jul 2017", series: []};

        var expected = '<p><strong>Jul 2017</strong></p><br/>' +
            '<div>Total Children (6 - 60 months) weighed in given month: <strong>20</strong></div>' +
            '<div>Total Children (6 - 60 months) with height measured in given month: <strong>10</strong></div>' +
            '<div>Number of Children (6 - 60 months) unmeasured: <strong>20</strong></div>' +
            '<div>% children (6 - 60 months)  with Normal Acute Malnutrition: <strong>10.00%</strong></div>' +
            '<div>% children (6 - 60 months)  with Moderate Acute Malnutrition (MAM): <strong>15.00%</strong></div>' +
            '<div>% children (6 - 60 months)  with Severe Acute Malnutrition (SAM): <strong>20.00%</strong></div>';

        var result = controller.tooltipContent(month.value, 0.1, 0.15, 0.2, 20, 10, 30);
        assert.equal(expected, result);
    });

    it('tests horizontal chart tooltip content', function () {
        var d = {
            "data": [
                "Ambah",
                0
            ],
            "index": 0,
            "color": "rgb(0, 111, 223)",
            "value": "Ambah",
            "series": [
                {
                    "key": "",
                    "value": 0,
                    "color": "rgb(0, 111, 223)"
                }
            ]
        };

        var expected = 'templatePopup';

        var r = controllermapOrSectorView.chartOptions.chart.tooltip.hasOwnProperty('contentGenerator');
        assert.equal(true, r);
        controllermapOrSectorView.templatePopup = function (d) {
            return 'templatePopup';
        };
        var result = controllermapOrSectorView.chartOptions.chart.tooltip.contentGenerator(d);
        assert.equal(expected, result);
    });

    it('tests disable locations for user', function () {
        controller.userLocationId = 'test_id4';
        controller.location = {name: 'name4', location_id: 'test_id4'};
        controller.selectedLocations.push(
            {name: 'name1', location_id: 'test_id1'},
            {name: 'name2', location_id: 'test_id2'},
            {name: 'name3', location_id: 'test_id3'},
            {name: 'name4', location_id: 'test_id4'},
            {name: 'name5', location_id: 'test_id5'},
            {name: 'name6', location_id: 'test_id6'}
        );
        var index = controller.getDisableIndex();
        assert.equal(index, 3);
    });

    it('tests reset additional filters', function () {
        controller.filtersData.gender = 'test';
        controller.filtersData.age = 'test';
        controller.resetAdditionalFilter();

        assert.equal(controller.filtersData.gender, null);
        assert.equal(controller.filtersData.age, null);
    });

    it('tests reset only age additional filters', function () {
        controller.filtersData.gender = 'test';

        controller.resetOnlyAgeAdditionalFilter();
        assert.equal(controller.filtersData.gender, 'test');
        assert.equal(controller.filtersData.age, null);
    });
});
