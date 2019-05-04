/* Magic Mirror
 * Node Helper: MMM-OneTouchReveal
 *
 * By github.com/canonip
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
//var request = require('request');
var querystring = require('querystring');
const axios = require('axios');
var moment = require('moment');


module.exports = NodeHelper.create({
	start: function () {
	},
	getData: function (username, password, startTime, endTime, url) {
		const tokenEndpoint = "https://" + url + "/"
		const dataEndpoint = "https://" + url + "/a/";
		var settings = {};
		var self = this;
		var settings = {}
		//Get Token
		axios({
			method: 'GET',
			url: tokenEndpoint,
			withCredentials: true
		}).then(function (response) {
			//Get token from cookie
			var cookies = response.headers['set-cookie'];
			var token = cookies.find(function (element) {
				return element.includes('cstkn');
			}).split(';')[0];
			//Token (cookie) is formatted as cstkn={token}
			settings.token = token.split("=")[1]
			settings.cookies = token
			//Create LoginRequest and login
			var ajaxRequest = [
				{
					"moduleName": "Account",
					"methodCall": "login",
					"params": [
						{
							"username": username,
							"password": password,
							"clientTime": moment().format('YYYY-MM-DD HH:mm')
						}
					]
				}
			]
			return axios({
				method: 'POST',
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					'From': settings.token,
					'Cookie': settings.cookies
				},
				data: querystring.stringify({ ajaxRequest: JSON.stringify(ajaxRequest) }),
				url: dataEndpoint,
				withCredentials: true
			});
		}).then(function (response) {
			//Save Login Token (ONETOUCHREVEAL)
			//The server returns 2 Cookies with the same name (ONETOUCHREVEAL), but only accepts the second one (24 Characters and not 26) as the valid token
			if (!response.data.success)
				throw response.data.response
			var cookies = response.headers['set-cookie'];
			var reveal = cookies.filter(function (element) {
				return element.includes('ONETOUCHREVEAL');
			})[1].split(';')[0]
			//Add ONETOUCHREVEAL token to cookies
			settings.cookies += "; " + reveal;

			//Create reading request and get readings
			var ajaxRequest = [
				{
					"moduleName": "Readings",
					"methodCall": "getReadingsJSON",
					"params": [
						{
							"endDateString": endTime,
							"startDateString": startTime
						}
					]
				}
			]
			return axios({
				method: 'POST',
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					'From': settings.token,
					'Cookie': settings.cookies,
				},
				data: querystring.stringify({ ajaxRequest: JSON.stringify(ajaxRequest) }),
				url: dataEndpoint,
				withCredentials: true
			});
		}).then(function (response) {
			if (!response.data.success)
				throw response.data
			self.sendSocketNotification("DATA", response.data.response);
		}).catch(function (error) {
			self.sendSocketNotification("ERROR", error);
			console.error("error:", error);
		});
	},

	socketNotificationReceived: function (notification, payload) {
		var self = this;
		if (notification === 'SYNC_DATA') {
			self.sendSocketNotification("Syncing...", {});
			this.getData(payload.config.username, payload.config.password, payload.config.from, payload.config.end, payload.config.url);
		}
	}
});
