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
	executions : [
			{
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
			},
			{
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
		d3.select(node).append("strong").text(
				"no scenarios matching the filters!");
		return;
	}

	var table = d3.select(node).append("table").attr("class",
			"table table-striped"), thead = table.append("thead"), tbody = table
			.append("tbody");

	var sample = data[0];
	var columns = d3.keys(sample);

	// append the header row
	thead.append("tr").selectAll("th").data(columns).enter().append("th")
			.style("width", function(column) {
				switch (column) {
				case "executions":
					return "15%";
				default:
					return null;
				}
			}).style("text-transform", "capitalize").text(function(column) {
				switch (column) {
				case "executions":
					return "History";
				case "executionCount":
					return "#builds";
				default:
					return column;
				}
			});

	// create a row for each object in the data
	var rows = tbody.selectAll("tr").data(data).enter().append("tr");

	// create a cell in each row for each column
	var cells = rows.selectAll("td").data(function(row) {
		return columns.map(function(columnName) {
			return scenarioRowDataProvider(row, columnName)
		});
	}).enter().append("td").html(function(d) {
		return d;
	});

}

function scenarioRowDataProvider(row, columnName) {
	switch (columnName) {
	case "scenario":
	case "feature":
	case "job":
	case "configuration":
		return row[columnName].name;
	case "executionCount":
		return row[columnName];
	case "failures":
	case "successes":
		return Math.round((row[columnName] / row["executionCount"]) * 100)
				+ "%";
	case "executions":
		var execs = row[columnName];
		return createExecProgress(row, execs);
	case "lastExecution":
		return createLastExecCell(row, row[columnName]);
	case "severity":
		var color = severityColor[row[columnName]];
		return "<div class='label label-" + color + "'>" + row[columnName]
				+ "</div>";
	case "maturity":
		return "<div class='label label-primary'>" + row[columnName] + "</div>";
	case "actions":
		return createActionsCell(row[columnName]);
	default:
		return "columnName:" + row[columnName].name;
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
	d3.xhr(job).post(params, function(error, data) {
		// callback
		if (error) {
			console.log('ERROR', error);
		} else {
			console.log('SUCCESS', data);
		}

	});
}

function escape(str){ str = str.replace(/"/g, '\\"');str = str.replace(/'/g, "\\'");return str;}

function createActionsCell(actions) {
	if (!actions) {
		return "";
	}
	var result = "";
	actions.forEach(function(action) {
		var onclick = action.job ? "onclick=\"rerun('" + action.job + "','"
				+ escape(action.data) + "')\"" : "";
		result += "<a href='" + action.url + "' " + onclick + ">" + action.name
				+ " </a>";
	});

	return result;
}

function createLastExecCell(row, lastExec) {
	if (!lastExec) {
		return "n/a";
	}
	var color = lastExec.scenario.result == "FAILURE" ? "danger" : "success";
	var classed = "label label-" + color;
	var formattedTimestamp = timeFormat(new Date(lastExec.scenario.timestamp));
	return "<div class='" + classed + "'>" + lastExec.scenario.result
			+ "</div> " + "<a href='" + lastExec.build.url + "'>#"
			+ lastExec.build.number + " </a> " + "<span style=''> "
			+ formattedTimestamp + " </span> " + "<span style=''> "
			+ formatDuration(lastExec.build.duration) + "</span> "
			+ "<br><span style=''>Tags: " + row.scenario.tagList + "</span>";
}

function createExecProgress(scenario, executions) {
	var count = executions.length;
	if (count == 0) {
		return "no executions";
	}
	var width = 100 / count;
	var result = "<div class='progress'>";
	for ( var eIds in executions) {
		var exec = executions[eIds];
		var striped = exec.scenario.pending ? "progress-bar-striped" : "";
		var color = "progress-bar-"
				+ (exec.scenario.result == "FAILURE" ? "danger" : "success");
		result += "<a href='" + exec.build.url + "' title='Build "
				+ scenario.job.name + "#" + exec.build.number + "<br>"
				+ new Date(exec.build.timestamp)
				+ "'><div class='progress-bar " + striped + " " + color
				+ "' style='width: " + width + "%; border:1px solid #777;'>"
				// +"<span class='sr-only'></span>"
				+ "</div></a>";

	}
	result += "</div>";

	return result;
}

function formatDuration(durMs) {
	var seconds = durMs / 1000;
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