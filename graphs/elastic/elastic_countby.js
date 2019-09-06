graphs_functions_json.add_graphs_json({
	"elastic":{
		"Countyby":{
			"completeForm": "elastic_completeform_countby",			
			"processForm": "elastic_processform_countby",			
			"populate": "elastic_populate_countby",
			"rawtoprocessed":"elastic_rawtoprocessed_countby",
			"graph":"elastic_graph_countby",
			"about": "Simple count with high level counting stats.",
		}
	}
});

function elastic_completeform_countby(id, targetDiv){

	const jsonform = {
		"schema": {
		  "custom_field": {
			"type": "string",
			"title": "Groupby", 
			"enum": []
			
		  }
		},
		"form": [
		  {
			"key": "custom_field"
	
		  }
		]
	}

	dst = connectors_json.handletodst( retrieveSquareParam(id, 'CH'))
	connectionhandle = connectors_json.handletox( retrieveSquareParam(id, 'CH'), 'index')

	elastic_get_fields(dst, connectionhandle, id)
		.then(function(results){
	
			jsonform.schema.custom_field.enum = results
			$(targetDiv).jsonForm(jsonform)

		})




}


function elastic_populate_countby(id){
	ee(arguments.callee.caller.name+" -> "+arguments.callee.name+"("+id+")");

	var to = moment(calcGraphTime(id, 'We', 0), "X").format();
	var from =  moment( (calcGraphTime(id, 'We', 0) - retrieveSquareParam(id, "Ws", true)) , "X").format();
	var Ds = calcDs(id, []);
	
	//var fields = [];  // use this to see all fields in raw output
	//var fields = ["@timestamp", "type", "client_ip", "method", "port", "server_response"];
	var fields=[retrieveSquareParam(id,"Cs",true)['custom_field']]

	var limit = 10000;

	elastic_connector(connectors_json.handletodst( retrieveSquareParam(id, 'CH')), connectors_json.handletox( retrieveSquareParam(id, 'CH'), 'index'), id, from, to, Ds, fields, limit);

}



function elastic_rawtoprocessed_countby(id){

	var data = retrieveSquareParam(id, 'rawdata_'+'');
	const firstBy = retrieveSquareParam(id,"Cs")['custom_field']


	var dataout = {}

	//// how many rows
	dataout.length = data.length
	
	//// how many unique addresses
	dataout.unique = _.uniq(  _.map(data, function(row){  return row._source[firstBy]  }  )).length
	
	//// range of 1st normal distribution
	// {"1.2.3.4":123, "5.6.7.8":456, ...}
	var datacounter = {}
	for (i = 0; i < data.length; i++) { 
		if(!(data[i]._source[firstBy] in datacounter)){
			datacounter[data[i]._source[firstBy]] = 0;
		}
		datacounter[data[i]._source[firstBy]]++;
	}
	// create mean
	mean = _.reduce(   _.values(datacounter)   , function(memo, num){ return memo + num; }, 0) / _.keys(datacounter).length
	dataout.mean = mean

	// normal distribution deviance from mean
	datadeviance = _.map(datacounter, function(num, key){
		//qq(i+" "+Math.pow((i - avg), 2))
		
		return Math.pow((num - mean), 2)
	})
	//qq(">>"+JSON.stringify(datadeviance))
	dataout.onesd = Math.sqrt(_.reduce(datadeviance, function(memo, num) { return memo + num}, 0) / _.keys(datacounter).length) 

	//// how many sigma4+
	var foursigma = 4 * dataout.onesd
	var foursigmahit = 0
	for (var key in datacounter) {
		if(datacounter[key] > foursigma){
			foursigmahit ++
		}
	}
	dataout.foursigmahit = foursigmahit


	saveProcessedData(id, '', dataout);

}


function elastic_graph_countby(id){
	
	ee(arguments.callee.caller.name+" -> "+arguments.callee.name+"("+id+")");
	// http://bl.ocks.org/bbest/2de0e25d4840c68f2db1

	var squareContainer = sake.selectAll('#square_container_'+id)
	var square = squareContainer
		.append("xhtml:div") 
		//.append("svg")
			.attr("id", function(d){ return "square_"+d.id })
			.classed("box_binding", true)
			.classed("square_body", true)
			.classed("square_xhtml", true)
			.classed("y_overflow", true)
			.attr("width", "1000")
		.on("mousedown", function() { d3.event.stopPropagation(); })
	var height = document.getElementById("square_"+id).clientHeight;
	var width  = document.getElementById("square_"+id).clientWidth;
	
	var data = retrieveSquareParam(id, 'processeddata');
	const firstBy = retrieveSquareParam(id,"Cs")['custom_field']

	clusterSection = square.append("div")


	// ##################
	clusterDiv = clusterSection.append("div")
	.classed("square_countby", true)
		.text("Records Found: " +data.length)


	// ##################
	clusterDiv = clusterSection.append("div")
		.classed("square_countby", true)
		.text("Unique "+firstBy+": "+data.unique)


	// ##################
	// if mean-sd < 0, then set to 0
	if(Math.ceil(data.mean-data.onesd)< 0){
		onesdmin = 1;
	}else{
		onesdmin = Math.ceil(data.mean-data.onesd);
	}	
	clusterDiv = clusterSection.append("div")
		.classed("square_countby", true)
		.text("Most "+firstBy+" had total "+onesdmin+" to "+Math.floor(data.mean+data.onesd))



	// ##################
		clusterDiv.append("div")
			.classed("square_countby", true)
			.classed("fleft", true)
			.text("Above 4Sigma ("+Math.floor(data.mean+(4*data.onesd))+"): ")
		
		clusterDiv.append("div")
			.classed("square_countby", true)
			.style("font-weight", "bold")
			.style("text-decoration", "underline")
			.classed("fleft", true)
			.text(data.foursigmahit)
			.on("click", function() {  childFromClick(id, {"y": 1000, "Gt":"Pie Chart", "Cs":{"custom_field":firstBy}} , {} )   });


	clusterSection.append("div")
		.classed("clr", true)



}


