===============
DJANGO GEONAMES
===============

Alpha: DO NOT USE IN PRODUCTION

Django geonames is a Django app that allows you to have a local replica of some data from https://geonames.org. It has management commands to copy locally:
1. The countries of the world
2. All the administrative divisions of one or more countries specified in the configuration
3. If Italan data is downloaded, the management command downloads also some data from Istituto Italiano di Statistica https://www.istat.it/ to enable the calculation of the Italian national identifier Codice Fiscale.

Quick start
-----------

1. Add "geonames" to your INSTALLED_APPS setting like this::

    INSTALLED_APPS = [
        ...
        'geonames',
    ]

2. Run ``python manage.py migrate`` to create the models.

4. Configure ....
