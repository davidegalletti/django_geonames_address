{% load i18n %}
      var no_free_text_country_codes = [];
      $('input[geonames=country]').autocomplete({
        source: "{{ FORCE_SCRIPT_NAME }}geonamesapi/countries/",
        select: function (event, ui) { //item selected
          AutoCompleteSelectHandlerCountry(event, ui)
        },
        change: function (event, ui) {
          //
          if (!ui.item) {
              this.value = '';
              $(this).siblings(".has-error").html("<span class=\"help-block\"><strong>{% trans "You should select a country name from the list." %}</strong></span>");
          }
          //
        },
        minLength: 3,
        sdelay: 300
      });
      function AutoCompleteSelectHandlerCountry(event, ui) {
        // remove "_instance_id_country" and add "_content_type"
        // I clear content type
        $("#" + event.target.attributes["id"].value.slice(0, -17) + "_content_type").val("");
        // remove "_country"
        // I clear the actual instance id
        $("#" + event.target.attributes["id"].value.slice(0, -8) + "_id").val("");


        var secondary_field = $("input#" + event.target.attributes["id"].value.slice(0, -8) + "_autocomplete[geonames=municipality_autocomplete]");
        secondary_field.show();
        secondary_field.val("");
        secondary_field.attr("country_id", ui.item.id);
        secondary_field.attr("country_code", ui.item.code);
        secondary_field.attr("country_it_codice_catastale", ui.item.it_codice_catastale);
        if (ui.item.data_loaded) {
          event.target.attributes["data_loaded"] = "True";
          //secondary_field.attr("data_loaded", "True");
        } else {
          event.target.attributes["data_loaded"] = "False";
        }

        //{% if not GEONAMES_FORCE_ITALIAN_NIC %}
        var nic_field = $("input[geonames=nic][municipality_field=" + event.target.attributes["id"].value.slice(3).slice(0, -8) + "]");
        var label_for_nic_field = $("label[for=" + nic_field.attr("id") + "]");
        if (ui.item.nic_type) {
          nic_field.attr("placeholder", ui.item.nic_input_mask);
          if (ui.item.nic_input_mask) {
            $.mask.definitions['b'] = '[A-Z]';
            nic_field.mask(ui.item.nic_input_mask, {autoclear: false});
          } else {
            nic_field.unmask();
          }
          label_for_nic_field.html(ui.item.nic_type);
        } else {
          // I must restore default values
          nic_field.attr("placeholder", nic_field.attr("default_placeholder"));
          label_for_nic_field.html(nic_field.attr("default_label"));
          nic_field.unmask("");
        }
        //{% endif %}
      }
      function initialize_municipality(item) {
        if (item.attr('selected_text') != item.val()) {
          $("#" + item.attr('id').slice(0, -22) + "_content_type").val("");
          $("#" + item.attr('id').slice(0, -13) + "_id").val("");
          $("#" + item.attr('id').slice(0, -22) + "_free_entry").val(item.val());
          $("#" + item.attr('id').slice(0, -22) + "_country_free_entry").val(item.attr("country_id"));
          item.attr('codice_catastale').value = "";
          item.attr('selected_text').value = "";
        }
      }
      $('input[geonames=municipality_autocomplete]').focusin(function (eventObject) {
        initialize_municipality($(this));
      })
      $('input[geonames=municipality_autocomplete]').focusout(function (eventObject) {
        initialize_municipality($(this));
        // remove "_autocomplete" and add "_country"
        if (($("#" + event.target.attributes["id"].value.slice(0, -13) + "_country")[0].attributes['data_loaded'].value == "True") &&
          $(this).attr('selected_text') != $(this).val()) {
          $(this).siblings(".has-error").html("<span class=\"help-block\"><strong>{% trans "You should select a municipality from the list, if available. Click again on Save to confirm." %}</strong></span>");
        } else {
          $(this).siblings(".has-error").html('');
        }
      })
      $('input[geonames=municipality_autocomplete]').autocomplete({
        source: function (request, response) {
          $.ajax({
            url: "{{ FORCE_SCRIPT_NAME }}geonamesapi/municipalities/",
            dataType: "json",
            data: {
              term: request.term,
              country_id: this.element.attr('country_id')
            },
            success: function (data) {
              response(data);
            }
          });
        },
        change: function (event, ui) {
          //{% if GEONAMES_NO_FREE_TEXT_MUNICIPALITY %}
          if (!ui.item) {
            no_free_text_country_codes = {% autoescape off %} {{ GEONAMES_NO_FREE_TEXT_MUNICIPALITY_COUNTRY_CODES }} {% endautoescape %};
            if (no_free_text_country_codes.indexOf(this.attributes["country_code"].value) >= 0) {
              this.value = '';
              $(this).siblings(".has-error").html("<span class=\"help-block\"><strong>{% trans "You should select a municipality from the list." %}</strong></span>");
            }
          }
          //{% endif %}
        },
        select: function (event, ui) { //item selected
          AutoCompleteSelectHandlerMunicipality(event, ui)
        },
        minLength: 3,
        delay: 300
      });
      $( "<div class=\"has-error\"></div>" ).insertAfter( "input[geonames=municipality_autocomplete]" );
      function AutoCompleteSelectHandlerMunicipality(event, ui) {
        // remove "_instance_id_autocomplete" and add "_content_type"
        // I store the content type id I received from the server
        $("#" + event.target.attributes["id"].value.slice(0, -22) + "_content_type").val(ui.item.content_type_id);
        // remove "_autocomplete" and add "_id"
        // I store the actual instance id
        $("#" + event.target.attributes["id"].value.slice(0, -13) + "_id").val(ui.item.id);
        event.target.attributes["selected_text"].value = ui.item.label;
        if (ui.item.codice_catastale !== undefined) {
          event.target.attributes["codice_catastale"].value = ui.item.codice_catastale;
        }
      }
      $('input[geonames=nic]').focusin(function (eventObject) {
        $('input[geonames=nic]').siblings(".has-error").html(''); // pulisco l'eventuale messaggio di errore
        var municipality_field_id = $(this).attr('municipality_field');
        // For some browsers, `attr` is undefined; for others, `attr` is false. Check for both.
        if (typeof municipality_field_id !== typeof undefined && municipality_field_id !== false) {
          var municipality_field = $("input#id_" + municipality_field_id + "_autocomplete[geonames=municipality_autocomplete]");
          var municipality_field_country_code = municipality_field.attr("country_code");
          var codice_catastale;
          var checkCodiceFiscale;
          $(this).attr("country_code", municipality_field_country_code);
          //{% if GEONAMES_FORCE_ITALIAN_NIC %}
          checkCodiceFiscale = true;
          if (municipality_field_country_code == "IT") {
            codice_catastale = municipality_field.attr("codice_catastale");
          } else {
            codice_catastale = municipality_field.attr("country_it_codice_catastale");
          }
          //{% else %}
          checkCodiceFiscale = (municipality_field.attr("country_code") == "IT");
          codice_catastale = municipality_field.attr("codice_catastale");
          //{% endif %}

          //{% if GENERATE_CODICE_FISCALE %}
          // When I delete the text of the field it gets filled with "________________", not sure why
          if (checkCodiceFiscale && ($(this).val() == "" || $(this).val() == "________________")) {
            var first_name = $("input#id_" + $(this).attr('first_name_field')).val();
            var last_name = $("input#id_" + $(this).attr('last_name_field')).val();
            var date_of_birth = $("input#id_" + $(this).attr('date_of_birth_field')).val();
            var m = moment(date_of_birth, momentJsdateFormat);
            date_of_birth = m.format('MM/DD/YYYY');
            var gender = $("select#id_" + $(this).attr('gender_field')).val();

            if (first_name != "" && last_name != "" && date_of_birth != "" && gender != "" && codice_catastale != "")
              $.ajax({
                type: 'POST',
                url: '{{ FORCE_SCRIPT_NAME }}registry/get_codicefiscale/',
                dataType: 'json',
                data: {
                  cf_in: $(this).val(),
                  first_name: first_name,
                  last_name: last_name,
                  date_of_birth: date_of_birth,
                  gender: gender,
                  codice_catastale: codice_catastale
                },
                success: function (data, textStatus, jqXHR) {
                  if (textStatus == 'success') {
                    $('input[geonames=nic]').val(data);
                  }
                },
                failure: function (data, textStatus, jqXHR) {
                }
              });
          }
          //{% endif %}
        }
      })
      $('input[geonames=nic]').focusout(function (eventObject) {
        $('input[geonames=nic]').siblings(".has-error").html(''); // pulisco l'eventuale messaggio di errore
        var municipality_field_id = $(this).attr('municipality_field');
        // For some browsers, `attr` is undefined; for others, `attr` is false. Check for both.
        // NUOVO REQUISITO CELIACHIA GEONAMES_FORCE_ITALIAN_NIC
        // TUTTE LE NAZIONALITA' HANNO SOLO IL CODICE FISCALE

        if (typeof municipality_field_id !== typeof undefined && municipality_field_id !== false) {
          var municipality_field = $("input#id_" + municipality_field_id + "_autocomplete[geonames=municipality_autocomplete]");
          var municipality_field_country_code = municipality_field.attr("country_code");
          var checkCodiceFiscale;
          var codice_catastale;
          $(this).attr("country_code", municipality_field_country_code);
          //{% if GEONAMES_FORCE_ITALIAN_NIC %}
          checkCodiceFiscale = true;
          if (municipality_field_country_code == "IT") {
            codice_catastale = municipality_field.attr("codice_catastale");
          } else {
            codice_catastale = municipality_field.attr("country_it_codice_catastale");
          }
          //{% else %}
          checkCodiceFiscale = (municipality_field.attr("country_code") == "IT");
          codice_catastale = municipality_field.attr("codice_catastale");
          //{% endif %}
          if (checkCodiceFiscale && codice_catastale) {
            // When I delete the text of the field it gets filled with "________________", not sure why
            if (($(this).val() == "") || ($(this).val() == "________________")) {
              $(this).trigger("focusin");
            } else {
              var date_of_birth = $("input#id_" + $(this).attr('date_of_birth_field')).val();
              var m = moment(date_of_birth, momentJsdateFormat);
              date_of_birth = m.format('MM/DD/YYYY');
              $.ajax({
                type: 'POST',
                url: '{{ FORCE_SCRIPT_NAME }}registry/check_codicefiscale/',
                dataType: 'json',
                data: {
                  cf_in: $(this).val(),
                  first_name: $("input#id_" + $(this).attr('first_name_field')).val(),
                  last_name: $("input#id_" + $(this).attr('last_name_field')).val(),
                  date_of_birth: date_of_birth,
                  gender: $("select#id_" + $(this).attr('gender_field')).val(),
                  codice_catastale: codice_catastale
                },
                success: function (data, textStatus, jqXHR) {
                  if (textStatus == 'success') {
                    if (data.result) {
                      $('input[geonames=nic]').siblings(".has-error").html('');
                    } else {
                      //{% if GENERATE_CODICE_FISCALE %}
                      $('input[geonames=nic]').siblings(".has-error").html('<span class="help-block"><strong>Il codice fiscale non sembra essere corretto. Per farlo calcolare al sistema cancellare il valore inserito e fare clic su un altro campo.</strong></span>');
                      //{% else %}
                      $('input[geonames=nic]').siblings(".has-error").html('<span class="help-block"><strong>Il codice fiscale non sembra essere corretto. Il valore calcolato dal sistema è ' + data.cf + '</strong></span>');
                      //{% endif %}
                    }
                  }
                },
                failure: function (data, textStatus, jqXHR) {
                }
              });
            }
          } else {
            $.ajax({
              type: 'POST',
              url: '{{ FORCE_SCRIPT_NAME }}registry/check_nic/',
              dataType: 'json',
              data: {
                nic: $(this).val()
              },
              success: function (data, textStatus, jqXHR) {
                if (textStatus == 'success') {
                  if (data) {
                    $('input[geonames=nic]')[0].setCustomValidity("");
                  } else {
                    $('input[geonames=nic]')[0].setCustomValidity("Please check the value format.");
                  }
                }
              },
              failure: function (data, textStatus, jqXHR) {
              }
            });
          }
        }

      })

      nic_field = $("input[geonames=nic]");
      var nic_type = $("#id_" + nic_field.attr('municipality_field') ).attr('nic_type');
      var nic_mask = $("#id_" + nic_field.attr('municipality_field') ).attr('nic_mask');
      if (nic_type) {
        nic_field.attr("placeholder", nic_mask);
        var label_for_nic_field = $("label[for=" + nic_field.attr("id") + "]");
        label_for_nic_field.html(nic_type);
        if (nic_mask) {
          $.mask.definitions['b'] = '[A-Z]';
          nic_field.mask(nic_mask)
        }
      }
      var submitButton = nic_field.closest('form').find(':submit');
      submitButton.click(function() {
        var proceedWithSubmit = true;
        //{% if GEONAMES_NO_FREE_TEXT_MUNICIPALITY %}
        no_free_text_country_codes = {% autoescape off %} {{ GEONAMES_NO_FREE_TEXT_MUNICIPALITY_COUNTRY_CODES }} {% endautoescape %};
        $('input[geonames=municipality_autocomplete]').each(function(i) {
          // se NON ho un id selezionato con l'autocomplete
          // e questo è uno dei paesi per cui è obbligatoria la selezione
          if( ($("#"+this.id.replace("_autocomplete", "_id")).val() === "") && (no_free_text_country_codes.indexOf(this.attributes["country_code"].value) >= 0)) {
            this.value = '';
            $(this).siblings(".has-error").html("<span class=\"help-block\"><strong>{% trans "You should select a municipality from the list." %}</strong></span>");
            proceedWithSubmit = false;
          } else {
            $(this).siblings(".has-error").html("");
          }
        });
        //{% endif %}
        return proceedWithSubmit;
      });