/* global Module */

/* Magic Mirror
 * Module: MMM-OneTouchReveal
 *
 * By 
 * MIT Licensed.
 */

Module.register("MMM-OneTouchReveal", {
	defaults: {
		updateInterval: 5 * 60 * 1000, // every 5 minutes
		animationSpeed: 1000,
		highGlucoseColor: "#f44336",
		goodGlucoseColor: "#4caf50",
		lowGlucoseColor: "#2196f3",
		colorEnabled: false,
		url: "onetouchreveal.de",
		lastDateFormat: 'DD. MMM HH:mm',
		lastDateFormatToday: 'HH:mm',
		chartDateFormat: 'MMM D',
		width: "500px",
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function () {
		//Flag for check if module is loaded
		Log.log("Starting module: " + this.name);
		this.loaded = false;
		this.sendSocketNotification('SYNC_DATA', { config: this.config });
		this.dataTimer();
	},

	// start interval timer to update data every 5 minutes
	dataTimer: function () {
		var self = this;
		this.dataID = setInterval(function () {
			//Show Data from 1 Week
			self.from = moment().subtract(1, "week").format('YYYYMMDD');
			self.end =  moment().format('YYYYMMDD');
			self.sendSocketNotification('SYNC_DATA', { config: self.config }); 
			}, this.config.updateInterval);
	},

	getColor: function (value) {
		var upperLimit = this.glucosedata.targetRangeHigh
		var lowerLimit = this.glucosedata.targetRangeLow

		if (!this.config.colorEnabled)
			return "white"
		if (value > upperLimit) {
			return this.config.highGlucoseColor
		} else if (value < lowerLimit) {
			return this.config.lowGlucoseColor
		}
		else {
			return this.config.goodGlucoseColor;
		}
	},
	getBS: function () {
		var self = this
		if (!self.glucosedata)
			return document.createElement("div")
		var unit = self.glucosedata.readingList.find(x => x.unit != undefined).unit
		var readings = self.glucosedata.readingList.filter(x => x.displayValue != undefined)
		var values = readings.map(x => x.displayValue)
		var lastValue = values[values.length - 1]
		var lastReading = moment(new Date(readings[readings.length - 1].readingDate))
		var preLastValue = values[values.length - 2]
		var delta = lastValue - preLastValue;
		var threshold = 10;

		var direction = "fa-long-arrow-alt-" + (Math.abs(delta) < threshold ? "right" : (delta < 0 ? "down" : "up"))
		let div = document.createElement("div");
		div.style = "float: left;clear: none;";
		let bs = document.createElement("div");
		bs.style = 'display: table;';
		let bsStyle = "display: table-cell;vertical-align:middle;color:" + self.getColor(lastValue) + ";"
		//Reading
		let readingSpan = document.createElement("span");
		readingSpan.className = "bright large light"
		readingSpan.style = bsStyle
		readingSpan.innerHTML = lastValue

		//Direction
		let directionSpan = document.createElement("span");
		directionSpan.className = "bright medium light"
		directionSpan.style = "display: table-cell;vertical-align:middle;"
		directionSpan.innerHTML = '<i class="fas ' + direction + '"></i>'

		//Delta
		let deltaSpan = document.createElement("span");
		deltaSpan.className = "light medium"
		deltaSpan.style = "display: table;vertical-align:middle;"
		deltaSpan.innerHTML = delta + " " + unit

		//Time
		let timeSpan = document.createElement("span");
		timeSpan.className = "light medium"
		timeSpan.style = "display: table;vertical-align:middle;"
		let isToday = moment().startOf("day").isSame(moment(lastReading).startOf("day"))
		if (isToday)
			timeSpan.innerHTML = this.translate("TODAY") + " " + lastReading.format(self.config.lastDateFormatToday)
		else
			timeSpan.innerHTML = lastReading.format(self.config.lastDateFormat)
		let timeDeltaDiv = document.createElement("div");
		timeDeltaDiv.style = 'display: table;';
		timeDeltaDiv.appendChild(deltaSpan)
		timeDeltaDiv.appendChild(timeSpan)

		bs.appendChild(readingSpan)
		bs.appendChild(directionSpan)
		bs.appendChild(timeDeltaDiv)

		div.appendChild(bs)
		return div;
	},
	getDom: function () {
		var self = this;

		// create element wrapper for show into the module
		var wrapper = document.createElement("div");

		// If this.dataRequest is not empty
		if (self.glucosedata) {
			var pointBackgroundColors = [];
			var values = self.glucosedata.readingList.filter(x => x.displayValue != undefined).map(x => x.displayValue);
			for (i = 0; i < values.length; i++) {
				pointBackgroundColors.push(self.getColor(values[i]))
			}
			//Create View that shows latest value
			wrapper.appendChild(self.getBS());
			var unit = self.glucosedata.readingList.find(x => x.unit != undefined).unit;
			// Creating the canvas.

			let innerdiv = document.createElement("div")
			innerdiv.style = "width:" + self.config.width
			let ctx = document.createElement("canvas")
			// Adding the canvas to the document wrapper.
			innerdiv.appendChild(ctx);
			wrapper.appendChild(innerdiv);

			var options = {
				type: 'line',
				data: {
					labels: self.glucosedata.readingList.map(x => moment(new Date(x.readingDate))),
					datasets: [{
						data: values,
						pointBackgroundColor: self.config.colorEnabled ? pointBackgroundColors : 'white',
						pointBorderColor: self.config.colorEnabled ? pointBackgroundColors : 'white',
						borderColor: 'white',
						backgroundColor: "rgba(255,255,255,0.3)",
						fill: true,
						cubicInterpolationMode: 'monotone'
					}]
				},
				options: {
					layout: {
						padding: {
							left: 0,
							right: 30,
							top: 30,
							bottom: 0
						}
					},
					legend: {
						display: false,
					},
					plugins: {
						datalabels: {
							backgroundColor: self.config.colorEnabled ? pointBackgroundColors : 'gray',
							borderRadius: 4,
							color: 'white',
							anchor: 'end',
							clamp: true,
							formatter: function (value, context) {
								return value
							},
							align: 'end',
							offset: 8
						}
					},
					scales: {
						xAxes: [{
							type: 'time',
							distribution: 'linear',
							time: {
								unit: 'day'
							},
							ticks: {
								fontColor: "white",
							},
							gridLines: {
								display: false
							}

						}],
						yAxes: [{
							type: 'linear',
							position: 'left',
							ticks: {
								fontColor: "white",
								userCallback: function (item) {
									return item + " " + unit;
								}
							},
							displayFormats: {
								day: self.config.chartDateFormat
							},
							gridLines: {
								display: false
							}
						}]
					}
				}
			};
			new Chart(ctx.getContext('2d'), options);


		} else {
			wrapper.className = "text";
			if (!self.error) {
				wrapper.innerHTML = this.translate("LOADING");
			} else {
				wrapper.innerHTML = self.error
			}
		}
		return wrapper;
	},

	getScripts: function () {
		return [
			this.file('node_modules/chart.js/dist/Chart.min.js'),
			this.file('node_modules/chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.js'),
			'moment.js'
		];
	},

	getStyles: function () {
		return [
			"MMM-OneTouchReveal.css",
			'font-awesome.css'
		];
	},


	processData: function (data) {
		var self = this;
		this.dataRequest = data;
		if (this.loaded === false) { self.updateDom(self.config.animationSpeed); }
		this.loaded = true;
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		var self = this;
		Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + JSON.stringify(payload));
		if (notification === "ERROR") {
			Log.error(payload);
			self.error = payload;
			self.updateDom(self.config.animationSpeed);
		}
		if (notification === "DATA") {
			//if (JSON.stringify(self.glucosedata) !== JSON.stringify(payload)) {
				Log.log(this.name + " Updating Data", payload)
				self.error = null
				self.glucosedata = payload;
				self.updateDom(self.config.animationSpeed);
			//}
		}
	}
});
