from __future__ import absolute_import, unicode_literals

from django.urls import reverse
from django.utils.translation import ugettext_lazy

from corehq.apps.hqwebapp.decorators import use_select2_v4
from corehq.apps.hqwebapp.async_handler import AsyncHandlerMixin
from corehq.apps.smsbillables.async_handlers import (
    SMSRatesAsyncHandler,
    SMSRatesSelect2AsyncHandler,
    PublicSMSRatesAsyncHandler,
)
from corehq.apps.smsbillables.forms import SMSRateCalculatorForm, PublicSMSRateCalculatorForm
from corehq.apps.domain.views.settings import BaseAdminProjectSettingsView
from corehq.apps.hqwebapp.views import BasePageView
from memoized import memoized


class PublicSMSRatesView(BasePageView, AsyncHandlerMixin):
    urlname = 'public_sms_rates_view'
    page_title = ugettext_lazy("SMS Rate Calculator")
    template_name = 'domain/admin/global_sms_rates.html'
    async_handlers = [PublicSMSRatesAsyncHandler]

    @use_select2_v4
    def dispatch(self, request, *args, **kwargs):
        return super(PublicSMSRatesView, self).dispatch(request, *args, **kwargs)

    @property
    def page_url(self):
        return reverse(self.urlname)

    @property
    def page_context(self):
        return {
            'rate_calc_form': PublicSMSRateCalculatorForm()
        }

    def post(self, request, *args, **kwargs):
        return self.async_response or self.get(request, *args, **kwargs)


class SMSRatesView(BaseAdminProjectSettingsView, AsyncHandlerMixin):
    urlname = 'domain_sms_rates_view'
    page_title = ugettext_lazy("SMS Rate Calculator")
    template_name = 'domain/admin/sms_rates.html'
    async_handlers = [
        SMSRatesAsyncHandler,
        SMSRatesSelect2AsyncHandler,
    ]

    @use_select2_v4
    def dispatch(self, request, *args, **kwargs):
        return super(SMSRatesView, self).dispatch(request, *args, **kwargs)

    @property
    @memoized
    def rate_calc_form(self):
        if self.request.method == 'POST':
            return SMSRateCalculatorForm(self.domain, self.request.POST)
        return SMSRateCalculatorForm(self.domain)

    @property
    def page_context(self):
        return {
            'rate_calc_form': self.rate_calc_form,
        }

    def post(self, request, *args, **kwargs):
        if self.async_response is not None:
            return self.async_response
        return self.get(request, *args, **kwargs)
