//as an exemple...
var testData = [ {
	scenario : {
		name : "ETQU, blahblah",
		url : "www.google.com",
		tags : [ {
			name : "@RTV-2212",
			line : 5
		} ],
		tagList : "@RTV-x,@pending,@myfeature"
	},
	feature : {
		name : "AnalyseSauvegardées",
		fileName : "Analyses.feature"
	},
	job : {
		id : "",
		name : "rtv-sel-AnalyseUnivers-master",
		url : "http://build.ul.mediametrie.fr/view/Restit%20TV/view/Restit%20TV%20-%20master%20-%20Selenium/job/rtv-sel-AnalyseUnivers-master/"
	},
	configuration : {
		id : "",
		name : "SELENIUM_DRIVER=firefox_34_VISTA,jdk=oracle-jdk-1.7.0_45",
		url : "http://build.ul.mediametrie.fr/view/Restit%20TV/view/Restit%20TV%20-%20master%20-%20Selenium/job/rtv-sel-AnalyseUnivers-master/SELENIUM_DRIVER=firefox_34_VISTA,jdk=oracle-jdk-1.7.0_45/"
	},
	executionCount : 2,
	failures : 1,
	successes : 1,
	executions : [ {
		build : {
			number : 841,
			timestamp : 1123456789,
			url : "http://build.ul.mediametrie.fr/job/rtv-sel-AnalyseUnivers-master/841/"
		},
		scenario : {
			result : "FAILURE",
			duration : 12345678,
			timestamp : 123456789,
			pending : true
		}
	}, {
		build : {
			number : 840,
			timestamp : 1123456789,
			url : "http://build.ul.mediametrie.fr/job/rtv-sel-AnalyseUnivers-master/840/"
		},
		scenario : {
			result : "SUCCESS",
			duration : 12345678,
			timestamp : 123456789,
			pending : false
		}
	} ],
	lastExecution : {
		build : {
			number : 841,
			url : "http://build.ul.mediametrie.fr/job/rtv-sel-AnalyseUnivers-master/841/"
		},
		scenario : {
			result : "FAILURE",
			duration : 12345678,
			timestamp : 123456789,
			pending : true
		},
	},

	maturity : "",
	severity : "REGRESSION",
	actions : [ {
	// TODO
	} ]

} ];

var timeFormat = null;
var allScenarios = null;



function appendConcurrentScenariosView(exec2){
    var around = 1000 * 60 * 1;
    //
    var start = exec2.scenario.startTime - around;
    var end = exec2.scenario.endTime + around;
    
    //2 minutes around
    
    
    var execAround = new Array();
    console.log("find all scenarios among " + allScenarios.length + " which are between " + start + " and " + end);
    allScenarios.forEach(function(i){
        //console.log(i);
        i.executions.forEach(function(e){
//            console.log(e);
            var estart = e.scenario.startTime;
            var eend = e.scenario.endTime;
            //console.log(" " + (estart<end)  + " " + (eend > start) + " " + estart  +" " + eend);
            if(estart<end && eend > start) {
                execAround.push(e);
                //HACK do that before: 
                e.scenario.name = i.scenario.name;
                //e.scenario.name = i.scenario.name;
            }
        });
    });
    
    console.log("Got " + execAround.length + " executions around :");
    console.log(execAround);
    
    drawExecAroundChart(exec2, execAround);
}


function drawExecAroundChart(exec2, execAround){
    
    var margin = {top: 40, right: 40, bottom: 40, left:60},
        width = 870,
        height = 200;
    
    
  //find the min and max of all scenarios
    var min = d3.min(execAround, function(i){return i.scenario.startTime});
    var max = d3.max(execAround, function(i){return i.scenario.endTime});
    var buildNumbers = d3.nest().key(function(i){return "#" + i.build.number}).map(execAround, d3.map).keys();
    
    console.log("min " + min);
    console.log("max " + max);
    

    var x = d3.time.scale()
        .domain([new Date(min), new Date(max)])
        .range([0, width - margin.left - margin.right]);

    var y = d3.scale.ordinal()
        .domain(buildNumbers)
        .rangeBands([height - margin.top - margin.bottom, 0], 0.1, 0);

    var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom')
    .ticks(d3.time.second, 15)
    .tickFormat(d3.time.format('%H:%M:%S'))
    .tickSize(5)
    .tickPadding(0);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left')
    .tickPadding(8);

//remove svg 

d3.select('#scenarioModalAround svg').remove();

var svg = d3.select('#scenarioModalAround')
     .append("svg")
    .attr('class', 'chart')
    .attr('width', width)
    .attr('height', height)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
    .call(xAxis);

svg.append('g')
  .attr('class', 'y axis')
  .call(yAxis);


var bars = svg.selectAll('.bar')
    .data(execAround);
    
bars.enter().append('rect')
        .attr('class', 'bar')
        .append("title");
bars
    .attr('x', function(d) { return x(new Date(d.scenario.startTime)); })
    .attr('y', function(d) { return y("#" + d.build.number) })
    .attr('width', function(d) { 
        return x(new Date(d.scenario.endTime)) - x(new Date(d.scenario.startTime)) 
     } )
    .attr('height', function(d) { return y.rangeBand() })
    .classed("success",function(d){return d.scenario.result?d.scenario.result=="SUCCESS":false})
    .classed("danger",function(d){return d.scenario.result?d.scenario.result=="FAILURE":false})
    .classed("selected",function(d){return d==exec2;})
    .on("click",function(d){showPopup(d, d)});

bars.select("title").text(function(d){ console.log("title ",d); return d.scenario.name })
    
}



function showScenarios(node, data, all) {
    allScenarios = all;
	timeFormat = d3.time.format("%d/%m/%y %H:%M:%S");

	// clear all
	d3.select(node).selectAll("*").remove();

	if (data.length == 0) {
		d3.select(node).append("strong").text("no scenarios matching the filters!");
		return;
	}

	var table = d3.select(node).append("table").attr("class", "table table-striped"), 
			colgroup = table.append("colgroup"),
			thead = table.append("thead"), 
			tbody = table.append("tbody");
	
	

	var sample = data[0];
	var columns = d3.keys(sample);

	colgroup.selectAll("col").data(columns).enter().append("col")
	.attr("class",function(d){
			return d;
		});
	
	// append the header row
	thead.append("tr").selectAll("th").data(columns).enter().append("th")
	.attr("class",function(d){
			return d;
		})
	.style("text-transform", "capitalize").each(function(column, i) {
		var th = d3.select(this);
		switch (column) {
		case "executions":
			th.text("History");
			break;
		case "executionCount":
			th.append("span").attr("class", "glyphicon glyphicon-wrench").attr("title", "Number of builds");
			break;
		case "failures":
			th.append("span").attr("class", "glyphicon glyphicon-thumbs-down text-danger").attr("title", "% of failures");
			break;
		case "successes":
			th.append("span").attr("class", "glyphicon glyphicon-thumbs-up text-success").attr("title", "% of successes");
			break;
		default:
			th.text(column);
			break;
		}
	});

	// create a row for each object in the data
	var rows = tbody.selectAll("tr").data(data).enter().append("tr");

	// create a cell in each row for each column
	var cells = rows.selectAll("td").data(function(row) {
		return columns.map(function(columnName) {
			return {
				row : row,
				columnName : columnName
			}
		});
	}).enter()
	.append("td")
	.style("word-wrap","break-word")
	.attr("class",function(d){
			return d.columnName;
		})
		.each(populateCell);

}

function populateCell(d, i) {
	var row = d.row;
	var columnName = d.columnName;
	var td = d3.select(this);
	switch (columnName) {
	case "scenario":
		td.text(row[columnName].name);
		break;
	case "feature":
	case "job":
	case "configuration":
		//td.append("span")
//			.classed("ellipsis", true)
//			.style("max-width","100px")
//			.attr("title", row[columnName].name)
			//.text(row[columnName].name);
		td.text(row[columnName].name);
		break;
	case "executionCount":
		td.text(row[columnName]);
		break;
	case "failures":
	case "successes":
		var text = parseInt((row[columnName] / row["executionCount"]) * 100) + "%";
		td.text(text);
		break;
	case "executions":
		var execs = row[columnName];
		createExecProgress(td, row, execs);
		break;
	case "lastExecution":
		createLastExecCell(td, row, row[columnName]);
		break;
	case "severity":
		var color = severityColor[row[columnName]];
		td.append("div").attr("class", "label label-" + color).text(row[columnName]);
		break;
	case "maturity":
		td.append("div").attr("class", "label label-primary").text(row[columnName]);
		break;
	case "actions":
		createActionsCell(td, row[columnName]);
		break;
	default:
		td.text("columnName:" + row[columnName].name);
		break;
	}

}
var severityColor = {
	"OK" : "success",
	"REGRESSION" : "danger",
	"PERSISTENT REGRESSION" : "default",
	"KO" : "default",
	"RECENTLY FIXED" : "warning",
	"FIXED" : "success",
	"RANDOMNESS" : "default",
	"PENDING" : "danger",
	"RECENTLY DONE" : "warning",
	"DONE" : "success"
}

function rerun(job, params) {
	var query = "?";
	d3.entries(params).forEach(function(d){
		query += d.key + "=" + encodeURIComponent(d.value);
	});
	d3.xhr(job+query).header("Content-Type", "application/x-www-form-urlencoded").post(function(error, data) {
		// callback
		if (error) {
			console.log('ERROR', error);
		} else {
			console.log('SUCCESS', data);
		}

	});
}

function escape(str) {
	str = str.replace(/"/g, '\\"');
	str = str.replace(/'/g, "\\'");
	return str;
}

function createActionsCell(td, actions) {
	if (actions) {
		td.selectAll("a").data(actions)
			.enter().append("a")
			.attr("class", "btn btn-primary btn-xs")
			.attr("href",function(a){return a.url})
			.text(function(a){return a.name})
			.on("click",function(a){
				if(a.job){
					rerun(a.job,a.parameters);
				}
			}).append("span").attr("class","glyphicon glyphicon-flash glyphicon-align-left");
	}
}

function createLastExecCell(td, scenario, lastExec) {
	if (!lastExec) {
		td.text("n/a");
	} else {
		var color = lastExec.scenario.result == "FAILURE" ? "danger" : "success";
		var classed = "label label-" + color;
		var formattedTimestamp = timeFormat(new Date(lastExec.scenario.timestamp));
		td.append("div").datum(scenario).attr("class", classed).text(lastExec.scenario.result)
			.on("click",function(d){
				showPopup(lastExec,scenario);
			})
			.style("cursor","pointer");
		td.append("a").attr("href", lastExec.build.url).text("#" + lastExec.build.number);
		td.append("br");
		td.append("span").text(formattedTimestamp)
		td.append("br");
		td.append("span").text(formatDuration(lastExec.scenario.duration / 1000000));
		td.append("br");
		if (scenario.scenario.tags) {
			var tags = td.append("span").style("word-wrap","break-word");
			tags.selectAll("a").data(scenario.scenario.tags).enter().append("a").attr("href", function(tag) {
				return createHrefToCucumberReport(lastExec,tag);
			}).text(function(tag) {
				return " " + tag.name + " ";
			});
		}

	}
}

function createHrefToCucumberReport(exec,tag){
	return exec.build.url + "/cucumber-html-reports/" + tag.name.substring(1) + ".html";
}

function createExecProgress(td, scenario, executions) {
	var count = executions.length;
	if (count == 0) {
		td.text("no executions");
	} else {

		var width = 100 / count;
		var progress = td.append("div").attr("class", "progress").style("min-width", "350px");

		for ( var eIds in executions) {
			var exec2 = executions[eIds];

			var striped = exec2.scenario.pending ? "progress-bar-striped" : "";

			var color = "progress-bar-" + (exec2.scenario.result == "FAILURE" ? "danger" : "success");

			// append a progress-bar part surrounded by a link to the build
			//var href = scenario.scenario.tags?createHrefToCucumberReport(exec,scenario.scenario.tags[0]):exec.build.url;
			var href = "javascript:void(0)";
			progress.append("a")
					.datum(exec2)
					.attr("href", href)
					.on("click",function(d){
						showPopup(d,scenario);
					})
					.attr("title","Build " + scenario.job.name + " #" + exec2.build.number + "<br>" + timeFormat(new Date(exec2.build.timestamp)))
					.append("div").attr("class", "progress-bar " + striped + " " + color)
					.style("width", width + "%")
					.style("border", "1px solid #777;");
			
		}

	}
}

function showPopup(exec2, scenario){
//	console.log("exec", exec2);
//	console.log("scenario", scenario);
	
	var isFailure = exec2.scenario.result == "FAILURE";
	$('#scenarioModalStatus').text((isFailure?"FAILURE":"SUCCESS") + " " + formatDuration(exec2.scenario.duration/1000000)).toggleClass("label-danger",isFailure).toggleClass("label-success",!isFailure);
	$('#scenarioModalTitle').text(scenario.scenario.name);
	
	//exec2.scenario.steps
	
	var stepData = exec2.scenario.steps;
	
	d3.select("#scenarioModalSteps tbody").remove();
	
	//show the steps
	var tr = d3.select("#scenarioModalSteps").append("tbody")
		.selectAll("tr").data(stepData)
		.enter().append("tr")
		.on("click",function(d,i){
			if(d.result && d.result.status=="failed"){
				appendErrorDetailsRow(d,i);
			} else if(d.rows){
				//append a row if there is for exemple a cucumber table to display
				appendStepDetailsRow(d,i);
			}
		})
		.classed("success",function(d){return d.result?d.result.status=="passed":false})
		.classed("danger",function(d){return d.result?d.result.status=="failed":false})
		//.style("border-left",function(d){return "3px solid " + (((d.result && d.result.status=="failed") || d.rows || d.embeddings) ?"#d9edf7":"transparent")})
		.style("cursor",function(d){return ((d.result && d.result.status=="failed") || d.rows) ?"pointer":"default"});
		
	
	tr.append("td").text(function(d){return d.result?d.keyword+ " " + d.name:""});
	tr.append("td").text(function(d){return d.result?formatDuration(d.result.duration/1000000):""});
		
	//then append the embeddings
	var embeddings = [];
	stepData.forEach(function(d){
		if(d.embeddings){
			Array.prototype.push.apply(embeddings, d.embeddings);
		}
	});
	tr = d3.select("#scenarioModalSteps tbody")
	.selectAll("tr.embeddings").data(embeddings)
	.enter().append("tr").classed("embeddings info",true);
	
	var td = tr.append("td").attr("colspan",2)
		.append(function(d){
			if(d.mime_type=="text/plain"){
				return d3.select(document.createElement("a"))
					.attr("href",atob(d.data))
					.text(atob(d.data))
					.style("max-width","850px")
					.style("display","inline-block")
					.style("word-wrap","break-word")
					.node();
			} else {
				return d3.select(document.createElement("img"))
				.attr("width","850px")
				.attr("src","data:image/png;base64," + d.data)
				.node();
			}})
	
    //try to show which scenario were in parallel
    appendConcurrentScenariosView(exec2);
			
			
			
	$('#scenarioModal').modal();
}


function appendErrorDetailsRow(d,i){
	var details = d3.select("#scenarioModalSteps tr.error-details");
	if(details.size()==0){
		details = d3.select("#scenarioModalSteps tbody")
			.insert("tr","tr:nth-child(" + (i+2) + ")")
			.classed("error-details",true);
		details.append("td").attr("colspan",2)
			.append("div").style("overflow","auto").style("max-height","500px")
				.append("pre").append("code")
				.classed("java",true)
				.text(d.result?d.result.error_message:"NOTHING");
	} else {
		details.remove();
	}
}

function appendStepDetailsRow(d,i){
	var details = d3.select("#scenarioModalSteps tr.details");
	if(details.size()==0){
		details = d3.select("#scenarioModalSteps tbody")
			.insert("tr","tr:nth-child(" + (i+2) + ")")
			.classed("details",true);
		var tr = details.append("td").attr("colspan",2)
			.append("table").classed("table table-bordered table-condensed",true)
			.append("tbody")
			.selectAll("tr").data(d.rows)
			.enter().append("tr")
			.classed("success",function(d){return d.result?d.result.status=="passed":false})
			.classed("danger",function(d){return d.result?d.result.status=="failed":false});
		//
		tr.selectAll("td")
			.data(function(d){return d.cells})
			.enter().append("td").text(function(d){return d});
			
	} else {
		details.remove();
	}
}




function formatDuration(durMs) {
	var seconds = durMs / 1000;
	if(seconds<1){
		return "<1sec";
	}
	var minutes = seconds / 60;
	var hours = (minutes / 60) | 0;
	var result = "";
	// has hours
	if (hours > 0) {
		result += hours + "h ";
	}

	if (hours > 0 || ((minutes % 60) | 0) > 0) {
		result += ((minutes % 60) | 0) + "min ";
	}

	if (hours > 0 || ((minutes % 60) | 0) > 0 || ((seconds % 60) | 0) > 0) {
		result += ((seconds % 60) | 0) + "sec ";
	}
	return result;

}