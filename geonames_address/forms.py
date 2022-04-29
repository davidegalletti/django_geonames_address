# -*- coding: utf-8 -*-
from django import forms


class MunicipalityInput(forms.Widget):
    template_name = 'geonames_address/widgets/municipality.html'

    def __init__(self, attrs=None):
        super(MunicipalityInput, self).__init__(attrs)

    def render(self, name, value, attrs=None, renderer=None):
        """
        Returns this Widget rendered as HTML, as a Unicode string.
        """
        context = self.get_context(name, value, attrs)
        if value is not None:
            context['country'] = (value.country if hasattr(value, 'country') else None)
            context['instance_id'] = value.id
            context['instance_name'] = value.name
            if hasattr(value, 'country') and value.country.code == "IT" and value.adm2 is not None:
                context['instance_name'] = ("%s ( %s )" % (value.name, value.adm2.code))
            if hasattr(value, 'it_codice_catastale'):
                if value.it_codice_catastale:
                    context['codice_catastale'] = value.it_codice_catastale
            if hasattr(value, 'country') and value.country.nationalidentificationcodetype_set.count() > 0:
                # TODO: we start with just one, make it a list and manage the choice of the type
                context['nic_type'] = value.country.nationalidentificationcodetype_set.all()[0].name
                context['nic_mask'] = value.country.nationalidentificationcodetype_set.all()[0].input_mask
        else:
            context['hide_secondary_field'] = True
        return self._render(self.template_name, context, renderer)


class NICInput(forms.Widget):
    template_name = 'geonames_address/widgets/nic.html'

    def __init__(self, attrs=None):
        super(NICInput, self).__init__(attrs)
