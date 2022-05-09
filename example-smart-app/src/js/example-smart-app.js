(function(window){
//https://stackoverflow.com/questions/48073151/read-local-json-file-into-variable
window.extractData = function() {

    return fetch('crediblemeds.json')
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            return doCode(data);
        })
        .catch(function (err) {
            console.log('error: ' + err);
        });
    
};

function doCode(data){


    var medList = document.getElementById('med');
    var medDateWriten = document.getElementById('dateWriten');
    var medCategory = document.getElementById('category');

    let med_dict = {};
    var results = data.Results;
    for (let idx in results) {
        med_dict[results[idx].rxnorm_id] = results[idx];
    }

    var ret = $.Deferred();

    function onError() {
        console.log('Loading error', arguments);
        ret.reject();
    }


    function getMedicationName(medCodings) {
        var coding = medCodings.find(function(c) {
        return c.system == "http://www.nlm.nih.gov/research/umls/rxnorm";
        });
        return coding && coding.display || "Unnamed Medication(TM)";
    }

    function getCategory(medCodings) {
        if (medCodings in med_dict){
            switch(med_dict[medCodings].category) {
                case "K":
                    return "K: Know Risk"
                  
                case "P":
                    return "P: Possible Risk"
                  
                case "C":
                    return "C: Conditional Risk"
                
                default:
                    return med_dict[medCodings].category; 
                  
            }

        }else{
            return "No Category";
        }
    }

    function defaultPatient(){
        return {
            fname: {value: ''},
            lname: {value: ''},
            gender: {value: ''},
            birthdate: {value: ''},
            height: {value: ''},
            systolicbp: {value: ''},
            diastolicbp: {value: ''},
            ldl: {value: ''},
            hdl: {value: ''},
            na: {value: ''},
            k: {value: ''},
            med: {value: ''},
        };
    }
    
    function getBloodPressureValue(BPObservations, typeOfPressure) {
        var formattedBPObservations = [];
        BPObservations.forEach(function(observation){
            var BP = observation.component.find(function(component){
                return component.code.coding.find(function(coding) {
                return coding.code == typeOfPressure;
            });
            });
            if (BP) {
                observation.valueQuantity = BP.valueQuantity;
                formattedBPObservations.push(observation);
            }
        });
        return getQuantityValueAndUnit(formattedBPObservations[0]);
    }
    
    function getQuantityValueAndUnit(ob) {
        if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
            return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
        } else {
            return undefined;
        }
    }
    

    function onReady(smart)  {
        if (smart.hasOwnProperty('patient')) {
            var patient = smart.patient;
            var pt = patient.read();
            var obv =patient.api.fetchAll({
                type: 'Observation',
                query: {
                    code: {
                    $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                    'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                    'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                    }
                }
            });

            var medOrd = patient.api.fetchAllWithReferences(
                { type: "MedicationOrder" },
                [ "MedicationOrder.medicationReference" ]);

            $.when(pt, obv, medOrd).fail(onError);

            $.when(pt, obv, medOrd).done(function(patient, obv, medOrd) {
                var byCodes = smart.byCodes(obv, 'code');
                var gender = patient.gender;

                var fname = '';
                var lname = '';

                if (typeof patient.name[0] !== 'undefined') {
                    fname = patient.name[0].given.join(' ');
                    lname = patient.name[0].family.join(' ');
                }

                var height = byCodes('8302-2');
                var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
                var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
                var hdl = byCodes('2085-9');
                var ldl = byCodes('2089-1');
                var na = byCodes('2951-2');
                var k = byCodes('2823-3');


                var medArray = [];
                var medName = '';

                if (medOrd[0].length) {
                    medOrd[0].forEach(function(prescription) {
                    if (prescription.medicationCodeableConcept) {
                        if (prescription.medicationCodeableConcept.coding){
                            medName = getMedicationName(prescription.medicationCodeableConcept.coding);
                            medCat = getCategory(prescription.medicationCodeableConcept.coding);
                        }else{
                        medName = prescription.medicationCodeableConcept.text;
                        medCat = "No Category";
                        }
                    } else if (prescription.medicationReference) {
                        var med = refs(prescription, prescription.medicationReference);
                        medName = getMedicationName(med && med.code.coding || []);
                        medCat = getCategory(med && med.code.coding || []);
                    }

                    medList.innerHTML += "<li> " + medName + "</li>";
                    medDateWriten.innerHTML += "<li> " +  prescription.dateWritten + "</li>";
                    medCategory.innerHTML += "<li> " + medCat + "</li>";
                    medName = medName + ' -Date Written: ' + prescription.dateWritten;
                    medArray.push(medName);
                    });
                }

                var p = defaultPatient();
                p.birthdate = patient.birthDate;
                p.gender = gender;
                p.fname = fname;
                p.lname = lname;
                p.height = getQuantityValueAndUnit(height[0]);

                if (typeof systolicbp != 'undefined')  {
                    p.systolicbp = systolicbp;
                }

                if (typeof diastolicbp != 'undefined') {
                    p.diastolicbp = diastolicbp;
                }

                p.hdl = getQuantityValueAndUnit(hdl[0]);
                p.ldl = getQuantityValueAndUnit(ldl[0]);
                p.na = getQuantityValueAndUnit(na[0]);
                p.k = getQuantityValueAndUnit(k[0]);

                p.med = medArray;

                ret.resolve(p);
            });

        } else {
            onError();
        }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();
}


window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#na').html(p.na);
    $('#k').html(p.k);

//$('#med').html(p.med);

};

})(window);