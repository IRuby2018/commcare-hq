from __future__ import absolute_import

from __future__ import unicode_literals
from django.conf import settings
from django.conf.urls import url, include
from django.contrib.auth.views import (
    password_change,
    password_change_done,
    password_reset_complete,
    password_reset_done,
    password_reset,
)
from django.utils.translation import ugettext as _
from django.views.generic import RedirectView

from corehq.apps.callcenter.views import CallCenterOwnerOptionsView
from corehq.apps.domain.forms import ConfidentialPasswordResetForm, HQSetPasswordForm
from corehq.apps.domain.views.settings import (
    CaseSearchConfigView,
    DefaultProjectSettingsView,
    EditBasicProjectInfoView,
    EditMyProjectSettingsView,
    EditOpenClinicaSettingsView,
    EditPrivacySecurityView,
    FeaturePreviewsView,
    ManageProjectMediaView,
    PasswordResetView,
    RecoveryMeasuresHistory,
)
from corehq.apps.domain.views.accounting import (
    BillingStatementPdfView,
    BulkStripePaymentView,
    CardView,
    CardsView,
    ConfirmBillingAccountInfoView,
    ConfirmSelectedPlanView,
    ConfirmSubscriptionRenewalView,
    CreditsStripePaymentView,
    CreditsWireInvoiceView,
    DomainBillingStatementsView,
    DomainSubscriptionView,
    EditExistingBillingAccountView,
    EmailOnDowngradeView,
    InternalSubscriptionManagementView,
    InvoiceStripePaymentView,
    SelectedEnterprisePlanView,
    SelectedAnnualPlanView,
    SelectPlanView,
    SubscriptionRenewalView,
    WireInvoiceView,
)
from corehq.apps.domain.views.base import select
from corehq.apps.domain.views.exchange import (
    ExchangeSnapshotsView,
    CreateNewExchangeSnapshotView,
    set_published_snapshot,
)
from corehq.apps.domain.views.fixtures import CalendarFixtureConfigView, LocationFixtureConfigView
from corehq.apps.domain.views.internal import (
    ActivateTransferDomainView,
    DeactivateTransferDomainView,
    EditInternalCalculationsView,
    EditInternalDomainInfoView,
    FlagsAndPrivilegesView,
    TransferDomainView,
    calculated_properties,
    toggle_diff,
)
from corehq.apps.domain.views.pro_bono import ProBonoView
from corehq.apps.domain.views.repeaters import generate_repeater_payloads
from corehq.apps.domain.views.sms import SMSRatesView
from corehq.apps.linked_domain.views import DomainLinkView
from corehq.apps.reports.dispatcher import DomainReportDispatcher
from corehq.motech.repeaters.views import (
    AddCaseRepeaterView,
    AddFormRepeaterView,
    AddRepeaterView,
    DomainForwardingOptionsView,
    EditCaseRepeaterView,
    EditFormRepeaterView,
    EditOpenmrsRepeaterView,
    EditRepeaterView,
    RepeatRecordView,
    cancel_repeat_record,
    drop_repeater,
    pause_repeater,
    requeue_repeat_record,
    resume_repeater,
    test_repeater,
)
from corehq.motech.repeaters.views.repeaters import EditDhis2RepeaterView

urlpatterns = [
    url(r'^domain/select/$', select, name='domain_select'),
    url(r'^domain/select_redirect/$', select, {'do_not_redirect': True}, name='domain_select_redirect'),
    url(r'^domain/transfer/(?P<guid>\w+)/activate$',
        ActivateTransferDomainView.as_view(), name='activate_transfer_domain'),
    url(r'^domain/transfer/(?P<guid>\w+)/deactivate$',
        DeactivateTransferDomainView.as_view(), name='deactivate_transfer_domain'),

    url(r'^accounts/password_change/$', password_change,
        {'template_name': 'login_and_password/password_change_form.html'},
        name='password_change'),
    url(r'^accounts/password_change_done/$', password_change_done,
        {'template_name': 'login_and_password/password_change_done.html',
         'extra_context': {'current_page': {'page_name': _('Password Change Complete')}}},
        name='password_change_done'),

    url(r'^accounts/password_reset_email/$', password_reset,
        {'template_name': 'login_and_password/password_reset_form.html',
         'password_reset_form': ConfidentialPasswordResetForm, 'from_email': settings.DEFAULT_FROM_EMAIL,
         'extra_context': {'current_page': {'page_name': _('Password Reset')}}},
        name='password_reset_email'),
    url(r'^accounts/password_reset_email/done/$', password_reset_done,
        {'template_name': 'login_and_password/password_reset_done.html',
         'extra_context': {'current_page': {'page_name': _('Reset My Password')}}},
        name='password_reset_done'),

    url(r'^accounts/password_reset_confirm/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>.+)/$',
        PasswordResetView.as_view(),
        {'template_name': 'login_and_password/password_reset_confirm.html', 'set_password_form': HQSetPasswordForm,
         'extra_context': {'current_page': {'page_name': _('Password Reset Confirmation')}}},
        name=PasswordResetView.urlname),
    url(r'^accounts/password_reset_confirm/done/$', password_reset_complete,
        {'template_name': 'login_and_password/password_reset_complete.html',
         'extra_context': {'current_page': {'page_name': _('Password Reset Complete')}}},
        name='password_reset_complete')
]


domain_settings = [
    url(r'^$', DefaultProjectSettingsView.as_view(), name=DefaultProjectSettingsView.urlname),
    url(r'^my_settings/$', EditMyProjectSettingsView.as_view(), name=EditMyProjectSettingsView.urlname),
    url(r'^basic/$', EditBasicProjectInfoView.as_view(), name=EditBasicProjectInfoView.urlname),
    url(r'^call_center_owner_options/', CallCenterOwnerOptionsView.as_view(),
        name=CallCenterOwnerOptionsView.url_name),
    url(r'^privacy/$', EditPrivacySecurityView.as_view(), name=EditPrivacySecurityView.urlname),
    url(r'^openclinica/$', EditOpenClinicaSettingsView.as_view(), name=EditOpenClinicaSettingsView.urlname),
    url(r'^subscription/change/$', SelectPlanView.as_view(), name=SelectPlanView.urlname),
    url(r'^subscription/change/confirm/$', ConfirmSelectedPlanView.as_view(),
        name=ConfirmSelectedPlanView.urlname),
    url(r'^subscription/change/request/$', SelectedEnterprisePlanView.as_view(),
        name=SelectedEnterprisePlanView.urlname),
    url(r'^subscription/change/request_annual/$', SelectedAnnualPlanView.as_view(),
        name=SelectedAnnualPlanView.urlname),
    url(r'^subscription/change/account/$', ConfirmBillingAccountInfoView.as_view(),
        name=ConfirmBillingAccountInfoView.urlname),
    url(r'^subscription/change/email/$', EmailOnDowngradeView.as_view(), name=EmailOnDowngradeView.urlname),
    url(r'^subscription/pro_bono/$', ProBonoView.as_view(), name=ProBonoView.urlname),
    url(r'^subscription/credits/make_payment/$', CreditsStripePaymentView.as_view(),
        name=CreditsStripePaymentView.urlname),
    url(r'^subscription/credis/make_wire_payment/$', CreditsWireInvoiceView.as_view(),
        name=CreditsWireInvoiceView.urlname),
    url(r'^billing/statements/download/(?P<statement_id>[\w-]+).pdf$',
        BillingStatementPdfView.as_view(),
        name=BillingStatementPdfView.urlname),
    url(r'^billing/statements/$', DomainBillingStatementsView.as_view(),
        name=DomainBillingStatementsView.urlname),
    url(r'^billing/make_payment/$', InvoiceStripePaymentView.as_view(),
        name=InvoiceStripePaymentView.urlname),
    url(r'^billing/make_bulk_payment/$', BulkStripePaymentView.as_view(),
        name=BulkStripePaymentView.urlname),
    url(r'^billing/make_wire_invoice/$', WireInvoiceView.as_view(),
        name=WireInvoiceView.urlname),
    url(r'^billing/cards/$', CardsView.as_view(), name=CardsView.url_name),
    url(r'^billing/cards/(?P<card_token>card_[\w]+)/$', CardView.as_view(), name=CardView.url_name),
    url(r'^subscription/$', DomainSubscriptionView.as_view(), name=DomainSubscriptionView.urlname),
    url(r'^subscription/renew/$', SubscriptionRenewalView.as_view(),
        name=SubscriptionRenewalView.urlname),
    url(r'^subscription/renew/confirm/$', ConfirmSubscriptionRenewalView.as_view(),
        name=ConfirmSubscriptionRenewalView.urlname),
    url(r'^internal_subscription_management/$', InternalSubscriptionManagementView.as_view(),
        name=InternalSubscriptionManagementView.urlname),
    url(r'^billing_information/$', EditExistingBillingAccountView.as_view(),
        name=EditExistingBillingAccountView.urlname),
    url(r'^repeat_record/', RepeatRecordView.as_view(), name=RepeatRecordView.urlname),
    url(r'^repeat_record_report/cancel/', cancel_repeat_record, name='cancel_repeat_record'),
    url(r'^repeat_record_report/requeue/', requeue_repeat_record, name='requeue_repeat_record'),
    url(r'^repeat_record_report/generate_repeater_payloads/', generate_repeater_payloads,
        name='generate_repeater_payloads'),
    url(r'^integration/', include('corehq.apps.integration.urls')),
    url(r'^forwarding/$', DomainForwardingOptionsView.as_view(), name=DomainForwardingOptionsView.urlname),
    url(r'^forwarding/new/FormRepeater/$', AddFormRepeaterView.as_view(), {'repeater_type': 'FormRepeater'},
        name=AddFormRepeaterView.urlname),
    url(r'^forwarding/new/CaseRepeater/$', AddCaseRepeaterView.as_view(), {'repeater_type': 'CaseRepeater'},
        name=AddCaseRepeaterView.urlname),
    url(r'^forwarding/new/(?P<repeater_type>\w+)/$', AddRepeaterView.as_view(), name=AddRepeaterView.urlname),
    url(r'^forwarding/test/$', test_repeater, name='test_repeater'),

    url(r'^forwarding/CaseRepeater/edit/(?P<repeater_id>\w+)/$', EditCaseRepeaterView.as_view(),
        {'repeater_type': 'CaseRepeater'}, name=EditCaseRepeaterView.urlname),
    url(r'^forwarding/FormRepeater/edit/(?P<repeater_id>\w+)/$', EditFormRepeaterView.as_view(),
        {'repeater_type': 'FormRepeater'}, name=EditFormRepeaterView.urlname),
    url(r'^forwarding/OpenmrsRepeater/edit/(?P<repeater_id>\w+)/$', EditOpenmrsRepeaterView.as_view(),
        {'repeater_type': 'OpenmrsRepeater'}, name=EditOpenmrsRepeaterView.urlname),
    url(r'^forwarding/Dhis2Repeater/edit/(?P<repeater_id>\w+)/$', EditDhis2RepeaterView.as_view(),
        {'repeater_type': 'Dhis2Repeater'}, name=EditDhis2RepeaterView.urlname),
    url(r'^forwarding/(?P<repeater_type>\w+)/edit/(?P<repeater_id>\w+)/$', EditRepeaterView.as_view(),
        name=EditRepeaterView.urlname),

    url(r'^forwarding/(?P<repeater_id>[\w-]+)/stop/$', drop_repeater, name='drop_repeater'),
    url(r'^forwarding/(?P<repeater_id>[\w-]+)/pause/$', pause_repeater, name='pause_repeater'),
    url(r'^forwarding/(?P<repeater_id>[\w-]+)/resume/$', resume_repeater, name='resume_repeater'),
    url(r'^snapshots/set_published/(?P<snapshot_name>[\w-]+)/$', set_published_snapshot, name='domain_set_published'),
    url(r'^snapshots/set_published/$', set_published_snapshot, name='domain_clear_published'),
    url(r'^snapshots/$', ExchangeSnapshotsView.as_view(), name=ExchangeSnapshotsView.urlname),
    url(r'^transfer/$', TransferDomainView.as_view(), name=TransferDomainView.urlname),
    url(r'^snapshots/new/$', CreateNewExchangeSnapshotView.as_view(), name=CreateNewExchangeSnapshotView.urlname),
    url(r'^multimedia/$', ManageProjectMediaView.as_view(), name=ManageProjectMediaView.urlname),
    url(r'^case_search/$', CaseSearchConfigView.as_view(), name=CaseSearchConfigView.urlname),
    url(r'^domain_links/$', DomainLinkView.as_view(), name=DomainLinkView.urlname),
    url(r'^calendar_settings/$', CalendarFixtureConfigView.as_view(), name=CalendarFixtureConfigView.urlname),
    url(r'^location_settings/$', LocationFixtureConfigView.as_view(), name=LocationFixtureConfigView.urlname),
    url(r'^commtrack/settings/$', RedirectView.as_view(url='commtrack_settings', permanent=True)),
    url(r'^internal/info/$', EditInternalDomainInfoView.as_view(), name=EditInternalDomainInfoView.urlname),
    url(r'^internal/calculations/$', EditInternalCalculationsView.as_view(), name=EditInternalCalculationsView.urlname),
    url(r'^internal/calculated_properties/$', calculated_properties, name='calculated_properties'),
    url(r'^previews/$', FeaturePreviewsView.as_view(), name=FeaturePreviewsView.urlname),
    url(r'^flags/$', FlagsAndPrivilegesView.as_view(), name=FlagsAndPrivilegesView.urlname),
    url(r'^toggle_diff/$', toggle_diff, name='toggle_diff'),
    url(r'^sms_rates/$', SMSRatesView.as_view(), name=SMSRatesView.urlname),
    url(r'^recovery_measures_history/$',
        RecoveryMeasuresHistory.as_view(),
        name=RecoveryMeasuresHistory.urlname),

    DomainReportDispatcher.url_pattern()
]
