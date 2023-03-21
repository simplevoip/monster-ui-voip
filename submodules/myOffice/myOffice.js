define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster'),
		Chart = require('chart');

	var app = {

		requests: {
			'google.geocode.address': {
				apiRoot: '//maps.googleapis.com/',
				url: 'maps/api/geocode/json?address={zipCode}',
				verb: 'GET',
				generateError: false,
				removeHeaders: [
					'X-Kazoo-Cluster-ID',
					'X-Auth-Token',
					'Content-Type'
				]
			}
		},

		subscribe: {
			'voip.myOffice.render': 'myOfficeRender',
			'auth.continueTrial': 'myOfficeWalkthroughRender',
			'myaccount.closed': 'myOfficeAfterMyaccountClosed'
		},

		chartColors: [
			'#B588B9', // Purple ~ Mauve
			'#698BF7', // Purple ~ Dark Blue
			'#009AD6', // Blue
			'#6CC5E9', // Light Blue
			'#719B11', // Dark Green
			'#BDE55F', // Light Green
			'#F1E87C', // Pale Yellow
			'#EF8F25', // Orange
			'#6F7C7D' // Grey
		],

		staticNonNumbers: ['0', 'undefined', 'undefinedconf', 'undefinedfaxing', 'undefinedMainNumber'],

		/* My Office */
		myOfficeRender: function(args) {
			var self = this,
				parent = args.parent || $('.right-content'),
				callback = args.callback;

			self.myOfficeLoadData(function(myOfficeData) {
				var dataTemplate = {
						isCnamEnabled: monster.util.isNumberFeatureEnabled('cnam'),
						account: myOfficeData.account,
						totalUsers: myOfficeData.users.length,
						totalDevices: myOfficeData.devices.length,
						unregisteredDevices: myOfficeData.unregisteredDevices,
						totalNumbers: _.size(myOfficeData.numbers),
						totalConferences: myOfficeData.totalConferences,
						totalChannels: myOfficeData.totalChannels,
						mainNumbers: myOfficeData.mainNumbers || [],
						confNumbers: myOfficeData.confNumbers || [],
						faxingNumbers: myOfficeData.faxingNumbers || [],
						faxNumbers: myOfficeData.faxNumbers || [],
						topMessage: myOfficeData.topMessage,
						devicesList: _.orderBy(myOfficeData.devicesData, 'count', 'desc'),
						usersList: _.orderBy(myOfficeData.usersData, 'count', 'desc'),
						assignedNumbersList: _.orderBy(myOfficeData.assignedNumbersData, 'count', 'desc'),
						classifiedNumbers: _.orderBy(myOfficeData.classifiedNumbers, 'count', 'desc'),
						directoryUsers: myOfficeData.directory.users && (myOfficeData.directory.users.length || 0),
						directoryLink: myOfficeData.directoryLink,
						showUserTypes: self.appFlags.global.showUserTypes
					},
					template = $(self.getTemplate({
						name: 'layout',
						data: dataTemplate,
						submodule: 'myOffice'
					})),
					$devicesCanvas = template.find('#dashboard_devices_chart'),
					$assignedNumbersCanvas = template.find('#dashboard_assigned_numbers_chart'),
					$classifiedNumbersCanvas = template.find('#dashboard_number_types_chart'),
					emptyDataSet = [
						{
							count: 1,
							color: '#ddd'
						}
					],
					devicesDataSet = _.sortBy(myOfficeData.devicesData, 'count'),
					usersDataSet = _.sortBy(myOfficeData.usersData, 'count'),
					assignedNumbersDataSet = _.sortBy(myOfficeData.assignedNumbersData, 'count'),
					classifiedNumbersDataSet = _.sortBy(myOfficeData.classifiedNumbers, 'count'),
					createDoughnutCanvas = function createDoughnutCanvas($target) {
						var args = Array.prototype.slice.call(arguments),
							datasets;

						args.splice(0, 1);

						datasets = args;

						return new Chart($target, $.extend(true, {
							type: 'doughnut',
							options: {
								legend: {
									display: false
								},
								tooltips: {
									enabled: false
								},
								animation: {
									easing: 'easeOutCirc',
									animateScale: true
								},
								events: []
							}
						}, {
							data: {
								datasets: datasets
							}
						}));
					};

				devicesDataSet = _.isEmpty(devicesDataSet) ? emptyDataSet : devicesDataSet;
				usersDataSet = _.isEmpty(usersDataSet) ? emptyDataSet : usersDataSet;
				assignedNumbersDataSet = _.isEmpty(assignedNumbersDataSet) ? emptyDataSet : assignedNumbersDataSet;
				classifiedNumbersDataSet = _.isEmpty(classifiedNumbersDataSet) ? emptyDataSet : classifiedNumbersDataSet;

				// Trick to adjust the vertical positioning of the number types legend
				if (myOfficeData.classifiedNumbers.length <= 3) {
					template.find('.number-types-legend').addClass('size-' + myOfficeData.classifiedNumbers.length);
				}

				self.myOfficeBindEvents({
					parent: parent,
					template: template,
					myOfficeData: myOfficeData
				});

				parent
					.empty()
					.append(template);

				createDoughnutCanvas($devicesCanvas, {
					data: _.map(devicesDataSet, 'count'),
					backgroundColor: _.map(devicesDataSet, 'color'),
					borderWidth: 0
				});

				createDoughnutCanvas($assignedNumbersCanvas, {
					data: _.map(assignedNumbersDataSet, 'count'),
					backgroundColor: _.map(assignedNumbersDataSet, 'color'),
					borderWidth: 0
				});

				createDoughnutCanvas($classifiedNumbersCanvas, {
					data: _.map(classifiedNumbersDataSet, 'count'),
					backgroundColor: _.map(classifiedNumbersDataSet, 'color'),
					borderWidth: 0
				});

				if (dataTemplate.showUserTypes) {
					var $usersCanvas = template.find('#dashboard_user_type_chart');

					createDoughnutCanvas($usersCanvas, {
						data: _.map(usersDataSet, 'count'),
						backgroundColor: _.map(usersDataSet, 'color'),
						borderWidth: 0
					});
				}

				self.myOfficeCheckWalkthrough();

				callback && callback();
			});
		},

		// we check if we have to display the walkthrough:
		// first make sure it's not a trial, then
		// only show it if we've already shown the walkthrough in myaccount
		myOfficeCheckWalkthrough: function() {
			var self = this;

			if (!monster.apps.auth.currentAccount.hasOwnProperty('trial_time_left')) {
				monster.pub('myaccount.hasToShowWalkthrough', function(response) {
					if (response === false) {
						self.myOfficeWalkthroughRender();
					}
				});
			}
		},

		myOfficeAfterMyaccountClosed: function() {
			var self = this;

			// If it's not a trial, we show the Walkthrough the first time
			// because if it's a trial, myOfficeWalkthroughRender will be called by another event
			if (!monster.apps.auth.currentAccount.hasOwnProperty('trial_time_left')) {
				self.myOfficeWalkthroughRender();
			}
		},

		myOfficeCreateMainVMBoxIfMissing: function(callback) {
			var self = this;

			self.myOfficeHasMainVMBox(
				function(vmbox) {
					callback(vmbox);
				},
				function() {
					self.myOfficeCreateMainVMBox(function(vmbox) {
						callback(vmbox);
					});
				}
			);
		},

		myOfficeCreateMainVMBox: function(callback) {
			var self = this,
				vmboxData = {
					mailbox: '0',
					type: 'mainVMBox',
					name: self.i18n.active().myOffice.mainVMBoxName,
					delete_after_notify: true
				};

			self.callApi({
				resource: 'voicemail.create',
				data: {
					accountId: self.accountId,
					data: vmboxData
				},
				success: function(vmbox) {
					callback && callback(vmbox.data);
				}
			});
		},

		myOfficeHasMainVMBox: function(hasVMBoxCallback, noVMBoxCallback) {
			var self = this;

			self.callApi({
				resource: 'voicemail.list',
				data: {
					accountId: self.accountId,
					filters: {
						filter_type: 'mainVMBox'
					}
				},
				success: function(vmboxes) {
					if (vmboxes.data.length > 0) {
						hasVMBoxCallback && hasVMBoxCallback(vmboxes[0]);
					} else {
						noVMBoxCallback && noVMBoxCallback();
					}
				}
			});
		},

		myOfficeLoadData: function(callback) {
			var self = this;
			monster.parallel({
				account: function(parallelCallback) {
					self.callApi({
						resource: 'account.get',
						data: {
							accountId: self.accountId
						},
						success: function(dataAccount) {
							parallelCallback && parallelCallback(null, dataAccount.data);
						}
					});
				},
				mainVoicemailBox: function(parallelCallback) {
					self.myOfficeCreateMainVMBoxIfMissing(function(vmbox) {
						parallelCallback(null, vmbox);
					});
				},
				users: function(parallelCallback) {
					self.callApi({
						resource: 'user.list',
						data: {
							accountId: self.accountId,
							filters: {
								paginate: 'false'
							}
						},
						success: function(dataUsers) {
							parallelCallback && parallelCallback(null, dataUsers.data);
						}
					});
				},
				devices: function(parallelCallback) {
					self.callApi({
						resource: 'device.list',
						data: {
							accountId: self.accountId,
							filters: {
								paginate: 'false'
							}
						},
						success: function(data) {
							parallelCallback && parallelCallback(null, data.data);
						}
					});
				},
				devicesStatus: function(parallelCallback) {
					self.callApi({
						resource: 'device.getStatus',
						data: {
							accountId: self.accountId,
							filters: {
								paginate: 'false'
							}
						},
						success: function(data) {
							parallelCallback && parallelCallback(null, data.data);
						}
					});
				},
				numbers: function(parallelCallback) {
					self.callApi({
						resource: 'numbers.list',
						data: {
							accountId: self.accountId,
							filters: {
								paginate: 'false'
							}
						},
						success: function(data) {
							parallelCallback && parallelCallback(null, data.data.numbers);
						}
					});
				},
				channels: function(parallelCallback) {
					self.callApi({
						resource: 'channel.list',
						data: {
							accountId: self.accountId,
							filters: {
								paginate: 'false'
							}
						},
						success: function(data) {
							parallelCallback && parallelCallback(null, data.data);
						}
					});
				},
				callflows: function(parallelCallback) {
					self.callApi({
						resource: 'callflow.list',
						data: {
							filters: {
								has_type: 'type',
								paginate: 'false'
							},
							accountId: self.accountId
						},
						success: function(data) {
							parallelCallback && parallelCallback(null, data.data);
						}
					});
				},
				classifiers: function(parallelCallback) {
					self.callApi({
						resource: 'numbers.listClassifiers',
						data: {
							accountId: self.accountId
						},
						success: function(data) {
							parallelCallback && parallelCallback(null, data.data);
						}
					});
				},
				directory: function(parallelCallback) {
					self.callApi({
						resource: 'directory.list',
						data: {
							accountId: self.accountId
						},
						success: function(data, status) {
							var mainDirectory = _.find(data.data, function(val) {
								return val.name === 'SmartPBX Directory';
							});
							if (mainDirectory) {
								self.callApi({
									resource: 'directory.get',
									data: {
										accountId: self.accountId,
										directoryId: mainDirectory.id,
										filters: {
											paginate: false
										}
									},
									success: function(data, status) {
										parallelCallback && parallelCallback(null, data.data);
									},
									error: function(data, status) {
										parallelCallback && parallelCallback(null, {});
									}
								});
							} else {
								parallelCallback && parallelCallback(null, {});
							}
						},
						error: function(data, status) {
							parallelCallback && parallelCallback(null, {});
						}
					});
				}
			}, function(error, results) {
				callback && callback(self.myOfficeFormatData(results));
			});
		},

		myOfficeFormatData: function(data) {
			var self = this,
				getColorByIndex = function getColorByIndex(index, customColors) {
					var colors = customColors || self.chartColors;
					return colors[index % colors.length];
				},
				reduceArrayToChartColorsSize = function reduceArrayToChartColorsSize(array) {
					if (_.size(array) <= _.size(self.chartColors)) {
						return array;
					}
					var newArray = array.slice(0, _.size(self.chartColors) - 1),
						overflowArray = array.slice(_.size(self.chartColors) - 1);
					return _.concat(newArray, {
						label: self.i18n.active().myOffice.others,
						count: _.sumBy(overflowArray, 'count')
					});
				},
				colorsOrderedForDeviceTypes = _.map([5, 0, 3, 1, 2, 4, 6, 7, 8], function(index) {
					return self.chartColors[index];
				}),
				staticNumberStatuses = ['assigned', 'spare'],
				showUserTypes = self.appFlags.global.showUserTypes,
				// staticNonNumbers = ['0', 'undefined', 'undefinedconf', 'undefinedfaxing', 'undefinedMainNumber'],
				specialNumberMatchers = {
					mainNumbers: { type: 'main', name: 'MainCallflow' },
					confNumbers: { type: 'conference', name: 'MainConference' },
					faxingNumbers: { type: 'faxing', name: 'MainFaxing' }
				},
				knownDeviceTypes = [
					'softphone',
					'mobile',
					'smartphone',
					'cellphone',
					'sip_uri',
					'sip_device',
					'landline',
					'fax',
					'ata',
					'application'
				],
				userCountByServicePlanRole = _
					.chain(data.users)
					.groupBy(function(user) {
						return showUserTypes
							? _
								.chain(user)
								.get('service.plans', { _unassigned: {} })
								.keys()
								.head()
								.value()
							: '_unassigned';
					})
					.mapValues(_.size)
					.value(),
				specialNumbers = _
					.chain(data.callflows)
					.groupBy(function(callflow) {
						return _.findKey(specialNumberMatchers, {
							type: callflow.type,
							name: callflow.name
						});
					})
					.omit('undefined')
					.mapValues(function(callflows) {
						return _.flatMap(callflows, function(callflow) {
							return _
								.chain(callflow.numbers)
								.reject(function(number) {
									return _.includes(self.staticNonNumbers, number);
								})
								.map(function(number) {
									return _.merge({
										number: number
									}, _.chain(data.numbers)
										.get(number, {})
										.pick('features')
										.value()
									);
								})
								.value();
						});
					})
					.value(),
				topMessage = (function(mainNumbers, account, numbers) {
					var shouldBypassCnam = !monster.util.isNumberFeatureEnabled('cnam'),
						callerIdExternalNumber = _.get(account, 'caller_id.external.number'),
						isExternalNumberSet = _.has(numbers, callerIdExternalNumber),
						hasValidCallerId = shouldBypassCnam || isExternalNumberSet,
						shouldBypassE911 = !monster.util.isNumberFeatureEnabled('e911'),
						callerIdEmergencyNumber = _.get(account, 'caller_id.emergency.number'),
						isEmergencyNumberSet = !!callerIdEmergencyNumber,
						hasValidE911 = shouldBypassE911 || isEmergencyNumberSet,
						messageKey,
						category = 'myOffice',
						subcategory = 'callerIdDialog';

					if (!hasValidCallerId && !hasValidE911) {
						messageKey = 'missingCnamE911Message';
					} else if (!hasValidCallerId) {
						messageKey = 'missingCnamMessage';
					} else if (!hasValidE911) {
						messageKey = 'missingE911Message';
						category = 'strategy';
						subcategory = 'main-number'
					}
					return !_.isEmpty(mainNumbers) && messageKey
						? {
							cssClass: 'btn-danger',
							message: _.get(self.i18n.active().myOffice, messageKey),
							category,
							subcategory
						}
						: undefined;
				}(specialNumbers.mainNumbers, data.account, data.numbers)),
				registeredDevices = _.filter(data.devicesStatus, (device) => device.registered),
				registeredDevicesById = _.map(registeredDevices, 'device_id');

			return _.merge({
				assignedNumbersData: _
					.chain(data.numbers)
					.groupBy(function(number) {
						return staticNumberStatuses[_.chain(number).get('used_by', '').isEmpty().toNumber().value()];
					})
					.map(function(numbers, type) {
						return {
							label: monster.util.tryI18n(self.i18n.active().myOffice.numberChartLegend, type),
							count: _.size(numbers),
							color: _
								.chain(staticNumberStatuses)
								.indexOf(type)
								.thru(function(index) {
									return getColorByIndex((index * 5) + 3);
								})
								.value()
						};
					})
					.value(),
				classifiedNumbers: _
					.chain(data.numbers)
					.keys()
					.groupBy(function(number) {
						return _.findKey(data.classifiers, function(value) {
							return new RegExp(value.regex).test(number);
						}) || 'unknown';
					})
					.map(function(numbers, classifier) {
						return {
							label: _.get(data.classifiers, [classifier, 'friendly_name'], monster.util.formatVariableToDisplay(classifier)),
							count: _.size(numbers)
						};
					})
					.orderBy('count', 'desc')
					.thru(reduceArrayToChartColorsSize)
					.map(function(metadata, index) {
						return _.merge({
							color: getColorByIndex(index)
						}, metadata);
					})
					.value(),
				devicesData: _
					.chain(data.devices)
					.groupBy('device_type')
					.merge(_.transform(knownDeviceTypes, function(object, type) {
						_.set(object, type, []);
					}, {}))
					.pickBy(function(devices, type) {
						if (!_.includes(knownDeviceTypes, type)) {
							console.log('Unknown device type: ' + type);
						}
						return _.includes(knownDeviceTypes, type);
					})
					.map(function(devices, type) {
						return {
							label: monster.util.tryI18n(self.i18n.active().devices.types, type),
							count: _.size(devices)
						};
					})
					.orderBy('count', 'desc')
					.thru(reduceArrayToChartColorsSize)
					.map(function(metadata, index) {
						return _.merge({
							color: getColorByIndex(index, colorsOrderedForDeviceTypes)
						}, metadata);
					})
					.value(),
				directoryLink: _.has(data, 'directory.id') && self.apiUrl + 'accounts/' + self.accountId + '/directories/' + data.directory.id + '?accept=pdf&paginate=false&auth_token=' + self.getAuthToken(),
				topMessage: topMessage,
				totalChannels: _
					.chain(data.channels)
					.map('bridge_id')
					.uniq()
					.size()
					.value(),
				totalConferences: _
					.chain(data.users)
					.reject(function(user) {
						return !_.includes(user.features, 'conferencing');
					})
					.size()
					.value(),
				unregisteredDevices: _
					.chain(data.devices)
					.filter(function(device) {
						var type = _.get(device, 'device_type'),
							isDeviceTypeKnown = _.includes(knownDeviceTypes, type),
							isDeviceDisabled = !_.get(device, 'enabled', false),
							isDeviceRegistered = _.includes(registeredDevicesById, device.id),
							isSipDevice = _.includes(['sip_device', 'smartphone', 'softphone', 'fax', 'ata'], type),
							isUnregisteredSipDevice = isSipDevice && !isDeviceRegistered,
							isDeviceOffline = isDeviceDisabled || isUnregisteredSipDevice;

						return isDeviceTypeKnown && isDeviceOffline;
					})
					.size()
					.value(),
				usersData: _
					.chain({
						_unassigned: {
							name: self.i18n.active().myOffice.userChartLegend.none
						}
					})
					.merge(showUserTypes ? self.appFlags.global.servicePlansRole : {})
					.map(function(role, id, roles) {
						return {
							label: role.name,
							count: _.get(userCountByServicePlanRole, id, 0),
							color: _
								.chain(roles)
								.keys()
								.indexOf(id)
								.thru(getColorByIndex)
								.value()
						};
					})
					.value()
			}, specialNumbers, data);
		},

		myOfficeBindEvents: function(args) {
			var self = this,
				parent = args.parent,
				template = args.template,
				myOfficeData = args.myOfficeData;

			template.find('.link-box').on('click', function(e) {
				var $this = $(this),
					category = $this.data('category'),
					subcategory = $this.data('subcategory');

				$('.category').removeClass('active');
				switch (category) {
					case 'users':
						$('.category#users').addClass('active');
						monster.pub('voip.users.render', { parent: parent });
						break;
					case 'devices':
						$('.category#devices').addClass('active');
						monster.pub('voip.devices.render', { parent: parent });
						break;
					case 'numbers':
						$('.category#numbers').addClass('active');
						monster.pub('voip.numbers.render', { parent: parent });
						break;
					case 'strategy':
						$('.category#strategy').addClass('active');
						monster.pub('voip.strategy.render', {
							parent: parent,
							openElement: subcategory
						});
						break;
					case 'myOffice':
						self.myOfficeOpenElement({
							data: myOfficeData,
							element: subcategory,
							parent: parent
						});
						break;
				}
			});

			template.find('.header-link.music-on-hold').on('click', function(e) {
				e.preventDefault();
				self.myOfficeRenderMusicOnHoldPopup({
					account: myOfficeData.account
				});
			});

			// if (monster.util.isNumberFeatureEnabled('cnam')) {
				template.find('.header-link.caller-id:not(.disabled)').on('click', function(e) {
					e.preventDefault();
					self.myOfficeRenderCallerIdPopup({
						parent: parent,
						myOfficeData: myOfficeData
					});
				});
			// }

			template.find('.header-link.caller-id.disabled').on('click', function(e) {
				monster.ui.alert(self.i18n.active().myOffice.missingMainNumberForCallerId);
			});

			template.find('.header-link.curbside:not(.disabled)').on('click', function(e) {
				e.preventDefault();
				self.myOfficeRenderCurbsideEdit({
					accountId: self.accountId,
					myOfficeData: myOfficeData
				});
			});

			template.find('.header-link.curbside.disabled').on('click', function(e) {
				monster.ui.alert(self.i18n.active().myOffice.missingMainNumberForCurbside);
			});

			monster.ui.tooltips(template);
		},

		/**
		 * Opens an element within this submodule
		 * @param  {Object} args
		 * @param  {Object} args.data  Data to be provided to the element to be displayed
		 * @param  {('callerIdDialog')} args.element  Name of the element to open
		 * @param  {jQuery} args.parent  Parent container
		 */
		myOfficeOpenElement: function(args) {
			var self = this,
				data = args.data,
				element = args.element,
				$parent = args.parent;

			// Currently only the Caller ID dialog is handled
			if (element !== 'callerIdDialog') {
				return;
			}

			self.myOfficeRenderCallerIdPopup({
				parent: $parent,
				myOfficeData: data
			});
		},

		myOfficeRenderMusicOnHoldPopup: function(args) {
			var self = this,
				account = args.account,
				silenceMediaId = 'silence_stream://300000';

			self.myOfficeListMedias(function(medias) {
				var templateData = {
						showMediaUploadDisclosure: monster.config.whitelabel.showMediaUploadDisclosure,
						silenceMedia: silenceMediaId,
						mediaList: medias,
						media: 'music_on_hold' in account && 'media_id' in account.music_on_hold ? account.music_on_hold.media_id : undefined
					},
					popupTemplate = $(self.getTemplate({
						name: 'musicOnHoldPopup',
						data: templateData,
						submodule: 'myOffice'
					})),
					popup = monster.ui.dialog(popupTemplate, {
						title: self.i18n.active().myOffice.musicOnHold.title,
						position: ['center', 20]
					});

				self.myOfficeMusicOnHoldPopupBindEvents({
					popupTemplate: popupTemplate,
					popup: popup,
					account: account
				});
			});
		},

		myOfficeMusicOnHoldPopupBindEvents: function(args) {
			var self = this,
				popupTemplate = args.popupTemplate,
				popup = args.popup,
				account = args.account,
				closeUploadDiv = function(newMedia) {
					mediaToUpload = undefined;
					popupTemplate.find('.upload-div input').val('');
					popupTemplate.find('.upload-div').slideUp(function() {
						popupTemplate.find('.upload-toggle').removeClass('active');
					});
					if (newMedia) {
						var mediaSelect = popupTemplate.find('.media-dropdown');
						mediaSelect.append('<option value="' + newMedia.id + '">' + newMedia.name + '</option>');
						mediaSelect.val(newMedia.id);
					}
				},
				mediaToUpload;

			popupTemplate.find('.upload-input').fileUpload({
				inputOnly: true,
				wrapperClass: 'file-upload input-append',
				btnText: self.i18n.active().myOffice.musicOnHold.audioUploadButton,
				btnClass: 'monster-button',
				maxSize: 5,
				success: function(results) {
					mediaToUpload = results[0];
				},
				error: function(errors) {
					if (errors.hasOwnProperty('size') && errors.size.length > 0) {
						monster.ui.alert(self.i18n.active().myOffice.musicOnHold.fileTooBigAlert);
					}
					popupTemplate.find('.upload-div input').val('');
					mediaToUpload = undefined;
				}
			});

			popupTemplate.find('.cancel-link').on('click', function() {
				popup.dialog('close').remove();
			});

			popupTemplate.find('.upload-toggle').on('click', function() {
				if ($(this).hasClass('active')) {
					popupTemplate.find('.upload-div').stop(true, true).slideUp();
				} else {
					popupTemplate.find('.upload-div').stop(true, true).slideDown();
				}
			});

			popupTemplate.find('.upload-cancel').on('click', function() {
				closeUploadDiv();
			});

			popupTemplate.find('.upload-submit').on('click', function() {
				if (mediaToUpload) {
					self.callApi({
						resource: 'media.create',
						data: {
							accountId: self.accountId,
							data: {
								streamable: true,
								name: mediaToUpload.name,
								media_source: 'upload',
								description: mediaToUpload.name
							}
						},
						success: function(data, status) {
							var media = data.data;
							self.callApi({
								resource: 'media.upload',
								data: {
									accountId: self.accountId,
									mediaId: media.id,
									data: mediaToUpload.file
								},
								success: function(data, status) {
									closeUploadDiv(media);
								},
								error: function(data, status) {
									self.callApi({
										resource: 'media.delete',
										data: {
											accountId: self.accountId,
											mediaId: media.id,
											data: {}
										},
										success: function(data, status) {}
									});
								}
							});
						}
					});
				} else {
					monster.ui.alert(self.i18n.active().myOffice.musicOnHold.emptyUploadAlert);
				}
			});

			popupTemplate.find('.save').on('click', function() {
				var selectedMedia = popupTemplate.find('.media-dropdown option:selected').val();

				if (!('music_on_hold' in account)) {
					account.music_on_hold = {};
				}

				if (selectedMedia && selectedMedia.length > 0) {
					account.music_on_hold = {
						media_id: selectedMedia
					};
				} else {
					account.music_on_hold = {};
				}
				self.myOfficeUpdateAccount(account, function(updatedAccount) {
					popup.dialog('close').remove();
				});
			});
		},

		myOfficeRenderCurbsideEdit: function(args) {
			var self = this,
				accountId = args.accountId,
				myOfficeData = args.myOfficeData,
				mainNumbers = myOfficeData.mainNumbers;

			self.myOfficeGetCurbside(_.map(mainNumbers, 'number'), function(curbsideData) {
				var filtered_mainNumbers = self.removeTollFreeNumbers(_.map(mainNumbers, 'number'));

				curbsideData = _.merge({}, curbsideData, {
					mainNumbers: filtered_mainNumbers
				});

				self.myOfficeRenderCurbsidePopup(curbsideData);
			});
		},

		myOfficeRenderCurbsidePopup: function(curbsideData) {
			var self = this,
				popupTemplate = $(self.getTemplate({
					name: 'curbsidePopup',
					data: curbsideData,
					submodule: 'myOffice'
				})),
				popup = monster.ui.dialog(popupTemplate, {
					autoScroll: false,
					title: self.i18n.active().myOffice.curbside.title,
					position: ['center', 20]
				});

			self.myOfficeCurbsidePopupBindEvents({
				popupTemplate: popupTemplate,
				popup: popup,
				data: curbsideData
			});
		},

		myOfficeCurbsidePopupBindEvents: function(args) {
			var self = this,
				popupTemplate = args.popupTemplate,
				popup = args.popup,
				data = args.data,
				curbsideForm = popupTemplate.find('#form_curbside'),
				loadCurbsideSection = function() {
					var $curbside = popupTemplate.find('.number-feature[data-feature="curbside"]'),
						$enabled = popupTemplate.find('[name="curbside_enabled"]'),
						action = $enabled.is(':checked') ? 'slideDown' : 'slideUp';

					$curbside[action]();
				};
				// loadCurbsideSection();

			monster.ui.validate(curbsideForm, {
				rules: {
					'did': {
						required: true
					},
					'curbside_settings.curbside_password': {
						maxlength: 70,
						required: true
					},
					'curbside_settings.confirm_password': {
						maxlength: 70,
						equalTo: '#password',
						required: true
					}
				}
			});

			if (data.curbside_enabled) {
				$('[name="curbside_settings.curbside_password"]').rules('remove', 'required');
				$('[name="curbside_settings.confirm_password"]').rules('remove', 'required');
			}

			popupTemplate.find('[name="curbside_enabled"]').on('click', function(evt) {
				loadCurbsideSection();
			});

			popupTemplate.find('.cancel-link').on('click', function() {
				popup.dialog('close').remove();
			});

			popupTemplate.find('.save').on('click', function() {
				if (monster.ui.valid(curbsideForm)) {
					var dataToSave = self.myOfficeCurbsideMergeData(data, popupTemplate);

					if (dataToSave.curbside_settings.curbside_password.length === 0) {
						delete dataToSave.curbside_settings.curbside_password;
					}
					delete dataToSave.curbside_settings.confirm_password;

					self.myOfficeSaveCurbside(data, dataToSave, function(data) {
						popup.dialog('close').remove();
					});

					$('[name="curbside_settings.curbside_password"]').rules('remove', 'required');
					$('[name="curbside_settings.confirm_password"]').rules('remove', 'required');
				}
			});


			// Replies stuff
			var addEntity = function(event) {
				event.preventDefault();

				var inputName = popupTemplate.find('#entity_name'),
					reply = inputName.val(),
					templateFlag = $(self.getTemplate({
						name: 'replyRow',
						data: {
							reply: reply
						},
						submodule: 'myOffice'
					}));

				popupTemplate.find('.saved-entities').prepend(templateFlag);

				inputName
					.val('')
					.focus();
			};

			popupTemplate.find('.entity-wrapper.placeholder:not(.active)').on('click', function() {
				$(this).addClass('active');
				popupTemplate.find('#entity_name').focus();
			});

			popupTemplate.find('#cancel_entity').on('click', function(e) {
				e.stopPropagation();

				$(this).siblings('input').val('');

				popupTemplate.find('.entity-wrapper.placeholder')
						.removeClass('active');
			});

			popupTemplate.find('#add_entity').on('click', function(e) {
				addEntity(e);
			});

			popupTemplate.find('#entity_name').on('keypress', function(e) {
				var code = e.keyCode || e.which;

				if (code === 13) {
					addEntity(e);
				}
			});

			popupTemplate.find('.saved-entities').on('click', '.delete-entity', function() {
				$(this).parents('.entity-wrapper').remove();
			});
		},

		myOfficeCurbsideMergeData: function(originalData, template) {
			var self = this,
				formData = monster.ui.getFormData('form_curbside'),
				mergedData = $.extend(true, {}, originalData, formData);

			// Rebuild list of replies from UI
			mergedData.curbside_settings.replies = [];
			template.find('.saved-entities .entity-wrapper').each(function() {
				mergedData.curbside_settings.replies.push($(this).data('reply'));
			});

			// set Kazoo Account ID
			mergedData.kazoo_account_id = self.accountId;

			delete mergedData.mainNumbers;
			delete mergedData.extra;

			return mergedData;
		},

		myOfficeSaveCurbside: function(origData, curbsideData, callback) {
			var self = this;

			if (!origData.curbside_enabled) {
				self.myOfficeCreateCurbside(curbsideData, callback);
			} else {
				self.myOfficeUpdateCurbside(curbsideData, callback);
			}
		},

		myOfficeRenderCallerIdPopup: function(args) {
			var self = this,
				parent = args.parent,
				myOfficeData = args.myOfficeData,
				templateData = {
					mainNumbers: myOfficeData.mainNumbers,
					selectedMainNumber: 'caller_id' in myOfficeData.account && 'external' in myOfficeData.account.caller_id ? myOfficeData.account.caller_id.external.number || 'none' : 'none',
					readonly_attr: monster.config.whitelabel.hasOwnProperty('e911_readonly') && monster.config.whitelabel.e911_readonly
						? 'disabled'
						: ''
				},
				popupTemplate = $(self.getTemplate({
					name: 'callerIdPopup',
					data: templateData,
					submodule: 'myOffice'
				})),
				popup = monster.ui.dialog(popupTemplate, {
					autoScroll: false,
					title: self.i18n.active().myOffice.callerId.title,
					position: ['center', 20]
				});

			self.myOfficeCallerIdPopupBindEvents({
				parent: parent,
				popupTemplate: popupTemplate,
				popup: popup,
				account: myOfficeData.account
			});
		},

		myOfficeCallerIdPopupBindEvents: function(args) {
			var self = this,
				parent = args.parent,
				popupTemplate = args.popupTemplate,
				popup = args.popup,
				account = args.account,
				callerIdNumberSelect = popupTemplate.find('.caller-id-select'),
				callerIdNameInput = popupTemplate.find('.caller-id-name'),
				editableFeatures = [ 'e911', 'cnam' ],
				loadNumberDetails = function(number, popupTemplate) {
					monster.waterfall([
						function getNumberData(waterfallCallback) {
							if (!number) {
								return waterfallCallback(null, null);
							}

							self.myOfficeGetNumber(number, function(numberData) {
								waterfallCallback(null, numberData);
							});
						},
						function getAllowedFeatures(numberData, waterfallCallback) {
							if (_.isNil(numberData)) {
								return waterfallCallback(null, numberData, []);
							}

							var availableFeatures = monster.util.getNumberFeatures(numberData),
								allowedFeatures = _.intersection(availableFeatures, editableFeatures);

							waterfallCallback(null, numberData, allowedFeatures);
						},
						function fillFormFields(numberData, allowedFeatures, waterfallCallback) {
							if (_.isEmpty(allowedFeatures)) {
								return waterfallCallback(null, allowedFeatures);
							}

							var hasCNAM = _.includes(allowedFeatures, 'cnam');

							if (hasCNAM) {
								if (_.has(numberData, 'cnam')) {
									callerIdNameInput.val(numberData.cnam.display_name);
								} else {
									callerIdNameInput.val('');
								}
							}

							waterfallCallback(null, allowedFeatures);
						}
					], function hideOrShowFeatureSections(err, allowedFeatures) {
						_.each(editableFeatures, function(featureName) {
							var $featureSection = popupTemplate.find('.number-feature[data-feature="' + featureName + '"]'),
								isFeatureAllowed = _.includes(allowedFeatures, featureName),
								action = isFeatureAllowed ? 'slideDown' : 'slideUp';

							$featureSection[action]();
						});
					});
				};

			popupTemplate.find('.cancel-link').on('click', function() {
				popup.dialog('close').remove();
			});

			callerIdNumberSelect.on('change', function() {
				loadNumberDetails($(this).val(), popupTemplate);
			});

			// emergencyZipcodeInput.on('blur', function() {
			// 	var zipCode = $(this).val();
			//
			// 	if (zipCode) {
			// 		self.myOfficeGetAddessFromZipCode({
			// 			data: {
			// 				zipCode: zipCode
			// 			},
			// 			success: function(results) {
			// 				if (!_.isEmpty(results)) {
			// 					var length = results[0].address_components.length;
			// 					emergencyCityInput.val(results[0].address_components[1].long_name);
			// 					emergencyStateInput.val(results[0].address_components[length - 2].short_name);
			// 				}
			// 			}
			// 		});
			// 	}
			// });

			popupTemplate.find('.save').on('click', function() {
				var callerIdNumber = callerIdNumberSelect.val(),
					updateAccount = function() {
						self.myOfficeUpdateAccount(account, function(updatedAccount) {
							popup.dialog('close').remove();
							self.myOfficeRender({
								parent: parent
							});
						});
					},
					setNumberData = function() {
						var callerIdName = callerIdNameInput.val(),
							setCNAM = popupTemplate.find('.number-feature[data-feature="cnam"]').is(':visible');

						account.caller_id = $.extend(true, {}, account.caller_id, {
							external: {
								number: callerIdNumber
							}
						});

						if (setCNAM) {
							account.caller_id = $.extend(true, {}, account.caller_id, {
								external: {
									name: callerIdName
								}
							});
						}

						self.myOfficeGetNumber(callerIdNumber, function(numberData) {
							if (setCNAM && callerIdName.length) {
								$.extend(true, numberData, { cnam: { display_name: callerIdName } });
							} else {
								delete numberData.cnam;
							}

							self.myOfficeUpdateNumber(numberData, function(data) {
								updateAccount();
							});
						});
					};

				if (callerIdNumber) {
					var cnam = callerIdNameInput.val();
					if (cnam.length) {
						var regex = /[^a-zA-Z0-9\s]/,
							matches = regex.exec(cnam);

						if (matches !== null || cnam.length > 15) {
							monster.ui.alert(self.i18n.active().myOffice.callerId.invalidCNAMAlert);
						} else {
							setNumberData();
						}
					}
				} else {
					delete account.caller_id.external;
					updateAccount();
				}
			});

			loadNumberDetails(callerIdNumberSelect.val(), popupTemplate);
		},

		myOfficeWalkthroughRender: function() {
			var self = this;

			if (self.isActive()) {
				// First we check if the user hasn't seen the walkthrough already
				// if he hasn't we show the walkthrough, and once they're done with it, we update their user doc so they won't see the walkthrough again
				self.myOfficeHasWalkthrough(function() {
					self.myOfficeShowWalkthrough(function() {
						self.myOfficeUpdateWalkthroughFlagUser();
					});
				});
			}
		},

		myOfficeHasWalkthrough: function(callback) {
			var self = this,
				flag = self.uiFlags.user.get('showDashboardWalkthrough');

			if (flag !== false) {
				callback && callback();
			}
		},

		// Triggers firstUseWalkthrough. First we render the dropdown, then we show a greeting popup, and once they click go, we render the step by step.
		myOfficeShowWalkthrough: function(callback) {
			var self = this,
				mainTemplate = $('#voip_container'),
				steps = [
					{
						element: mainTemplate.find('.category#myOffice')[0],
						intro: self.i18n.active().myOffice.walkthrough.steps['1'],
						position: 'right'
					},
					{
						element: mainTemplate.find('.category#users')[0],
						intro: self.i18n.active().myOffice.walkthrough.steps['2'],
						position: 'right'
					},
					{
						element: mainTemplate.find('.category#groups')[0],
						intro: self.i18n.active().myOffice.walkthrough.steps['3'],
						position: 'right'
					},
					{
						element: mainTemplate.find('.category#strategy')[0],
						intro: self.i18n.active().myOffice.walkthrough.steps['4'],
						position: 'right'
					}
				];

			monster.ui.stepByStep(steps, function() {
				callback && callback();
			});
		},

		myOfficeUpdateWalkthroughFlagUser: function(callback) {
			var self = this,
				userToSave = self.uiFlags.user.set('showDashboardWalkthrough', false);

			self.myOfficeUpdateOriginalUser(userToSave, function(user) {
				callback && callback(user);
			});
		},

		/* API Calls */
		myOfficeGetNumber: function(number, success, error) {
			var self = this;

			monster.request({
				resource: 'sv.numbers.get',
				data: {
					accountId: self.accountId,
					phoneNumber: encodeURIComponent(number)
				},
				success: function(data, status) {
					success && success(data.data);
				},
				error: function(data, status) {
					error && error(data);
				}
			});
		},

		myOfficeUpdateCurbside: function(curbsideData, callbackSuccess, callbackError) {
			var self = this;

			monster.request({
				resource: 'sv.sms.update',
				data: {
					data: curbsideData
				},
				success: function(data) {
					callbackSuccess && callbackSuccess(data.data);
				},
				error: function(data) {
					callbackError && callbackError(data);
				}
			});
		},

		myOfficeCreateCurbside: function(curbsideData, callback) {
			var self = this;

			monster.request({
				resource: 'sv.sms.create',
				data: {
					data: curbsideData
				},
				success: function(data) {
					callback(data.data);
				}
			});
		},

		myOfficeGetCurbside: function(dids, success, error) {
			var self = this;

			monster.request({
				resource: 'sv.curbside.get',
				data: {
					dids: dids.join(",")
				},
				success: function(data, status) {
					success && success(data);
				},
				error: function(data, status) {
					error && error(data);
				}
			});
		},

		myOfficeUpdateNumber: function(numberData, success, error) {
			var self = this;

			monster.request({
				resource: 'sv.numbers.create',
				data: {
					accountId: self.accountId,
					phoneNumber: encodeURIComponent(numberData.id),
					data: numberData
				},
				success: function(data, status) {
					success && success(data.data);
				},
				error: function(data, status) {
					error && error(data);
				}
			});
		},

		myOfficeListMedias: function(callback) {
			var self = this;

			self.callApi({
				resource: 'media.list',
				data: {
					accountId: self.accountId,
					filters: {
						key_missing: 'type'
					}
				},
				success: function(medias) {
					callback && callback(medias.data);
				}
			});
		},

		myOfficeUpdateAccount: function(account, callback) {
			var self = this;

			delete account.extra;

			self.callApi({
				resource: 'account.update',
				data: {
					accountId: self.accountId,
					data: account
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},

		myOfficeUpdateOriginalUser: function(userToUpdate, callback) {
			var self = this;

			self.callApi({
				resource: 'user.update',
				data: {
					userId: userToUpdate.id,
					accountId: monster.apps.auth.originalAccount.id,
					data: userToUpdate
				},
				success: function(savedUser) {
					callback && callback(savedUser.data);
				}
			});
		},

		myOfficeGetAddessFromZipCode: function(args) {
			var self = this;

			monster.request({
				resource: 'google.geocode.address',
				data: args.data,
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.results);
				},
				error: function(errorPayload, data, globalHandler) {
					args.hasOwnProperty('error') ? args.error() : globalHandler(data, { generateError: true });
				}
			});
		}
	};

	return app;
});
