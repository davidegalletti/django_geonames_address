# -*- coding: utf-8 -*-
import logging
import re

from stdnum.dk.cpr import validate as dk_cpr_validate
from stdnum.dk.cpr import compact as dk_cpr_compact
from stdnum.nl.bsn import validate as nl_bsn_validate
from stdnum.nl.bsn import compact as nl_bsn_compact
from stdnum.hr.oib import validate as hr_oib_validate
from stdnum.hr.oib import compact as hr_oib_compact
from stdnum.de.idnr import validate as de_idnr_validate
from stdnum.de.idnr import compact as de_idnr_compact
from stdnum.ch.ssn import validate as ch_ssn_validate
from stdnum.ch.ssn import compact as ch_ssn_compact
from stdnum.es.nif import validate as es_nif_validate
from stdnum.es.nif import compact as es_nif_compact
from stdnum.pt.nif import validate as pt_nif_validate
from stdnum.pt.nif import compact as pt_nif_compact

from codicefiscale import build as build_codice_fiscale
from django.db import models
from django.utils.translation import gettext_lazy as _
from geonames.models import GeonamesAdm3, Country


logger = logging.getLogger(__name__)


# https://djangosnippets.org/snippets/1177/
# https://github.com/mthornhill/django-postal
# https://github.com/furious-luke/django-address
class PostalAddress(models.Model):
    # ricavare i campi da cities e vedere
    # https://stackoverflow.com/questions/23546758/django-models-good-way-of-storing-a-multiline-line-address-as-one-model-field
    # https://djangosnippets.org/snippets/912/
    address_line1 = models.CharField("PostalAddress line 1", max_length=200)
    address_line2 = models.CharField("PostalAddress line 2", max_length=200,
                                     blank=True)
    postal_code = models.CharField("Postal Code", max_length=10)
    '''
    '   Which Geonames administrative level maps to a municipality in each country?
    '   For Italy it's level 3
    '''
    city = models.ForeignKey(GeonamesAdm3, null=True, blank=True, on_delete=models.CASCADE)
    state_province = models.CharField("State/Province", max_length=40,
                                      blank=True)
    country = models.ForeignKey(Country, blank=False, on_delete=models.CASCADE)

    def __str__(self):
        repr = self.address_line1
        if self.address_line2:
            repr = repr + ", " + self.address_line2
        if self.postal_code:
            repr = repr + " (" + self.postal_code + ") "
        if self.city:
            repr = repr + " " + str(self.city)
        if self.state_province:
            repr = repr + " " + self.state_province
        if self.country:
            repr = repr + ", " + self.country.name
        return repr


class NationalIdentificationCodeType(models.Model):
    country = models.ForeignKey(Country, on_delete=models.CASCADE)
    # A country can have more than one nic; we use the acronym to search it
    # e.g. country_code="IT", acronim="CF" yields Codice Fiscale
    #      country_code="IT", acronim="STP" yields Straniero Temporaneamente Presente
    #                          https://it.wikipedia.org/wiki/Straniero_temporaneamente_presente
    acronym = models.CharField(max_length=10, default="", blank=True)
    # We (partially e.g. only by CentralPersonalData) manage more than 1 nic type per coutry (es: STP for Italy)
    # We need to get a default one.
    default = models.BooleanField(default=True) # True if this is the default nic type
    BE_regexp = re.compile(r'^[0-9]{2}[.\- ]{0,1}[0-9]{2}[.\- ]{0,1}[0-9]{2}[.\- ]{0,1}[0-9]{3}[.\- ]{0,1}[0-9]{2}$')
    FR_regexp = re.compile(r'^(?P<gender>[1278])(?P<year>\d{2})(?P<month>0[1-9]|1[0-2]|20)(?P<department>\d{2}|2[AB])(?P<city>\d{3})(?P<certificate>\d{3})(?P<key>\d{2})$')
    GB_regexp = re.compile(r'^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z](?:\s*\d{2}){3}\s*[A-D]$')
    # se possibile implementazione della validazione da https://django-localflavor.readthedocs.io/en/latest/
    name = models.CharField(max_length=100)

    # https://igorescobar.github.io/jQuery-Mask-Plugin/docs.html
    #     A: {pattern: /[A-Za-z0-9]/},
    #     S: {pattern: /[A-Za-z]/},
    #     Y: {pattern: /[0-9]/}
    #     0: {pattern: / [0 - 9 *] /}
    #    '0': {pattern: /\d/},
    #    '9': {pattern: /\d/, optional: true},
    #    '#': {pattern: /\d/, recursive: true},
    input_mask = models.CharField(max_length=100)

    @staticmethod
    def get_codicefiscale(last_name, first_name, date_of_birth, gender, codice_catastale):
        return build_codice_fiscale(last_name, first_name, date_of_birth,
                   gender, codice_catastale)

    @staticmethod
    def check_codicefiscale(cf_in, last_name, first_name, date_of_birth, gender, codice_catastale):
        cf = build_codice_fiscale(last_name, first_name, date_of_birth,
                   gender, codice_catastale)
        return (cf.upper() == cf_in.upper()), cf.upper()

    def check_nic(self, nic, last_name=None, first_name=None, date_of_birth=None, gender=None, it_codice_catastale=None):
        '''
        ' validation based on the country
        :return: boolean
        '''
        try:
            if self.country.code == 'IT':
                cf = build_codice_fiscale(last_name, first_name, date_of_birth,
                           gender, it_codice_catastale)
                return cf == nic
            elif self.country.code == 'GB':
                # https://stackoverflow.com/a/17929051/1029569
                pattern = "^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z](?:\s*\d{2}){3}\s*[A-D]$"
                return NationalIdentificationCodeType.GB_regexp.match(nic, re.IGNORECASE) is not None
            elif self.country.code == 'FR':
                # credit https://gist.github.com/jauneau/1206760
                # First validation with regexp
                match = NationalIdentificationCodeType.FR_regexp.match(nic)
                if match is None:
                    return False

                # Extract all parts of social number
                extract = match.groupdict()
                gender = extract['gender']
                year = extract['year']
                month = extract['month']
                department = extract['department']
                city = extract['city']
                certificate = extract['certificate']
                key = int(extract['key'])

                # Finer validation for department and city
                if department == '98' or department == '20':
                    return False
                if department == '97':
                    department = department + city[:1]
                    if int(department) not in range(971, 976):
                        return False
                    city = city[1:]
                    if int(city) < 1 or int(city) > 90:
                        return False
                elif int(city) < 1 or int(city) > 990:
                    return False

                # Finer validation for certificate
                if certificate == '000':
                    return False

                # Finer validation for key
                if key > 96:
                    return False
                insee = int(gender + year + month + department.replace('A', '0').replace('B', '0') + city + certificate)
                return (97 - insee % 97) == key
            elif self.country.code == 'DK':
                try:
                    dk_cpr_validate(dk_cpr_compact(nic))
                    return True
                except:
                    return False
            elif self.country.code == 'NL':
                try:
                    nl_bsn_validate(nl_bsn_compact(nic))
                    return True
                except:
                    return False
            elif self.country.code == 'BE':
                # stdnum hasn't got it
                # Numéro national/CIF 11 cifre
                # First validation with regexp https://www.regextester.com/102597
                match = NationalIdentificationCodeType.BE_regexp.match(nic)
                if match is None:
                    return False
                return True
            elif self.country.code == 'ES':
                try:
                    es_nif_validate(es_nif_compact(nic))
                    return True
                except:
                    return False
            elif self.country.code == 'PT':
                try:
                    pt_nif_validate(pt_nif_compact(nic))
                    return True
                except:
                    return False
            elif self.country.code == 'HR':
                try:
                    hr_oib_validate(hr_oib_compact(nic))
                    return True
                except:
                    return False
            elif self.country.code == 'DE':
                try:
                    de_idnr_validate(de_idnr_compact(nic))
                    return True
                except:
                    return False
            elif self.country.code == 'CH':
                try:
                    ch_ssn_validate(ch_ssn_compact(nic))
                    return True
                except:
                    return False

            # if I have no validator for the country I return True
            return True
        except Exception as ex:
            logger.exception("NationalIdentificationCodeType.validate: code=%s, exception=%s" %
                             (nic, str(ex)))
            return False


class NationalIdentificationCode(models.Model):
    type = models.ForeignKey(NationalIdentificationCodeType, on_delete=models.SET_NULL, null=True)
    nic = models.CharField(_("National Identification Code"), max_length=200, db_index=True)
