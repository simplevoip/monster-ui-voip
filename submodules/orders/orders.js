define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster'),
		timezone = require('monster-timezone');

	var app = {

		requests: {},

		subscribe: {
			'voip.orders.render': 'ordersRender'
		},

		appFlags: {},

		deviceIcons: {},

		/* Orders */
		ordersRender: function(args) {
			var self = this,
				args = args || {},
				parent = args.parent || $('.right-content'),
				_orderId = args.orderId,
				_sortBy = args.sortBy,
				callback = args.callback;

			self.ordersGetData(function(data) {
				var dataTemplate = self.ordersFormatListData(data, _sortBy),
					template = $(self.getTemplate({
						name: 'layout',
						data: dataTemplate,
						submodule: 'orders'
					})),
					templateOrder;

				self.ordersBindEvents(template, parent, dataTemplate);

				parent
					.empty()
					.append(template);

				if (_orderId) {
					var cells = parent.find('.grid-row[data-id=' + _orderId + '] .grid-cell');

					monster.ui.highlight(cells);
				}

				if (dataTemplate.orders.length === 0) {
					parent.find('.grid-row.title').css('display', 'none');
					parent.find('.no-orders-row').css('display', 'block');
				} else {
					parent.find('.grid-row.title').css('display', 'block');
					parent.find('.no-orders-row').css('display', 'none');
				}

				callback && callback();
			});
		},

		ordersGetData: function(callback) {
			var self = this;

			monster.request({
				resource: 'sv.orders.list',
				data: {
					accountId: self.accountId
				},
				success: function(data) {
					callback && callback(data);
				},
				error: function() {
					console.log('Failed to retrieve orders');
				}
			});
		}
	}
});
