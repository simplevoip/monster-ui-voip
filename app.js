define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	var appSubmodules = [
		'callLogs',
		'devices',
		'featureCodes',
		'groups',
		'myOffice',
		'numbers',
		'accountManagement',
		'strategy',
		'strategyHours',
		'users',
		'vmboxes'
	];

	require(_.map(appSubmodules, function(name) {
		return './submodules/' + name + '/' + name;
	}));

	var app = {
		name: 'voip',

		// Hack to fix an unset accountId property bug that I haven't tracked down yet
		isMasqueradable: true,

		// endpoints: {
		// 	// simplevoip: 'https://staging.simplevoip.us/',
		// 	simplevoip: 'http://svportal.local/'
		// },

		css: [ 'app' ],

		i18n: {
			'de-DE': { customCss: false },
			'en-US': { customCss: false },
			'fr-FR': { customCss: false },
			'ru-RU': { customCss: false },
			'es-ES': { customCss: false }
		},

		requests: {
			'sv.numbers.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=numbers&accountId={accountId}&phoneNumber={phoneNumber}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.numbers.update': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=numbers&accountId={accountId}&phoneNumber={phoneNumber}',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.numbers.create': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=numbers&accountId={accountId}&phoneNumber={phoneNumber}',
				verb: 'PUT',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.curbside.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=curbside&dids={dids}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=sms&did={did}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.create': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=sms',
				verb: 'PUT',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.update': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=sms',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.delete': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=sms',
				verb: 'DELETE',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.user.list': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=users&accountId={accountId}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.user.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=user&accountId={accountId}&userId={userId}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.device.create': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=device&accountId={accountId}',
				verb: 'PUT',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.device.update': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=device&accountId={accountId}&deviceId={deviceId}',
				verb: 'PATCH',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.credentials.send': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=credentials&userId={userId}',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.orders.list': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=orders&accountId={accountId}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.order.update': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=order&orderId={orderId}',
				verb: 'PATCH',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.order.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'monster/api_functions.php?m=order&orderId={orderId}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.quote.approve': {
				apiRoot: monster.config.api.simplevoip,
				url: 'quote_pdf_s3.php?orderID={orderId}&name={name}',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.quote.update.duedate': {
				apiRoot: monster.config.api.simplevoip,
				url: 'ajax_functions.php?fn=quote_update&orderID={orderId}&duedate={dueDate}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.quote.toggle.rental': {
				apiRoot: monster.config.api.simplevoip,
				url: 'ajax_functions.php?fn=quote_toggle_rental&orderID={orderId}&toggle={toggle}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.user.sync': {
				apiRoot: monster.config.api.simplevoip,
				// url: 'api_kazoo/kazoo_refresh_single_user.php?accountId={accountId}&userId={userId}',
				url: 'monster/api_functions.php?m=user&accountId={accountId}&userId={userId}',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			}
		},
		subscribe: {},
		appFlags: {
			common: {
				hasProvisioner: false,
				outboundPrivacy: [
					'default',
					'none',
					'number',
					'name',
					'full'
				],
				callRecording: {
					supportedAudioFormats: [
						'mp3',
						'wav'
					],
					validationConfig: {
						rules: {
							time_limit: {
								digits: true,
								required: true
							},
							url: {
								protocols: [
									'http',
									'https',
									'ftp',
									'ftps',
									'sftp'
								],
								required: true
							}
						}
					}
				}
			},
			global: {}
		},

		subModules: appSubmodules,

		load: function(callback) {
			var self = this;

			self.registerHandlebarHelpers();

			self.initApp(function() {
				callback && callback(self);
			});
		},

		initApp: function(callback) {
			var self = this;

			self.appFlags.common.hasProvisioner = _.isString(monster.config.api.provisioner);

			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});
		},

		render: function(container) {
			var self = this,
				parent = container || $('#monster_content'),
				show_accountManagement = !monster.apps.auth.currentAccount.superduper_admin && monster.apps.auth.currentUser.priv_level === 'admin';
				template = $(self.getTemplate({
					name: 'app',
					data: {
						show_accountManagement: show_accountManagement
					}
				}));

			self.loadGlobalData(function() {
				/* On first Load, load my office */
				template.find('.category#myOffice').addClass('active');
				monster.pub('voip.myOffice.render', { parent: template.find('.right-content') });
			});

			self.bindEvents(template);

			parent
				.empty()
				.append(template);
		},

		formatData: function(data) {
			var self = this;
		},

		loadGlobalData: function(callback) {
			var self = this;

			monster.parallel({
				servicePlansRole: function(callback) {
					if (monster.config.hasOwnProperty('resellerId') && monster.config.resellerId.length) {
						self.callApi({
							resource: 'services.listAvailable',
							data: {
								accountId: self.accountId,
								filters: {
									paginate: false,
									'filter_merge.strategy': 'cumulative'
								}
							},
							success: function(data, status) {
								var formattedData = _.keyBy(data.data, 'id');

								callback(null, formattedData);
							}
						});
					} else {
						callback(null, {});
					}
				}
			}, function(err, results) {
				self.appFlags.global.servicePlansRole = results.servicePlansRole;
				self.appFlags.global.showUserTypes = !_.isEmpty(results.servicePlansRole);

				callback && callback(self.appFlags.global);
			});
		},

		bindEvents: function(parent) {
			var self = this,
				container = parent.find('.right-content');

			parent.find('.left-menu').on('click', '.category:not(.loading)', function() {
				// Get the ID of the submodule to render
				var $this = $(this),
					args = {
						parent: container,
						callback: function() {
							parent.find('.category').removeClass('loading');
						}
					},
					id = $this.attr('id');

				// Display the category we clicked as active
				parent
					.find('.category')
					.removeClass('active')
					.addClass('loading');
				$this.toggleClass('active');

				// Empty the main container and then render the submodule content
				container.empty();
				monster.pub('voip.' + id + '.render', args);
			});
		},

		overlayInsert: function() {
			$('#monster_content')
				.append($('<div>', {
					id: 'voip_container_overlay'
				}));
		},

		overlayRemove: function() {
			$('#monster_content')
				.find('#voip_container_overlay')
					.remove();
		},

		/**
		 * @param  {jQuery} $template
		 * @param  {String} entityId
		 */
		overlayBindOnClick: function($template, entityId) {
			var self = this,
				editContainerClass = '.edit-' + entityId;

			$('#monster_content').on('click', '#voip_container_overlay', function() {
				$template.find(editContainerClass).slideUp('400', function() {
					$(this).empty();
				});

				self.overlayRemove();

				$template.find('.grid-cell.active').css({
					'z-index': '0'
				});

				$template.find('.grid-row.active').parent().siblings(editContainerClass).css({
					'z-index': '0'
				});

				$template
					.find('.grid-cell.active, .grid-row.active')
						.removeClass('active');
			});
		},

		patchCallflow: function(args) {
			var self = this;

			self.callApi({
				resource: 'callflow.patch',
				data: _.merge({
					accountId: self.accountId
				}, args.data),
				success: function(data) {
					_.has(args, 'success') && args.success(data.data);
				},
				error: function(parsedError) {
					_.has(args, 'error') && args.error(parsedError);
				}
			});
		},

		/**
		 * Runs tasks necessary for mobile device callfow update on un\assignement.
		 * @param  {String|null} userId
		 * @param  {String|null|undefined} userMainCallflowId
		 * @param  {Object} device
		 * @param  {String} device.id
		 * @param  {String} device.mobile.mdn
		 * @param  {Function} mainCallback
		 *
		 * updateMobileCallflowAssignment(userId, userMainCallflowId|undefined, ...)
		 * this signature will assign the device
		 *
		 * updateMobileCallflowAssignment(null, null, ...)
		 * this signature will unassign the device
		 *
		 * While assigning, you can either provide the user's main callflow's ID or set it to
		 * `undefined`, in which case the method will take care of resolving it based on `userId`.
		 */
		updateMobileCallflowAssignment: function(userId, userMainCallflowId, device, mainCallback) {
			var self = this,
				getMainUserCallflowId = function getMainUserCallflowId(userId, callback) {
					self.callApi({
						resource: 'callflow.list',
						data: {
							accountId: self.accountId,
							filters: {
								filter_owner_id: userId,
								filter_type: 'mainUserCallflow'
							}
						},
						success: _.flow(
							_.partial(_.get, _, 'data'),
							_.head,
							_.partial(_.get, _, 'id'),
							_.partial(callback, null)
						),
						error: _.partial(callback, true)
					});
				},
				maybeGetMainUserCallflowId = function maybeGetMainUserCallflowId(userId, userMainCallflowId, callback) {
					if (_.isNull(userMainCallflowId) || !_.isUndefined(userMainCallflowId)) {
						return callback(null, userMainCallflowId);
					}
					getMainUserCallflowId(userId, callback);
				},
				getMobileCallflowIdByNumber = function getMobileCallflowIdByNumber(number, callback) {
					self.callApi({
						resource: 'callflow.searchByNumber',
						data: {
							accountId: self.accountId,
							value: number
						},
						success: _.flow(
							_.partial(_.get, _, 'data'),
							_.head,
							_.partial(_.get, _, 'id'),
							_.partial(callback, null)
						),
						error: _.partial(callback, true)
					});
				},
				getCallflowIds = function getCallflowIds(userId, userMainCallflowId, number, callback) {
					monster.parallel({
						userMainCallflowId: _.partial(maybeGetMainUserCallflowId, userId, userMainCallflowId),
						mobileCallflowId: _.partial(getMobileCallflowIdByNumber, number)
					}, callback);
				},
				updateMobileCallflowAssignment = function updateMobileCallflowAssignment(userId, deviceId, callflowIds, callback) {
					var userMainCallflowId = callflowIds.userMainCallflowId,
						mobileCallflowId = callflowIds.mobileCallflowId,
						updatedCallflow = _.merge({
							owner_id: userId
						}, _.isNull(userMainCallflowId) ? {
							flow: {
								module: 'device',
								data: {
									id: deviceId
								}
							}
						} : {
							flow: {
								module: 'callflow',
								data: {
									id: userMainCallflowId
								}
							}
						});

					self.patchCallflow({
						data: {
							callflowId: mobileCallflowId,
							data: updatedCallflow
						},
						success: _.partial(callback, null),
						error: _.partial(callback, true)
					});
				};

			monster.waterfall([
				_.partial(getCallflowIds, userId, userMainCallflowId, device.mobile.mdn),
				_.partial(updateMobileCallflowAssignment, userId, device.id)
			], mainCallback);
		},

		/**
		 * filter out toll free number ranges from array of numbers
		 * @param  {Array} numbers
		 * @return {Array}
		 */
		removeTollFreeNumbers: function(numbers) {
			return numbers.filter(function(number) {
				var m = /^(?:\+?1)?(?:8(?:00|88|66|77|55|44|33)[2-9]\d{6})$/gm.exec(number);
				return m === null || !m.length;
			});
		},

		registerHandlebarHelpers: function() {
			Handlebars.registerHelper({

				foreach: function(arr, options) {
					if(options.inverse && !arr.length)
						return options.inverse(this);

					return arr.map(function(item, index) {
					  	item.$prev = arr[index - 1];
						return options.fn(item);
					}).join('');
				},

			});
		}
	};

	return app;
});
