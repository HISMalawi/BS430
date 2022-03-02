// process.chdir(__dirname);
var __path__ = require('path');
var hl7 = require('simple-hl7');
var client = require('node-rest-client').Client;

var app = hl7.tcp();
const PORT = 3020;
var urls = [];
var settings = require(__path__.resolve('.', 'config', 'settings'));
var mapping = require(__path__.resolve('.', 'config',settings.instrumentJSONMapping));
var options_auth = {user: settings.lisUser, password: settings.lisPassword};
var map = require(__path__.resolve('.', 'config', 'definitions'));

function sendData(urls){
  var url = urls[0];
  urls.shift();
  (new client(options_auth)).get(url, function (data) {
    if(urls.length > 0){
      sendData(urls);
    }
  });
}

function round(num) {
    var m = Number((Math.abs(num) * 100).toPrecision(15));
    return Math.round(m) / 100 * Math.sign(num);
}

app.use(function(req, res, next) {
      //req.msg is the HL7 message
    console.log('******message received*****');
    var data = req.msg.log();
    var sampleID = req.msg.getSegment('PID').fields[1].value[0][0].value[0];
    console.log(sampleID);
    var results = req.msg.getSegments('OBX');
    results.forEach(result => {
      var obsTestName = result.fields[3].value[0][0].value[0];
      var obsResult = result.fields[4].value[0][0].value[0];
      obsResult = round(obsResult);
      console.log(obsTestName +": "+ obsResult);
      console.log('--------------------------------------------------------------------');
      //generate urls
      var measureID = mapping[map[obsTestName]]
      if(sampleID && measureID)	{
        var link = settings.lisPath
        .replace(/\#\{SPECIMEN_ID\}/, sampleID)
        .replace(/\#\{MEASURE_ID\}/, measureID)
        .replace(/\#\{RESULT\}/, obsResult);	
        urls.push(link);
      }
  });

  if(urls.length > 0){ 
    console.log(urls);
    sendData(urls);
    urls = [];
  }else{
    console.log("No result sent to BLIS!!")
  }	
  console.log(data)

})
app.start(PORT);

