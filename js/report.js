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
function showScenarios(node, data) {
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

function createLastExecCell(td, row, lastExec) {
	if (!lastExec) {
		td.text("n/a");
	} else {
		var color = lastExec.scenario.result == "FAILURE" ? "danger" : "success";
		var classed = "label label-" + color;
		var formattedTimestamp = timeFormat(new Date(lastExec.scenario.timestamp));
		td.append("div").attr("class", classed).text(lastExec.scenario.result);
		td.append("a").attr("href", lastExec.build.url).text("#" + lastExec.build.number);
		td.append("br");
		td.append("span").text(formattedTimestamp)
		td.append("br");
		td.append("span").text(formatDuration(lastExec.scenario.duration / 1000000));
		td.append("br");
		if (row.scenario.tags) {
			var tags = td.append("span").style("word-wrap","break-word");
			tags.selectAll("a").data(row.scenario.tags).enter().append("a").attr("href", function(tag) {
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
			var exec = executions[eIds];

			var striped = exec.scenario.pending ? "progress-bar-striped" : "";

			var color = "progress-bar-" + (exec.scenario.result == "FAILURE" ? "danger" : "success");

			// append a progress-bar part surrounded by a link to the build
			var href = scenario.scenario.tags?createHrefToCucumberReport(exec,scenario.scenario.tags[0]):exec.build.url;
			progress.append("a").attr("href", href).attr("title",
					"Build " + scenario.job.name + " #" + exec.build.number + "<br>" + timeFormat(new Date(exec.build.timestamp))).append("div").attr(
					"class", "progress-bar " + striped + " " + color).style("width", width + "%").style("border", "1px solid #777;");

		}

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