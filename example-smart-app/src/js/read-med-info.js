
var render = createRenderer("output");

function getMedicationName(medCodings) {
    var coding = medCodings.find(function(c){
        return c.system == "http://www.nlm.nih.gov/research/umls/rxnorm";
    });
    return coding && coding.display || "Unnamed Medication(TM)";
}

var client = FHIR.oauth2.init({
    // The client_id that you should have obtained after registering a client at the EHR.
    clientId: "my_web_app",

    // The scopes that you request from the EHR
    scope: [
        "launch/patient",  // request the current patient
        "openid fhirUser",  // Get the current user
        "online_access",   // request a refresh token
        "patient/*.read",  // read patient data
    ].join(" "),

    redirectUri: "./index.html",

    iss: "https://launch.smarthealthit.org/v/r3/sim/eyJrIjoiMSIsImIiOiJzbWFydC04ODg4ODA0In0/fhir"
})

// Get MedicationRequests for the selected patient
var data = client.request("/MedicationRequest?patient=" + client.patient.id, {
    resolveReferences: [ "medicationReference" ],
    graph: true
})
    
// Reject if no MedicationRequests are found
if (!data.entry || !data.entry.length) {
    throw new Error("No medications found for the selected patient");
}

var entries = data.entry;

var med = '';

for (let i = 0; i < entries.length; i++) {
    var info = getMedicationName(
        client.getPath(entries[i], "resource.medicationCodeableConcept.coding") ||
        client.getPath(entries[i], "resource.medicationReference.code.coding")
    );
    med = med + info ;
    
  }
render
.catch(render);
$('#med').html(med);