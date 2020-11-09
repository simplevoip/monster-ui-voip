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
		'strategy',
		'users',
		'vmboxes',
		'orders'
	];

	require(_.map(appSubmodules, function(name) {
		return './submodules/' + name + '/' + name;
	}));

	var app = {
		name: 'voip',

		// Hack to fix an unset accountId property bug that I haven't tracked down yet
		isMasqueradable: true,

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
				url: 'api_functions.php?m=numbers&accountId={accountId}&phoneNumber={phoneNumber}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.numbers.update': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=numbers&accountId={accountId}&phoneNumber={phoneNumber}',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.numbers.create': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=numbers&accountId={accountId}&phoneNumber={phoneNumber}',
				verb: 'PUT',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.curbside.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=curbside&dids={dids}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=sms&did={did}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.create': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=sms',
				verb: 'PUT',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.update': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=sms',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.sms.delete': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=sms',
				verb: 'DELETE',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.user.list': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=users&accountId={accountId}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.user.get': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=user&accountId={accountId}&userId={userId}',
				verb: 'GET',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.device.create': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=device&accountId={accountId}',
				verb: 'PUT',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.device.update': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=device&accountId={accountId}&deviceId={deviceId}',
				verb: 'PATCH',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.credentials.send': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=credentials&userId={userId}',
				verb: 'POST',
				removeHeaders: [
					'X-Auth-Token'
				]
			},
			'sv.orders.list': {
				apiRoot: monster.config.api.simplevoip,
				url: 'api_functions.php?m=orders&accountId={accountId}',
				verb: 'GET',
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
				]
			},
			global: {}
		},

		subModules: appSubmodules,

		load: function(callback) {
			var self = this;

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
				template = $(self.getTemplate({
					name: 'app'
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
		}
	};

	return app;
});
