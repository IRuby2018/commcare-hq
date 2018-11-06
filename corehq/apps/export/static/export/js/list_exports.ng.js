/* globals Clipboard */
(function (angular, undefined) {
    'use strict';
    // module: hq.list_exports

    /* This module is for helping fetching and showing a list of exports,
     * and activating bulk export download, as well as single export download.
      * */

    var list_exports = angular.module('hq.list_exports', [
        'ngResource',
        'ngRoute',
        'ng.django.rmi',
        'ngMessages',
    ]);

    list_exports.config(['$httpProvider', function ($httpProvider) {
        $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    }]);

    var exportsControllers = {};
    exportsControllers.ListExportsController = function (
        $scope, djangoRMI, bulk_download_url, $rootScope, modelType, $timeout
    ) {
        /**
         * This controller fetches a list of saved exports from
         * subclasses of BaseExportListView.
         *
         * It also generates a list of exports selected for bulk exports.
         */
        $rootScope.pollProgressBar = function (exp) {
            exp.emailedExport.updatingData = false;
            exp.emailedExport.taskStatus = {
                'percentComplete': 0,
                'inProgress': true,
                'success': false,
            };
            var tick = function () {
                djangoRMI.get_saved_export_progress({
                    'export_instance_id': exp.id,
                }).success(function (data) {
                    exp.emailedExport.taskStatus = data.taskStatus;
                    if (!data.taskStatus.success) {
                        // The first few ticks don't yet register the task
                        exp.emailedExport.taskStatus.inProgress = true;
                        $timeout(tick, 1500);
                    } else {
                        exp.emailedExport.taskStatus.justFinished = true;
                    }
                });
            };
            tick();
        };

        $scope._ = _;  // allow use of underscore.js within the template
        $scope.exports = hqImport('hqwebapp/js/initial_page_data').get('exports');
        $scope.bulk_download_url = bulk_download_url;

        $scope.myExports = $scope.exports.filter(function (val) { return !!val.my_export; });
        $scope.notMyExports = $scope.exports.filter(function (val) { return !val.my_export; });
        _.each($scope.exports, function (exp) {
            if (exp.emailedExport && exp.emailedExport.taskStatus.inProgress) {
                $rootScope.pollProgressBar(exp);
            }
        });

        // For Bulk Export
        $scope.showBulkExportDownload = false;
        $scope.bulkExportList = '[]';

        $scope.updateBulkStatus = function () {
            var selectedExports = _.filter($scope.exports, function (exp) {
                return !!exp.addedToBulk;
            });
            $scope.showBulkExportDownload = !_.isEmpty(selectedExports);
            $scope.bulkExportList = JSON.stringify(selectedExports);
            var input = $('input[name="export_list"]');
            input.val(JSON.stringify(selectedExports));

            input.closest("form").attr("action", $scope.bulk_download_url);
        };
        $scope.downloadRequested = function ($event) {
            var $btn = $($event.target);
            $btn.addClass('disabled');
            $btn.text(gettext('Download Requested'));
        };
        $scope.copyLinkRequested = function ($event, export_) {
            export_.showLink = true;
            var clipboard = new Clipboard($event.target, {
                target: function (trigger) {
                    return trigger.nextElementSibling;
                },
            });
            clipboard.onClick($event);
            clipboard.destroy();
        };
        $scope.selectAll = function () {
            _.each($scope.exports, function (exp) {
                exp.addedToBulk = true;
            });
            $scope.updateBulkStatus();
        };
        $scope.selectNone = function () {
            _.each($scope.exports, function (exp) {
                exp.addedToBulk = false;
            });
            $scope.updateBulkStatus();
        };
        $scope.sendExportAnalytics = function () {
            hqImport('analytix/js/kissmetrix').track.event("Clicked Export button");
        };

        $scope.updateEmailedExportData = function (component, exp) {
            $('#modalRefreshExportConfirm-' + exp.id + '-' + (component.groupId ? component.groupId : '')).modal('hide');
            component.updatingData = true;
            djangoRMI.update_emailed_export_data({
                'component': component,
                'export': exp,
            })
                .success(function (data) {
                    if (data.success) {
                        var exportType = hqImport('export/js/utils').capitalize(exp.exportType);
                        hqImport('analytix/js/google').track.event(exportType + " Exports", "Update Saved Export", "Saved");
                        $rootScope.pollProgressBar(exp);
                    }
                });
        };
        $scope.updateDisabledState = function (component, exp) {
            $('#modalEnableDisableAutoRefresh-' + exp.id + '-' + (component.groupId ? component.groupId : '')).modal('hide');
            component.savingAutoRebuildChange = true;
            djangoRMI.toggle_saved_export_enabled_state({
                'component': component,
                'export': exp,
            })
                .success(function (data) {
                    if (data.success) {
                        var exportType = hqImport('export/js/utils').capitalize(exp.exportType);
                        var event = (exp.isAutoRebuildEnabled ? "Disable" : "Enable") + " Saved Export";
                        hqImport('analytix/js/google').track.event(exportType + " Exports", event, "Saved");
                        exp.isAutoRebuildEnabled = data.isAutoRebuildEnabled;
                        component.savingAutoRebuildChange = false;
                    }
                });
        };
        $scope.setFilterModalExport = function (export_) {
            // The filterModalExport is used as context for the FeedFilterFormController
            $rootScope.filterModalExport = export_;
        };
        $scope.isLocationSafeForUser = function (export_) {
            return (!export_.emailedExport) || export_.emailedExport.isLocationSafeForUser;
        };

        trackExportPageEnter();

        /**
         * Send a Kissmetrics event, depending on model type
         */
        function trackExportPageEnter() {
            switch (modelType) {
                case 'form':
                    hqImport('analytix/js/kissmetrix').track.event('Visited Export Forms Page');
                    break;
                case 'case':
                    hqImport('analytix/js/kissmetrix').track.event('Visited Export Cases Page');
                    break;
                default:
                    break;
            }
        }
    };
    exportsControllers.FeedFilterFormController = function (
        $scope, $rootScope, djangoRMI, filterFormElements, filterFormModalElement
    ) {
        var self = {};
        $scope._ = _;   // make underscore.js available
        $scope.formData = {};
        $scope.modelType = null;  // "form" or "case" - corresponding to the type of export selected.
        // A list a location names. The export will be restricted to these locations.
        $scope.locationRestrictions = [];
        $scope.isSubmittingForm = false;
        $scope.hasFormSubmitError = false;
        $scope.formSubmitErrorMessage = null;
        $scope.dateRegex = '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]';
        self.nonPristineExportFilters = {};
        $scope.formElement = filterFormElements;


        $rootScope.$watch("filterModalExport", function (newSelectedExport) {
            if (!newSelectedExport) {
                return;
            }
            if (!(newSelectedExport.id in self.nonPristineExportFilters)) {
                // Mark the form as pristine if we are editing filters of a different export than before
                self.nonPristineExportFilters[newSelectedExport.id] = true;
                $scope.feedFiltersForm.$setPristine();

            }

            $scope.formData = newSelectedExport.emailedExport.filters;
            $scope.locationRestrictions = newSelectedExport.emailedExport.locationRestrictions;
            $scope.modelType = newSelectedExport.exportType;
            // select2s require programmatic update
            $scope.formElement.emwf_case_filter().select2("data", newSelectedExport.emailedExport.filters.emwf_case_filter);
            $scope.formElement.emwf_form_filter().select2("data", newSelectedExport.emailedExport.filters.emwf_form_filter);
        });

        $scope.$watch("formData.date_range", function (newDateRange) {
            if (!newDateRange) {
                $scope.formData.date_range = "since";
            } else {
                self._clearSubmitError();
            }
        });

        $scope.commitFilters = function () {
            var export_ = $rootScope.filterModalExport;
            $scope.isSubmittingForm = true;

            // Put the data from the select2 into the formData object
            if ($scope.modelType === 'form') {
                $scope.formData.emwf_form_filter = $scope.formElement.emwf_form_filter().select2("data");
                $scope.formData.emwf_case_filter = null;
            }
            if ($scope.modelType === 'case') {
                $scope.formData.emwf_case_filter = $scope.formElement.emwf_case_filter().select2("data");
                $scope.formData.emwf_form_filter = null;
            }

            djangoRMI.commit_filters({
                export: export_,
                form_data: $scope.formData,
            }).success(function (data) {
                $scope.isSubmittingForm = false;
                if (data.success) {
                    self._clearSubmitError();
                    export_.emailedExport.filters = $scope.formData;
                    $rootScope.pollProgressBar(export_);
                    filterFormModalElement().modal('hide');
                } else {
                    self._handleSubmitError(data);
                }
            }).error(function (data) {
                $scope.isSubmittingForm = false;
                self._handleSubmitError(data);
            });
        };

        self._handleSubmitError = function (data) {
            $scope.hasFormSubmitError = true;
            $scope.formSubmitErrorMessage = data.error;
        };
        self._clearSubmitError = function () {
            $scope.hasFormSubmitError = false;
            $scope.formSubmitErrorMessage = null;
        };
    };

    list_exports.controller(exportsControllers);

}(window.angular));