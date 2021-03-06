//============ URL  + fetch methods ============= 
var JSON_API = "/api/json";
var PARAM_DEPTH = "depth=";
var PARAM_PRETTY = "pretty=true";
var PARAM_JOB_TREE = "name,displayName,"+
"builds[number,result,url,timestamp,duration,artifacts[relativePath,fileName],actions[parameters[name,value]]]," +
"activeConfigurations[name,displayName,builds[number,result,url,timestamp,duration,artifacts[relativePath,fileName],actions[parameters[name,value]]]]";
var PARAM_ALL_TREE = "jobs["+ PARAM_JOB_TREE +"]";

var artifactMap = d3.map();
var pendingFetches = 0;
var totalFetches = 0;
var alreadyFetched = 0;

function fetchJson(url, callback, errorCallback) {
	d3.json(url)
	    //.header("Access-Control-Allow-Origin", "http://127.0.0.1")
	    //.header("Access-Control-Allow-Origin", "null")
	    .get(function(error, json) {
		if (error) {
			if (errorCallback) {
				errorCallback(error);
			} else
				console.log(error);
		} else {
			callback(json);
		}
	});
}

function depth(d) {
	return PARAM_DEPTH + d;
}

function fetchBigJenkinsJson(config, callback, progressCallback, errorCallback) {
	if (!progressCallback) {
		progressCallback = function() {
		};
	}
	if (!errorCallback) {
		errorCallback = function(error) {
			console.log("Impossible to fetch jobs from Jenkins !", error);
		};
	}
	// init
	artifactMap = d3.map();
	pendingFetches = 0;

	// fetch the big Json containing all
	var url = config.jenkinsUrl;
	var query = "tree="+PARAM_ALL_TREE;
	if(config.jobName){
		///job/rtv-sel-parameterized-chrome/
		url += "/job/" + config.jobName;
		query = "tree="+PARAM_JOB_TREE;
	} 
	url += JSON_API + "?" + depth(1) + "&"
			+ (config.debug ? PARAM_PRETTY : "") + "&" + query;
	
	progressCallback({
		message : "fetch started..."
	});
	var theconfigishere = config;
	console.log("Fetching main json from Jenkins API at ", url)
	fetchJson(url,
			function(data) {
				progressCallback({
					message : "got main JSON"
				});
				//if only one job, wrap the single response into an array
				if(theconfigishere.jobName){
					data.jobs = [data];
				}
				console.log("Total jobs count in Jenkins:" + data.jobs.length);
				var jobs = extractJobsWithActiveConfigurations(data.jobs);
				console.log("Jobs with active configuration:" + jobs.length);

				// for each job, config, build... fetch the artifacts !
				var filteredJobs = [];
				for ( var jIdx in jobs) {
					var job = jobs[jIdx];
					//FIXME: filter on one specific job
//					if(job.name!='rtv-master-sel-NonRegression-Parallel'){
//						continue;
//					}
					var filteredConfigs = [];
					// check in the activeConfigurations builds
					for ( var cIdx in job.activeConfigurations) {
						var config = job.activeConfigurations[cIdx];
						var filteredBuilds = [];
						for ( var bIdx in config.builds) {
							var build = config.builds[bIdx];
							
							// Filter the builds that doesn't correspond to the wanted branch
							branchName = getBranchName(build.actions[0].parameters);
							if (branchName && theconfigishere.branchName && branchName != theconfigishere.branchName) {
								continue;
							}
							
							// Filter the builds that doesn't have json artifact
							var hasArtifacts = fetchBuildArtifacts(job, config,
									build, function(d) {
										// when everything is fetched, return
										// the jobs
										if (pendingFetches == 0) {
											progressCallback({
												message : "All jobs fetched ! "
											});
											callback(jobs);
										}
									}, function(error) {
										console.log("ERROR for "
												+ createKey(job, config, build)
												+ " ", error);
									}, progressCallback);
							if (hasArtifacts) {
								filteredBuilds.push(build);
							} else {
							}
						}

						// clean the config with the filteredBuilds
						config.builds = filteredBuilds;
						if (!!config.builds && config.builds.length > 0) {
							filteredConfigs.push(config);
						}
					}
					job.activeConfigurations = filteredConfigs;
					if (job.activeConfigurations
							&& job.activeConfigurations.length > 0) {
						filteredJobs.push(job);
					}

				}
				jobs = filteredJobs;
			}, errorCallback);
}

function getBranchName(parameters) {
	for(idP in parameters) {
		parameter = parameters[idP];
		if(parameter.name == "BRANCH_NAME") {
			return parameter.value;
		}
	}
	return "";
}

// ============ Process JSON =============

function extractJobsWithActiveConfigurations(jobs) {

	return jobs.filter(function(job) {
		// also append a fake configuration if the job has some artifacts
		var hasArtifacts = false;
		if (job.builds) {
			job.builds.forEach(function(build) {
				if (build.artifacts && build.artifacts.length > 0) {
					hasArtifacts = true;
				}
			})
		}
		if (hasArtifacts) {
			// create a "no config" object for artifacts that are not in a
			// configuration
			var fakeConfig = {
				name : "no config",
				displayName : "no config",
				url : "javascript:void(0)"
			};
			fakeConfig.builds = job.builds;
			if (!job.activeConfigurations) {
				job.activeConfigurations = [];
			}
			job.activeConfigurations.push(fakeConfig);
		}
		return hasArtifacts || !!job.activeConfigurations;
	});
}

// ============ Cucumber JSON =============

function createKey(job, config, build, relativePath) {
	return job.name + "_" + config.name + "_" + build.number + "_"
			+ relativePath;
}

function fetchBuildArtifacts(job, config, build, callback, errorCallback,
		progressCallback) {
	if (build.artifacts) {
		var filteredArtifacts = [];
		for ( var artifactIdx in build.artifacts) {
			// TODO: handle other file names...
			var artifact = build.artifacts[artifactIdx];
			if (artifact.fileName && artifact.fileName.match(".*\\.json")) {
				var artifactKey = createKey(job, config, build,
						artifact.relativePath);
				var artifactValue = artifactMap.get(artifactKey);
				// the artifact is not already loading
				if (!artifactValue) {
					artifactValue = {
						job : job,
						config : config,
						build : build,
						artifact : artifact,
					}
					artifactMap.set(artifactKey, artifactValue);
				}
				if (artifactValue.status == "loaded") {
					callback(artifactValue.contents);
					return;
				}
				if (artifactValue.status != "loading") {
					artifactValue.status = "loading";
					artifactValue.url = build.url + "artifact/"
							+ artifact.relativePath;
					totalFetches++;
					pendingFetches++;
					fetchJson(artifactValue.url, function(d) {
						alreadyFetched++;
						pendingFetches--;
						progressCallback({
							message : "Fetching cucumber JSON files (" + job.name + ")",
							alreadyFetched : alreadyFetched,
							totalFetches : totalFetches,
							pendingFetches : pendingFetches
						});
						artifactValue.contents = d;
						artifactValue.status = "loaded";
						callback(artifactValue);
					}, function(error) {
						pendingFetches--;
						errorCallback(error);
					});
				}
				// store the augmented artifact object
				filteredArtifacts.push(artifactValue);
			}
		}
		build.artifacts = filteredArtifacts;
	}

	return !!build.artifacts && build.artifacts.length > 0;
}

// ============ Cucumber JSON =============

