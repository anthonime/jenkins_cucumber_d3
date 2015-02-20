var scenarioMap;

function getFilter() {

}

function processJson(jobsWithActiveConfiguration, config) {
	console.log("filter scenarios using ", config)
	var result = {
		jobs : d3.map(),
		configurations : d3.map(),
		features : d3.map(),

		scenarios : d3.map(),
		allScenarios : [],

		tags : [],
		status : {
			"OK" : 0,
			"FIXED" : 0,
			"RECENTLY_FIXED" : 0,
			"REGRESSION" : 0,
			"PERSISTENT_REGRESSION" : 0,
			"KO" : 0,
			"DONE" : 0,
			"RECENTLY_DONE" : 0,
			"PENDING" : 0,
			"RANDOMNESS" : 0
		},
		allKos : 0
	};
	scenarioMap = d3.map();

	for ( var jIdx in jobsWithActiveConfiguration) {
		var job = jobsWithActiveConfiguration[jIdx];
		// job > configs > builds > artifacts > features > scenario
		// scenarios > builds >
		for ( var cIdx in job.activeConfigurations) {

			var activeConfiguration = job.activeConfigurations[cIdx];

			for ( var bIdx in activeConfiguration.builds) {

				var build = activeConfiguration.builds[bIdx];

				for ( var aIdx in build.artifacts) {
					var artifact = build.artifacts[aIdx];
					processArtifact(config, job, activeConfiguration, build, artifact);
				}

			}
		}
	}

	result.scenarios = scenarioMap.values();
	result.allScenarios = scenarioMap.values();
	result.allKos = 0;
	// now, in each scenario, order the executions by timestamp
	if (result.scenarios) {
		result.scenarios.forEach(function(s) {

			if (s.executions) {
				s.executions.sort(function(a, b) {
					return parseInt(a.build.number) - parseInt(b.build.number);
				});

				// s.executions should be chronologically ordered

				computeAnalysis(s);

				var severity = s.severity.replace(/ /g, "_");
				result.status[severity] += 1;
				result.allKos += config.KO_STATUSES.indexOf(severity) > -1 ? 1 : 0;
			}
			//

			if (s.scenario.tags) {
				s.scenario.tagList = s.scenario.tags.map(function(d) {
					return d.name;
				}).join(',');
			}

			var tagsOptions = "";
			if (s.scenario.tagList) {
				tagsOptions = "'" + s.scenario.tagList.split(",").map(function(d) {
					return "--tags " + d + "";
				}).join(' ') + "'";
			}
			if (config.rerunJobName) {
				s.actions = [ {
					name : "Run",
					url : "javascript:void(0)",
					job : config.jenkinsUrl + "/job/" + config.rerunJobName + "/buildWithParameters",
					parameters : {
						CUCUMBER_OPTIONS : tagsOptions
					}
				} ];
			}

			// get all the features, jobs, and configurations
			var jobCount = result.jobs.get(s.job.name);
			result.jobs.set(s.job.name, !jobCount ? 1 : ++jobCount);

			var featureCount = result.features.get(s.feature.name);
			result.features.set(s.feature.name, !featureCount ? 1 : ++featureCount);

			var configurationCount = result.configurations.get(s.configuration.name);
			result.configurations.set(s.configuration.name, !configurationCount ? 1 : ++configurationCount);

		});

		// apply filters
		// prepare name regexp
		var fnameregexp = null;
		if (config.fname) {
			try {
				fnameregexp = new RegExp(config.fname);
				result.fnameerror = null;
			} catch (e) {
				fnameregexp = null;
				result.fnameerror = e;
			}
		}
		// prepare tag regexp
		var ftagregexp = null;
		if (config.ftag) {
			try {
				ftagregexp = new RegExp(config.ftag);
				result.ftagerror = null;
			} catch (e) {
				ftagregexp = null;
				result.ftagerror = e;
			}
		}

		if (hasFilters(config)) {
			result.scenarios = result.scenarios.filter(function(scenario) {
				if (fnameregexp && !scenario.scenario.name.match(fnameregexp)) {
					return false;
				}
				if (ftagregexp && scenario.scenario.tags) {
					var noTagMatch = true;
					for ( var tagIds in scenario.scenario.tags) {
						var tag = scenario.scenario.tags[tagIds];
						if (tag.name.match(ftagregexp)) {
							// stop as soon as one tag is matching
							noTagMatch = false;
							break;
						}
					}
					if (noTagMatch) {
						return false;
					}
				}
				if (config.fjob && config.fjob != "All jobs" && scenario.job.name != config.fjob) {
					return false;
				}
				if (config.ffeature && config.ffeature != "All features" && scenario.feature.name != config.ffeature) {
					return false;
				}
				if (config.fconfig && config.fconfig != "All configs" && scenario.configuration.name != config.fconfig) {
					return false;
				}
				if (config.fstatus && config.fstatus.indexOf(scenario.severity.replace(/ /g, "_")) == -1) {
					return false;
				}
				return true;
			});
		}
	}

	return result;
}

function hasFilters(config) {
	return (config.fstatus && config.fstatus.length > 0) || !!config.fname || !!config.ftag || config.fjob && config.fjob != "All jobs"
			|| config.fconfig && config.fconfig != "All configs" || config.ffeature && config.ffeature != "All features";
}

function computeAnalysis(scenario) {
	var recentlyThreshold = 4;
	var randomnessThreshold = 0.45;

	var maturity = null;
	var severity = null;

	var executionCount = scenario.executions.length;
	var pendingCount = 0;
	var failureCount = 0;
	var successCount = 0;
	var changeCount = 0;
	var stableStatusCount = 0;
	var currentStatus = null;
	scenario.executions.forEach(function(exec) {
		if (currentStatus != null) {
			if (exec.scenario.result != currentStatus) {
				changeCount++;
				stableStatusCount = 0;
			} else {
				stableStatusCount++;
			}
		}
		// update current status
		currentStatus = exec.scenario.result;
		pendingCount += exec.scenario.pending ? 1 : 0;
		failureCount += currentStatus == "FAILURE" ? 1 : 0;
		successCount += currentStatus == "SUCCESS" ? 1 : 0;
	});

	var isRecent = stableStatusCount < recentlyThreshold;

	if (scenario.lastExecution.scenario.pending) {
		// PENDING
		if (pendingCount == executionCount) {
			maturity = "PENDING";
			if (currentStatus == "FAILURE") {
				severity = "PENDING";
			} else {
				severity = (isRecent ? "RECENTLY " : "") + "DONE";
			}
		}
		// or REWORK
		else {
			maturity = "REWORK";
			severity = currentStatus == "FAILURE" ? "PENDING" : ((isRecent ? "RECENTLY " : "") + "DONE");
		}

	} else {
		// NEW
		if (pendingCount > 0) {
			maturity = "NEW";
		}
		// or MATURE
		else {
			maturity = "MATURE";
		}

		if (failureCount == 0) {
			severity = "OK";
		} else if (successCount == 0) {
			severity = "KO";
		} else if (currentStatus == "FAILURE") {
			severity = (isRecent ? "" : "PERSISTENT ") + "REGRESSION";
		} else {
			severity = (isRecent ? "RECENTLY " : "") + "FIXED";
		}
	}

	// overwrite everything if the scenario is random
	var isRandom = (changeCount / executionCount) > randomnessThreshold;
	if (isRandom) {
		severity = "RANDOMNESS";
	}

	scenario.severity = severity;
	scenario.maturity = maturity;
}
function getOrCreateScenarioRow(job, config, artifact, feature, scenario) {
	var key = job.name + "" + config.name + "" + scenario.id;
	var value = scenarioMap.get(key);
	if (!value) {
		value = {
			scenario : {
				id : scenario.id,
				name : scenario.name,
				tags : scenario.tags,
			},
			feature : {
				id : feature.id,
				name : feature.name,
				fileName : feature.uri,
			},
			job : {
				id : job.id,
				name : job.name,
				url : job.url,
			},
			configuration : {
				id : config.id,
				name : config.name,
				url : config.url,
			},
			executionCount : 0,
			failures : 0,
			successes : 0,
			executions : [],
			lastExecution : null

		};
		scenarioMap.set(key, value);
	}
	return value;
}

function computeScenarioObject(configuration, build, scenario) {
	var result = {
		duration : 0,
		result : "SUCCESS",
		timestamp : build.timestamp,
		pending : false
	}

	function computeResultAndAppendDuration(d) {
		if (d.result) {
			switch (d.result.status) {
			case "failed":
				result.result = "FAILURE";
				break;
			case "skipped":
			case "passed":
				break;
			default:
				break;
			}
			if (!isNaN(d.result.duration)) {
				result.duration += d.result.duration;
			}
		}
	}
	if (scenario.steps)
		scenario.steps.forEach(computeResultAndAppendDuration);
	if (scenario.after)
		scenario.after.forEach(computeResultAndAppendDuration);
	if (scenario.before) {
		scenario.before.forEach(computeResultAndAppendDuration);
	}

	if (scenario.tags) {
		scenario.tags.forEach(function(tag) {
			result.pending |= (tag.name == configuration.pendingTagName);
		});
	}

	return result;
}

function createExecution(configuration, job, config, build, artifact, feature, scenario) {

	return {
		build : build,
		scenario : computeScenarioObject(configuration, build, scenario)
	};
}

function processArtifact(configuration, job, config, build, artifact) {

	// console.log(artifact);
	// retrieve all the scenarios

	if (!artifact.contents) {
		console.log("cannot process artifact ", artifact);
		return;
	}

	artifact.contents.forEach(function(feature) {
		// console.log(feature);
		// feature.id
		// feature.description
		// feature.keyword="Feature"
		// feature.name
		// feature.uri
		// feature.tags
		// feature.elements
		if (!feature.elements) {
			return;
		}
		feature.elements.forEach(function(scenario) {
			// scenario.
			// after,before,description,id,keyword'"Scenario Outline"
			// line,name,steps,tags,type="scenario"
			// steps:
			var scenarioRow = getOrCreateScenarioRow(job, config, artifact, feature, scenario);
			scenarioRow.executionCount++;
			var execution = createExecution(configuration, job, config, build, artifact, feature, scenario);
			scenarioRow.executions.push(execution);
			setOrNotLastExecution(scenarioRow, execution);
			if (execution.scenario.result == "FAILURE") {
				scenarioRow.failures++;
			} else {
				scenarioRow.successes++;
			}
		});

	});

}

function setOrNotLastExecution(scenario, execution) {
	if (!scenario.lastExecution || scenario.lastExecution.scenario.timestamp < execution.scenario.timestamp) {
		scenario.lastExecution = execution;
	}
}